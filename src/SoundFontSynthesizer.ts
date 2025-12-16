import type { InstrumentZone } from "./SoundFont/InstrumentZone.ts";
import type { Preset } from "./SoundFont/Preset.ts";
import type { SoundFont } from "./SoundFont/SoundFont.ts";
import type {
	NoteOffMessage,
	NoteOnMessage,
	ProgramChangeMessage,
	Synthesizer,
} from "./Synthesizer.ts";

export class SoundFontSynthesizer implements Synthesizer {
	private readonly masterVolumeNode: GainNode;

	private readonly channels = new Map<number, SoundFontSynthesizerChannel>();

	soundFont: SoundFont | null = null;

	constructor(private readonly context: AudioContext) {
		this.masterVolumeNode = this.context.createGain();
		this.masterVolumeNode.gain.value = 0.2;
		this.masterVolumeNode.connect(this.context.destination);
	}

	noteOn(message: NoteOnMessage): void {
		this.getOrCreateChannel(message.channel).noteOn(message);
	}

	noteOff(message: NoteOffMessage): void {
		this.getOrCreateChannel(message.channel).noteOff(message);
	}

	setPreset(message: ProgramChangeMessage) {
		const channel = this.getOrCreateChannel(message.channel);

		channel.presetNumber = message.programNumber;

		channel.preset =
			this.soundFont?.getPreset(channel.presetNumber, channel.bankNumber) ??
			null;
	}

	setBank(message: { channel: number; bankNumber: number }) {
		const channel = this.getOrCreateChannel(message.channel);

		channel.bankNumber = message.bankNumber;

		channel.preset =
			this.soundFont?.getPreset(channel.presetNumber, channel.bankNumber) ??
			null;
	}

	noteOffAll() {
		for (const channel of this.channels.values()) {
			channel.noteOffAll();
		}
	}

	reset(channel: number): void {
		this.getChannel(channel)?.reset();
		this.channels.delete(channel);
	}

	resetAll(): void {
		for (const channel of this.channels.values()) {
			channel.reset();
		}
		this.channels.clear();
	}

	private getChannel(
		channelNumber: number,
	): SoundFontSynthesizerChannel | null {
		return this.channels.get(channelNumber) ?? null;
	}

	private getOrCreateChannel(
		channelNumber: number,
	): SoundFontSynthesizerChannel {
		let channel = this.getChannel(channelNumber);
		if (channel === null) {
			channel = new SoundFontSynthesizerChannel(
				this.context,
				this.masterVolumeNode,
			);
			if (this.soundFont !== null) {
				channel.preset = this.soundFont.getPreset(0, 0);
			}
			this.channels.set(channelNumber, channel);
		}
		return channel;
	}
}

class SoundFontSynthesizerChannel {
	presetNumber: number = 0;
	bankNumber: number = 0;
	preset: Preset | null = null;
	private readonly notes = new Set<SoundFontNote>();

	constructor(
		private readonly context: AudioContext,
		private readonly masterVolumeNode: GainNode,
	) {}

	noteOn({ key, velocity, time }: NoteOnMessage): void {
		if (time === undefined || time < this.context.currentTime) {
			time = this.context.currentTime;
		}

		if (this.preset === null) return;

		const note = new SoundFontNote(
			this.context,
			key,
			velocity,
			this.preset,
			this.masterVolumeNode,
		);
		note.onEnded = () => {
			this.notes.delete(note);
		};
		note.noteOn(time);
		this.notes.add(note);
	}

	noteOff({ key, time }: NoteOffMessage): void {
		if (time === undefined || time < this.context.currentTime) {
			time = this.context.currentTime;
		}

		for (const note of this.notes) {
			if (note.key !== key || note.noteOnAt > time || note.isNoteOffQueued) {
				continue;
			}

			note.noteOff(time);
			break;
		}
	}

	noteOffAll(): void {
		for (const note of this.notes) {
			note.noteOff(this.context.currentTime);
		}
	}

	reset() {
		for (const note of this.notes) {
			note.dispose();
		}
		this.notes.clear();
	}
}

class SoundFontNote {
	noteOnAt: number = 0;
	isNoteOffQueued = false;
	private readonly zones: Set<SoundFontPlayingNoteInstrumentZoneEntry> =
		new Set();

	constructor(
		readonly context: AudioContext,
		public readonly key: number,
		readonly velocity: number,
		readonly preset: Preset,
		readonly destination: AudioNode,
	) {}

	onEnded?: () => void;

	noteOn(time: number): void {
		this.noteOnAt = time;
		for (const instrumentZone of this.preset.getInstrumentZones(
			this.key,
			this.velocity,
		)) {
			const bufferSource = instrumentZone.createAudioBufferSourceNode(
				this.context,
			);
			if (bufferSource === null) continue;
			bufferSource.detune.value = instrumentZone.getTuneForKey(this.key);

			const velocityNode = this.context.createGain();
			velocityNode.gain.value = (this.velocity / 100) ** 2;

			const volumeEnvelopeNode = instrumentZone.volumeEnvelope.createGainNode(
				this.context,
				time,
			);

			const filterNode = this.context.createBiquadFilter();
			filterNode.type =
				instrumentZone.initialFilterCutoffFrequency === null
					? "allpass"
					: "lowpass";
			filterNode.frequency.value =
				instrumentZone.initialFilterCutoffFrequency ?? 0;
			filterNode.Q.value = instrumentZone.initialFilterQ;

			bufferSource.connect(velocityNode);
			velocityNode.connect(filterNode);
			filterNode.connect(volumeEnvelopeNode);
			volumeEnvelopeNode.connect(this.destination);

			const synthesizerZone: SoundFontPlayingNoteInstrumentZoneEntry = {
				instrumentZone,
				bufferSource,
				velocityNode,
				volumeEnvelopeNode,
				filterNode,
			};
			this.zones.add(synthesizerZone);

			bufferSource.start(time);
			bufferSource.addEventListener("ended", () => {
				bufferSource.disconnect();
				velocityNode.disconnect();
				filterNode.disconnect();
				volumeEnvelopeNode.disconnect();
				this.zones.delete(synthesizerZone);

				if (this.zones.size === 0) {
					this.onEnded?.();
				}
			});
		}
	}

	noteOff(time: number): void {
		if (this.isNoteOffQueued) return;
		this.isNoteOffQueued = true;
		for (const { instrumentZone, bufferSource, volumeEnvelopeNode } of this
			.zones) {
			const currentGain = instrumentZone.volumeEnvelope.getValueAt(
				time - this.noteOnAt,
			);

			volumeEnvelopeNode.gain.cancelScheduledValues(time);
			volumeEnvelopeNode.gain.setValueAtTime(currentGain, time);
			volumeEnvelopeNode.gain.setTargetAtTime(
				0.0001,
				time,
				instrumentZone.volumeEnvelope.release / 5,
			);

			bufferSource.stop(time + instrumentZone.volumeEnvelope.release + 0.05);
		}
	}

	dispose(): void {
		for (const zone of this.zones) {
			zone.bufferSource.stop();
			zone.bufferSource.disconnect();
			zone.velocityNode.disconnect();
			zone.filterNode.disconnect();
			zone.volumeEnvelopeNode.disconnect();
		}
		this.zones.clear();
	}
}

interface SoundFontPlayingNoteInstrumentZoneEntry {
	instrumentZone: InstrumentZone;
	bufferSource: AudioBufferSourceNode;
	velocityNode: GainNode;
	volumeEnvelopeNode: GainNode;
	filterNode: BiquadFilterNode;
}
