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

	private soundFont: SoundFont | null = null;

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

	setSoundFont(soundFont: SoundFont | null) {
		this.soundFont = soundFont;
		for (const channel of this.channels.values()) {
			channel.setSoundFont(soundFont);
		}
	}

	setPreset(message: ProgramChangeMessage) {
		this.getOrCreateChannel(message.channel).setPresetNumber(
			message.programNumber,
		);
	}

	setBank(message: { channel: number; bankNumber: number }) {
		this.getOrCreateChannel(message.channel).setBankNumber(message.bankNumber);
	}

	channelNoteOffAll(channel: number) {
		this.getChannel(channel)?.noteOffAll();
	}

	noteOffAll() {
		for (const channel of this.channels.values()) {
			channel.noteOffAll();
		}
	}

	stopImmediatelyAll() {
		for (const channel of this.channels.values()) {
			channel.stopImmediately();
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

	setPitchBend(channel: number, cents: number, time?: number): void {
		this.getOrCreateChannel(channel).setPitchBend(cents, time);
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
				this.soundFont,
			);
			this.channels.set(channelNumber, channel);
		}
		return channel;
	}
}

class SoundFontSynthesizerChannel {
	private presetNumber: number = 0;
	private bankNumber: number = 0;
	private preset: Preset | null = null;
	private readonly notes = new Set<SoundFontNote>();

	constructor(
		private readonly context: AudioContext,
		private readonly masterVolumeNode: GainNode,
		private soundFont: SoundFont | null = null,
	) {}

	setPresetNumber(presetNumber: number) {
		this.presetNumber = presetNumber;
		this.updatePreset();
	}

	setBankNumber(bankNumber: number) {
		this.bankNumber = bankNumber;
		this.updatePreset();
	}

	setSoundFont(soundFont: SoundFont | null) {
		this.soundFont = soundFont;
		this.updatePreset();
	}

	private updatePreset() {
		this.preset =
			this.soundFont?.getPreset(this.presetNumber, this.bankNumber) ?? null;
	}

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
			this.pitchBend,
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

	stopImmediately(): void {
		for (const note of this.notes) {
			note.dispose();
		}
	}

	reset() {
		for (const note of this.notes) {
			note.dispose();
		}
		this.notes.clear();
		this.currentPitchBend = 0;
		this.queueudPitchBendControlChanges.length = 0;
	}

	/**
	 * ピッチベンド [cent]
	 */
	currentPitchBend: number = 0;

	get pitchBend(): number {
		while (this.queueudPitchBendControlChanges.length > 0) {
			const message = this.queueudPitchBendControlChanges[0];
			if (message === undefined) break;
			if (message.time > this.context.currentTime) break;

			this.currentPitchBend = message.cents;
			this.queueudPitchBendControlChanges.shift();
		}
		return this.currentPitchBend;
	}

	private readonly queueudPitchBendControlChanges: {
		time: number;
		cents: number;
	}[] = [];

	setPitchBend(cents: number, time?: number): void {
		time ??= this.context.currentTime;
		this.queueudPitchBendControlChanges.push({ time, cents });
		this.queueudPitchBendControlChanges.sort((a, b) => a.time - b.time);

		for (const note of this.notes) {
			note.setPitchBend(cents, time);
		}
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
		private pitchBendInCents: number,
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
			bufferSource.detune.value =
				instrumentZone.getTuneForKey(this.key) + this.pitchBendInCents;

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

	setPitchBend(cents: number, time?: number): void {
		time = time ?? this.context.currentTime;

		for (const zone of this.zones) {
			zone.bufferSource.detune.setValueAtTime(
				zone.instrumentZone.getTuneForKey(this.key) + cents,
				time,
			);
		}
	}
}

interface SoundFontPlayingNoteInstrumentZoneEntry {
	instrumentZone: InstrumentZone;
	bufferSource: AudioBufferSourceNode;
	velocityNode: GainNode;
	volumeEnvelopeNode: GainNode;
	filterNode: BiquadFilterNode;
}
