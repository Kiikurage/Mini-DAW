import { AudioContextKey } from "./AudioContextHolder.ts";
import { KEY_PER_OCTAVE } from "./constants.ts";
import type { DIContainer } from "./Dependency/DIContainer.ts";
import type { Instrument } from "./models/Instrument.ts";
import type { InstrumentKey } from "./models/InstrumentKey.ts";

export class WebAudioOscillatorNodeInstrumentKey implements InstrumentKey {
	private readonly type = "oscillator";

	async load(deps: DIContainer) {
		const audioContext = deps.get(AudioContextKey);
		return new WebAudioOscillatorNodeInstrument(audioContext);
	}

	serialize(): SerializedOscillatorNodeInstrumentKey {
		return {
			type: this.type,
		};
	}

	hash() {
		return "oscillator";
	}

	static deserialize(
		obj: SerializedOscillatorNodeInstrumentKey,
	): WebAudioOscillatorNodeInstrumentKey {
		return new WebAudioOscillatorNodeInstrumentKey();
	}
}

export interface SerializedOscillatorNodeInstrumentKey {
	readonly type: "oscillator";
}

/**
 * Web Audio API の OscillatorNode を使用して音を鳴らす楽器クラス
 */
export class WebAudioOscillatorNodeInstrument implements Instrument {
	readonly noLoopKeys = new Set<number>();

	readonly key: InstrumentKey;

	readonly name = "WebAudio OscillatorNode";

	private readonly playingNotes = new Set<{
		key: number;
		oscillator: OscillatorNode;
		velocityNode: GainNode;
		startAt: number;
		isEndQueued: boolean;
	}>();

	constructor(private readonly context: AudioContext) {
		this.key = new WebAudioOscillatorNodeInstrumentKey();
	}

	noteOn({
		key,
		velocity,
		time,
	}: {
		key: number;
		velocity: number;
		time?: number;
	}): void {
		time ??= this.context.currentTime;
		if (time < this.context.currentTime) return;

		const oscillator = this.context.createOscillator();
		oscillator.type = "square";
		oscillator.frequency.value = 440 * 2 ** ((key - 69) / KEY_PER_OCTAVE);

		const velocityNode = this.context.createGain();
		velocityNode.gain.value = (velocity / 100) ** 2;

		oscillator.connect(velocityNode);
		velocityNode.connect(this.context.destination);

		oscillator.start(time);

		const playingNote = {
			key,
			oscillator,
			velocityNode,
			startAt: time,
			isEndQueued: false,
		};
		oscillator.addEventListener("ended", () => {
			oscillator.disconnect();
			velocityNode.disconnect();
			this.playingNotes.delete(playingNote);
		});
		this.playingNotes.add(playingNote);
	}

	noteOff({ key, time }: { key: number; time: number }): void {
		time ??= this.context.currentTime;
		if (time < this.context.currentTime) return;

		for (const playingNote of this.playingNotes) {
			if (
				playingNote.key !== key ||
				playingNote.startAt > time ||
				playingNote.isEndQueued
			) {
				continue;
			}

			playingNote.isEndQueued = true;
			playingNote.oscillator.stop(time);
			break;
		}
	}

	reset(): void {
		for (const playingNote of this.playingNotes) {
			playingNote.oscillator.stop();
		}
		this.playingNotes.clear();
	}
}
