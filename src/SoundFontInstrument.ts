import { AudioContextKey } from "./AudioContextHolder.ts";
import type { DIContainer } from "./Dependency/DIContainer.ts";
import type { Hash } from "./Hashable.ts";
import { assertNotNullish } from "./lib.ts";
import type { Instrument } from "./models/Instrument.ts";
import type { InstrumentKey } from "./models/InstrumentKey.ts";
import type { InstrumentZone } from "./SoundFont/InstrumentZone.ts";
import type { Preset } from "./SoundFont/Preset.ts";
import { SoundFontStore } from "./SoundFontStore.ts";

export class SoundFontInstrumentKey implements InstrumentKey {
	constructor(
		public readonly url: string,
		public readonly presetNumber: number,
		public readonly bankNumber: number,
	) {}

	async load(deps: DIContainer) {
		const soundFontStore = deps.get(SoundFontStore.Key);
		const audioContext = deps.get(AudioContextKey);

		const sf = await soundFontStore.load(this.url);

		const preset = sf.getPreset(this.presetNumber, this.bankNumber);
		assertNotNullish(preset);

		return new SoundFontInstrument(this, audioContext, preset);
	}

	hash(): Hash {
		return `${this.url}::${this.presetNumber}::${this.bankNumber}`;
	}

	serialize(): SerializedSoundFontInstrumentKey {
		return {
			type: "sf",
			url: this.url,
			presetNumber: this.presetNumber,
			bankNumber: this.bankNumber,
		};
	}

	static deserialize(
		data: SerializedSoundFontInstrumentKey,
	): SoundFontInstrumentKey {
		return new SoundFontInstrumentKey(
			data.url,
			data.presetNumber,
			data.bankNumber,
		);
	}
}

export interface SerializedSoundFontInstrumentKey {
	type: "sf";
	url: string;
	presetNumber: number;
	bankNumber: number;
}

interface PlayingZone {
	zone: InstrumentZone;
	bufferSource: AudioBufferSourceNode;
	velocityNode: GainNode;
	amplifierNode: GainNode;
	filterNode: BiquadFilterNode;
}

interface PlayingNote {
	key: number;
	zones: Set<PlayingZone>;
	startAt: number;
	isEndQueued: boolean;
}

/**
 * サウンドフォントを使用して音を鳴らす楽器クラス
 */
export class SoundFontInstrument implements Instrument {
	readonly name: string;

	readonly noLoopKeys: ReadonlySet<number>;

	private readonly playingNotes = new Set<PlayingNote>();

	private readonly masterVolumeNode: GainNode;

	constructor(
		public readonly key: SoundFontInstrumentKey,
		private readonly context: AudioContext,
		private readonly preset: Preset,
	) {
		this.name = preset.name;
		this.noLoopKeys = preset.getNoLoopKeys();

		this.masterVolumeNode = this.context.createGain();
		this.masterVolumeNode.gain.value = 4.0;
		this.masterVolumeNode.connect(this.context.destination);
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
		if (this.context.currentTime > time) return;

		const playingNote: PlayingNote = {
			key,
			zones: new Set(),
			startAt: time,
			isEndQueued: false,
		};
		this.playingNotes.add(playingNote);

		for (const zone of this.preset.getInstrumentZones(key, velocity)) {
			const bufferSource = zone.createAudioBufferSourceNode(this.context);
			if (bufferSource === null) continue;
			bufferSource.detune.value = zone.getTuneForKey(key);

			const velocityNode = this.context.createGain();
			velocityNode.gain.value = (velocity / 100) ** 2 * 0.1;

			const amplifierNode = zone.volumeEnvelope.createGainNode(
				this.context,
				time,
			);

			const filterNode = this.context.createBiquadFilter();
			filterNode.type =
				zone.initialFilterCutoffFrequency === null ? "allpass" : "lowpass";
			filterNode.frequency.value = zone.initialFilterCutoffFrequency ?? 0;
			filterNode.Q.value = zone.initialFilterQ;

			bufferSource.connect(velocityNode);
			velocityNode.connect(filterNode);
			filterNode.connect(amplifierNode);
			amplifierNode.connect(this.masterVolumeNode);

			const playingZone: PlayingZone = {
				zone,
				bufferSource,
				velocityNode,
				amplifierNode,
				filterNode,
			};

			playingNote.zones.add(playingZone);

			bufferSource.start(time);
			bufferSource.addEventListener("ended", () => {
				bufferSource.disconnect();
				velocityNode.disconnect();
				filterNode.disconnect();
				amplifierNode.disconnect();
				playingNote.zones.delete(playingZone);

				if (playingNote.zones.size === 0) {
					this.playingNotes.delete(playingNote);
				}
			});
		}
	}

	noteOff({ key, time }: { key: number; time?: number }): void {
		time ??= this.context.currentTime;
		if (this.context.currentTime > time) return;

		for (const playingNote of this.playingNotes) {
			if (
				playingNote.key !== key ||
				playingNote.startAt > time ||
				playingNote.isEndQueued
			) {
				continue;
			}

			playingNote.isEndQueued = true;
			for (const { zone, bufferSource, amplifierNode } of playingNote.zones) {
				const currentGain = zone.volumeEnvelope.getValueAt(
					time - playingNote.startAt,
				);

				amplifierNode.gain.cancelScheduledValues(time);
				amplifierNode.gain.setValueAtTime(currentGain, time);
				amplifierNode.gain.setTargetAtTime(
					0.0001,
					time,
					zone.volumeEnvelope.release / 5,
				);

				bufferSource.stop(time + zone.volumeEnvelope.release + 0.05);
			}
			break;
		}
	}

	reset(): void {
		for (const playingNote of this.playingNotes) {
			for (const { bufferSource } of playingNote.zones) {
				bufferSource.stop();
			}
		}
		this.playingNotes.clear();
	}
}
