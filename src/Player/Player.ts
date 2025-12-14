import { TICK_PER_BEAT, TICK_PER_MEASURE } from "../constants.ts";
import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import type { InstrumentStore } from "../InstrumentStore.ts";
import { minmax } from "../lib.ts";
import type { SongStore } from "../SongStore.ts";
import type { StateOnly } from "../Stateful/Stateful.ts";
import { Stateful } from "../Stateful/Stateful.ts";

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
	mutedChannelIds: Set<number>;

	/**
	 * ピアノロールの自動スクロールが有効かどうか
	 */
	isAutoScrollEnabled: boolean;
}

export class Player extends Stateful<PlayerState> {
	static readonly Key = ComponentKey.of(Player);

	constructor(
		private readonly context: AudioContext,
		private readonly songStore: StateOnly<SongStore>,
		private readonly instrumentStore: InstrumentStore,
		bus: EventBus,
	) {
		super({
			currentTick: 0,
			isPlaying: false,
			mutedChannelIds: new Set(),
			isAutoScrollEnabled: false,
		});

		bus.on("song.set.after", (song) => {
			for (const channel of song.channels) {
				instrumentStore.getOrLoad(channel.instrumentKey);
			}
		});
	}

	setCurrentTick(currentTick: number) {
		currentTick = minmax(0, null, currentTick);
		if (this.state.currentTick === currentTick) return;

		this.updateState((state) => ({ ...state, currentTick }));
		if (this.state.isPlaying) {
			this.pause();
			this.play();
		}
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

	pause() {
		if (!this.state.isPlaying) return;
		if (this.rAFTimerId !== null) {
			cancelAnimationFrame(this.rAFTimerId);
			this.rAFTimerId = null;
		}

		this.setPlaying(false);
		for (const channel of this.songStore.state.channels) {
			const instrumentPS = this.instrumentStore.getOrLoad(
				channel.instrumentKey,
			);
			if (instrumentPS.status !== "fulfilled") continue;
			instrumentPS.value.reset();
		}
	}

	play() {
		if (this.state.isPlaying) return;
		this.setPlaying(true);
		this.setAutoScrollEnabled(true);

		const SETUP_TIME_IN_SEC = 0.05;
		const SECOND_PER_TICK =
			60 / this.songStore.state.bpm / (TICK_PER_MEASURE / 4);

		// 楽曲を再生開始するAudioContext時刻[sec]
		const audioStartTime = this.context.currentTime + SETUP_TIME_IN_SEC;

		const audioLastTickFrom = Math.max(
			...this.songStore.state.channels.map((ch) => ch.lastTickFrom),
		);
		if (this.state.currentTick > audioLastTickFrom) {
			this.setCurrentTick(0);
		}

		// 楽曲の再生開始位置[tick]
		const audioStartTick = this.state.currentTick;

		for (const channel of this.songStore.state.channels) {
			const instrumentPS = this.instrumentStore.getOrLoad(
				channel.instrumentKey,
			);
			if (instrumentPS.status !== "fulfilled") continue;
			instrumentPS.value.reset();
		}

		const tickTo =
			Math.max(...this.songStore.state.channels.map((ch) => ch.tickTo)) +
			TICK_PER_BEAT;
		const updatePlayHead = () => {
			this.rAFTimerId = null;

			const elapsedTime = this.context.currentTime - audioStartTime;
			const elapsedTicks = Math.floor(elapsedTime / SECOND_PER_TICK);
			this.updateState((state) => ({
				...state,
				currentTick: audioStartTick + elapsedTicks,
			}));

			if (audioStartTick + elapsedTicks >= tickTo) {
				this.pause();
				return;
			}
			if (this.state.isPlaying) {
				this.rAFTimerId = requestAnimationFrame(updatePlayHead);
			}
		};
		this.rAFTimerId = requestAnimationFrame(updatePlayHead);

		for (const channel of this.songStore.state.channels) {
			if (this.state.mutedChannelIds.has(channel.id)) continue;

			const instrumentPS = this.instrumentStore.getOrLoad(
				channel.instrumentKey,
			);
			if (instrumentPS.status !== "fulfilled") continue;
			const instrument = instrumentPS.value;

			for (const note of channel.notes.values()) {
				if (note.tickFrom < audioStartTick) continue;

				instrument.noteOn({
					key: note.key,
					velocity: note.velocity,
					time:
						audioStartTime + (note.tickFrom - audioStartTick) * SECOND_PER_TICK,
				});
				instrument.noteOff({
					key: note.key,
					time:
						audioStartTime + (note.tickTo - audioStartTick) * SECOND_PER_TICK,
				});
			}
		}
	}

	private rAFTimerId: number | null = null;
}
