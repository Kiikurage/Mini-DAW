import { TICK_PER_BEAT, TICK_PER_MEASURE } from "../constants.ts";
import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import type { FileStore } from "../FileStore.ts";
import { EmptySet, minmax, toMutableSet, toSet } from "../lib.ts";
import { CCList } from "../models/CC.ts";
import { Channel, type ChannelId } from "../models/Channel.ts";
import { ControlType } from "../models/ControlType.ts";
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
	mutedChannelIds: ReadonlySet<ChannelId>;

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
		private readonly fileStore: StateOnly<FileStore>,
		private readonly synthesizer: Synthesizer,
		bus: EventBus,
	) {
		super(InitialProps);

		bus.on("file.put.after", () => {
			this.setState(InitialProps);
			this.syncSongFromFileStore();
		});
		bus.on("song.update.after", () => {
			this.syncSongFromFileStore();
		});
		bus.on("channel.add.after", (channel) => {
			this.syncChannelFromFileStore(channel.metadata.id);
		});
		bus.on("channel.update.after", (channelId) => {
			this.syncChannelFromFileStore(channelId);
		});
		bus.on("channel.remove.before", (channelId: ChannelId) => {
			this.unmuteChannels([channelId]);
		});
	}

	private syncSongFromFileStore() {
		this.synthesizer.resetAll();
		this.clearMutedChannels();

		for (const channelId of this.fileStore.state.song.metadata.channelIds) {
			this.syncChannelFromFileStore(channelId);
		}
	}

	private syncChannelFromFileStore(channelId: ChannelId) {
		const channel = this.fileStore.state.song.channels.get(channelId);
		if (channel === undefined) return;

		this.synthesizer.setBank({
			channel: channel.metadata.id,
			bankNumber: channel.metadata.instrumentKey.bankNumber,
		});
		this.synthesizer.setPreset({
			channel: channel.metadata.id,
			programNumber: channel.metadata.instrumentKey.presetNumber,
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

	toggleMuteChannel(channelId: ChannelId) {
		if (this.state.mutedChannelIds.has(channelId)) {
			this.unmuteChannels([channelId]);
		} else {
			this.muteChannels([channelId]);
		}
	}

	toggleMuteAllChannels() {
		const allChannelIds = toSet(this.fileStore.state.song.metadata.channelIds);
		const areAllMuted = [...allChannelIds].every((id) =>
			this.state.mutedChannelIds.has(id),
		);
		if (areAllMuted) {
			this.unmuteChannels(allChannelIds);
		} else {
			this.muteChannels(allChannelIds);
		}
	}

	muteChannels(channelIds: Iterable<ChannelId>) {
		const mutedChannelIds = toMutableSet(this.state.mutedChannelIds);

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

	unmuteChannels(channelIds: Iterable<ChannelId>) {
		this.updateState((state) => {
			const mutedChannelIds = toMutableSet(state.mutedChannelIds);

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
			...this.fileStore.state.song.channels
				.values()
				.map((ch) => Channel.getLastTickFrom(ch)),
		);
		if (this.state.currentTick > audioLastTickFrom) {
			this.pause();
			this.setCurrentTick(0);
			this.play();
			return;
		}

		for (const channel of this.fileStore.state.song.channels.values()) {
			this.synthesizer.setBank({
				channel: channel.metadata.id,
				bankNumber: channel.metadata.instrumentKey.bankNumber,
			});
			this.synthesizer.setPreset({
				channel: channel.metadata.id,
				programNumber: channel.metadata.instrumentKey.presetNumber,
			});
		}

		const tickEnd =
			Math.max(
				...this.fileStore.state.song.channels
					.values()
					.map((ch) => Channel.getTickTo(ch)),
			) + TICK_PER_BEAT;

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
			for (const channel of this.fileStore.state.song.channels.values()) {
				if (this.state.mutedChannelIds.has(channel.metadata.id)) continue;

				for (const note of channel.notes.values()) {
					if (
						lastEnqueuedTick <= note.tickFrom &&
						note.tickFrom < nextEnqueueTick
					) {
						this.synthesizer.noteOn({
							channel: channel.metadata.id,
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
							channel: channel.metadata.id,
							key: note.key,
							time: this.getContextTimeByTick(note.tickTo),
						});
					}
				}

				for (const [type, list] of channel.ccLists) {
					if (type !== ControlType.PITCH_BEND) continue;

					const ccs = [...(list?.ccs?.values() ?? [])];
					for (const cc of ccs) {
						if (lastEnqueuedTick <= cc.tick && cc.tick < nextEnqueueTick) {
							this.synthesizer.setPitchBend(
								channel.metadata.id,
								cc.value - 64,
								this.getContextTimeByTick(cc.tick),
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
		const secondPerMeasure = (60 / this.fileStore.state.song.metadata.bpm) * 4;
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
