import { TICK_PER_BEAT, TICK_PER_MEASURE } from "../constants.ts";
import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import { EmptySet, minmax } from "../lib.ts";
import { ControlType } from "../models/ControlType.ts";
import type { SongStore } from "../SongStore.ts";
import type { StateOnly } from "../Stateful/Stateful.ts";
import { Stateful } from "../Stateful/Stateful.ts";
import type { Synthesizer } from "../Synthesizer.ts";

export interface PlayerState {
	/**
	 * 現在の再生時刻 [tick]
	 */
	currentTick: number;

	/**
	 * 再生中かどうか
	 */
	isPlaying: boolean;

	/**
	 * ミュートされているチャンネルIDの集合
	 */
	mutedChannelIds: ReadonlySet<number>;

	/**
	 * ピアノロールの自動スクロールが有効かどうか
	 */
	isAutoScrollEnabled: boolean;
}

const InitialProps: PlayerState = {
	currentTick: 0,
	isPlaying: false,
	mutedChannelIds: EmptySet,
	isAutoScrollEnabled: false,
};

export class Player extends Stateful<PlayerState> {
	static readonly Key = ComponentKey.of(Player);

	constructor(
		private readonly context: AudioContext,
		private readonly songStore: StateOnly<SongStore>,
		private readonly synthesizer: Synthesizer,
		bus: EventBus,
	) {
		super(InitialProps);

		bus.on("song.put.after", (_song) => {
			this.setState(InitialProps);
			this.syncSongFromSongStore();
		});
		bus.on("song.update.after", (_song) => {
			this.syncSongFromSongStore();
		});
		bus.on("channel.add.after", (channel) => {
			this.syncChannelFromSongStore(channel.id);
		});
		bus.on("channel.update.after", (channelId) => {
			this.syncChannelFromSongStore(channelId);
		});
		bus.on("channel.remove.before", (channelId: number) => {
			this.unmuteChannels([channelId]);
		});
	}

	private syncSongFromSongStore() {
		this.synthesizer.resetAll();
		this.clearMutedChannels();

		for (const channel of this.songStore.state.channels) {
			this.syncChannelFromSongStore(channel.id);
		}
	}

	private syncChannelFromSongStore(channelId: number) {
		const channel = this.songStore.state.channels.find(
			(ch) => ch.id === channelId,
		);
		if (channel === undefined) return;

		this.synthesizer.setBank({
			channel: channel.id,
			bankNumber: channel.instrumentKey.bankNumber,
		});
		this.synthesizer.setPreset({
			channel: channel.id,
			programNumber: channel.instrumentKey.presetNumber,
		});
	}

	setCurrentTick(currentTick: number) {
		currentTick = minmax(0, null, currentTick);
		if (this.state.currentTick === currentTick) return;

		const isPlaying = this.state.isPlaying;
		this.pause();
		this.synthesizer.resetAll();
		this.updateState((state) => ({ ...state, currentTick }));
		if (isPlaying) this.play();
	}

	setPlaying(isPlaying: boolean) {
		this.updateState((state) => ({ ...state, isPlaying }));
	}

	setAutoScrollEnabled(isAutoScrollEnabled: boolean) {
		this.updateState((state) => ({ ...state, isAutoScrollEnabled }));
	}

	togglePlay() {
		if (this.state.isPlaying) {
			this.pause();
		} else {
			this.play();
		}
	}

	clearMutedChannels() {
		this.unmuteChannels([]);
	}

	toggleMuteChannel(channelId: number) {
		if (this.state.mutedChannelIds.has(channelId)) {
			this.unmuteChannels([channelId]);
		} else {
			this.muteChannels([channelId]);
		}
	}

	toggleMuteAllChannels() {
		const allChannelIds = new Set(
			this.songStore.state.channels.map((ch) => ch.id),
		);
		const areAllMuted = [...allChannelIds].every((id) =>
			this.state.mutedChannelIds.has(id),
		);
		if (areAllMuted) {
			this.unmuteChannels(allChannelIds);
		} else {
			this.muteChannels(allChannelIds);
		}
	}

	muteChannels(channelIds: Iterable<number>) {
		const mutedChannelIds = new Set(this.state.mutedChannelIds);

		for (const channelId of channelIds) {
			if (this.state.mutedChannelIds.has(channelId)) continue;

			mutedChannelIds.add(channelId);
			this.synthesizer.channelNoteOffAll(channelId);
		}

		this.updateState((state) => {
			if (state.mutedChannelIds.size === mutedChannelIds.size) return state;
			return { ...state, mutedChannelIds };
		});
	}

	unmuteChannels(channelIds: Iterable<number>) {
		this.updateState((state) => {
			const mutedChannelIds = new Set(state.mutedChannelIds);

			for (const channelId of channelIds) {
				mutedChannelIds.delete(channelId);
			}

			if (state.mutedChannelIds.size === mutedChannelIds.size) return state;
			return { ...state, mutedChannelIds };
		});
	}

	pause() {
		if (!this.state.isPlaying) return;
		if (this.updateCallbackId !== null) {
			clearInterval(this.updateCallbackId);
			this.updateCallbackId = null;
		}

		this.setPlaying(false);
		this.synthesizer.noteOffAll();
	}

	play() {
		if (this.state.isPlaying) return;
		this.setPlaying(true);
		this.setAutoScrollEnabled(true);
		this.startedFromInTick = this.state.currentTick;
		this.startedAtApplicationTime = performance.now() / 1000;

		// AudioContextへあらかじめキューイングする再生命令の先読みサイズ[秒]
		// 大きいほど安定するが、操作に対する反応が遅れる(再生直前に適用した編集が反映されない等)
		// 小さいほど操作に対する反応が良くなるが、負荷が高くなり再生が途切れる可能性が上がる
		const PRE_ENQUEUE_SIZE_IN_SEC = 1 / 30;

		const audioLastTickFrom = Math.max(
			...this.songStore.state.channels.map((ch) => ch.lastTickFrom),
		);
		if (this.state.currentTick > audioLastTickFrom) {
			this.pause();
			this.setCurrentTick(0);
			this.play();
			return;
		}

		for (const channel of this.songStore.state.channels) {
			this.synthesizer.setBank({
				channel: channel.id,
				bankNumber: channel.instrumentKey.bankNumber,
			});
			this.synthesizer.setPreset({
				channel: channel.id,
				programNumber: channel.instrumentKey.presetNumber,
			});
		}

		const tickEnd =
			Math.max(...this.songStore.state.channels.map((ch) => ch.tickTo)) +
			TICK_PER_BEAT;

		let lastEnqueuedTick = this.startedFromInTick;
		const update = () => {
			if (tickEnd <= this.currentTick || !this.state.isPlaying) {
				this.pause();
				return;
			}

			this.updateState((state) => ({
				...state,
				currentTick: Math.floor(this.currentTick),
			}));

			const nextEnqueueTick =
				this.currentTick + PRE_ENQUEUE_SIZE_IN_SEC / this.secondPerTick;
			for (const channel of this.songStore.state.channels) {
				if (this.state.mutedChannelIds.has(channel.id)) continue;

				for (const note of channel.notes.values()) {
					if (
						lastEnqueuedTick <= note.tickFrom &&
						note.tickFrom < nextEnqueueTick
					) {
						this.synthesizer.noteOn({
							channel: channel.id,
							key: note.key,
							velocity: note.velocity,
							time: this.getContextTimeByTick(note.tickFrom),
						});
					}

					if (
						lastEnqueuedTick <= note.tickTo &&
						note.tickTo < nextEnqueueTick
					) {
						this.synthesizer.noteOff({
							channel: channel.id,
							key: note.key,
							time: this.getContextTimeByTick(note.tickTo),
						});
					}
				}

				for (const [type, cc] of channel.controlChanges) {
					if (type !== ControlType.PITCH_BEND) continue;

					for (const message of cc.messages) {
						if (
							lastEnqueuedTick <= message.tick &&
							message.tick < nextEnqueueTick
						) {
							this.synthesizer.setPitchBend(
								channel.id,
								message.value,
								this.getContextTimeByTick(message.tick),
							);
						}
					}
				}
			}
			lastEnqueuedTick = nextEnqueueTick;
		};
		update();
		this.updateCallbackId = setInterval(update, 16);
	}

	private updateCallbackId: ReturnType<typeof setInterval> | null = null;

	/**
	 * 再生開始時のtick位置[tick]
	 */
	private startedFromInTick: number = 0;

	/**
	 * 再生開始時のアプリケーション時間[sec]
	 * アプリケーション時間とは、performance.now()で取得できる時間のこと
	 */
	private startedAtApplicationTime: number = 0;

	private get secondPerTick(): number {
		const secondPerMeasure = (60 / this.songStore.state.bpm) * 4;
		return secondPerMeasure / TICK_PER_MEASURE;
	}

	/**
	 * 最新の再生開始からの経過時間[sec]
	 */
	private get elapsedTime(): number {
		return performance.now() / 1000 - this.startedAtApplicationTime;
	}

	/**
	 * 最新の再生開始からの経過時間[tick]
	 */
	private get elapsedTick(): number {
		return this.elapsedTime / this.secondPerTick;
	}

	/**
	 * 現在の再生位置[tick]
	 */
	private get currentTick(): number {
		return this.startedFromInTick + this.elapsedTick;
	}

	/**
	 * 指定したtickのAudioContext上の時刻[秒]を取得する
	 */
	private getContextTimeByTick(tick: number): number {
		return (
			this.context.currentTime + (tick - this.currentTick) * this.secondPerTick
		);
	}
}
