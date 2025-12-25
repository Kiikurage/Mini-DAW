import { ComponentKey } from "./Dependency/DIContainer.ts";
import { Envelope } from "./SoundFont/Envelope.ts";
import type { InstrumentZone } from "./SoundFont/InstrumentZone.ts";
import type { Preset } from "./SoundFont/Preset.ts";
import type { SoundFont } from "./SoundFont/SoundFont.ts";

export interface NoteOnMessage {
	channel: number;
	key: number;
	velocity: number;
	time?: number;
}

export interface NoteOffMessage {
	channel: number;
	key: number;
	time?: number;
}

export interface ProgramChangeMessage {
	channel: number;
	programNumber: number;
}

export class Synthesizer {
	static readonly Key = ComponentKey.of(Synthesizer);

	private readonly masterVolumeNode: GainNode;

	private readonly channels = new Map<number, ChannelSynthesizer>();

	private soundFont: SoundFont | null = null;

	constructor(private readonly context: AudioContext) {
		this.masterVolumeNode = this.context.createGain();
		this.masterVolumeNode.gain.value = 0.2;
		this.masterVolumeNode.connect(this.context.destination);
	}

	/**
	 * 音を鳴らす
	 */
	noteOn(message: NoteOnMessage): void {
		this.getOrCreateChannel(message.channel).noteOn(message);
	}

	/**
	 * 指定したチャンネルで発音中の音をリリースする。
	 * 同じキーで複数音が発音中の場合、最も古い音をリリースする。
	 */
	noteOff(message: NoteOffMessage): void {
		this.getOrCreateChannel(message.channel).noteOff(message);
	}

	setSoundFont(soundFont: SoundFont | null) {
		this.soundFont = soundFont;
		for (const channel of this.channels.values()) {
			channel.setSoundFont(soundFont);
		}
	}

	/**
	 * 音色を変更する
	 */
	setPreset(message: ProgramChangeMessage) {
		this.getOrCreateChannel(message.channel).setPresetNumber(
			message.programNumber,
		);
	}

	/**
	 * 音色バンクを変更する
	 */
	setBank(message: { channel: number; bankNumber: number }) {
		this.getOrCreateChannel(message.channel).setBankNumber(message.bankNumber);
	}

	/*
	 * 指定したチャンネルの発音中の音を全てリリースする。
	 */
	channelNoteOffAll(channel: number) {
		this.getChannel(channel)?.noteOffAll();
	}

	/**
	 * 全てのチャンネルの全ての発音中の音をリリースする。
	 */
	noteOffAll() {
		for (const channel of this.channels.values()) {
			channel.noteOffAll();
		}
	}

	/**
	 * 指定したチャンネルの状態を初期化する。再生中の音はリリースなく直ちに停止する。
	 */
	reset(channel: number): void {
		this.getChannel(channel)?.reset();
		this.channels.delete(channel);
	}

	/**
	 * 全てのチャンネルの状態を初期化する。再生中の音はリリースなく直ちに停止する。
	 **/
	resetAll(): void {
		for (const channel of this.channels.values()) {
			channel.reset();
		}
		this.channels.clear();
	}

	/**
	 * ピッチベンドを設定する
	 * @param channel チャンネル番号
	 * @param cents セント単位のピッチベンド量。正の値で音が高く、負の値で音が低くなる。
	 * @param time ピッチベンドを適用するAudioContext時刻 [sec]。省略した場合は即座に適用される。
	 */
	setPitchBend(channel: number, cents: number, time?: number): void {
		this.getOrCreateChannel(channel).setPitchBend(cents, time);
	}

	private getChannel(channelNumber: number): ChannelSynthesizer | null {
		return this.channels.get(channelNumber) ?? null;
	}

	private getOrCreateChannel(channelNumber: number): ChannelSynthesizer {
		let channel = this.getChannel(channelNumber);
		if (channel === null) {
			channel = new ChannelSynthesizer(
				this.context,
				this.masterVolumeNode,
				this.soundFont,
			);
			this.channels.set(channelNumber, channel);
		}
		return channel;
	}
}

class ChannelSynthesizer {
	private presetNumber: number = 0;
	private bankNumber: number = 0;
	private preset: Preset | null = null;
	private readonly pitchBend: ConstantSourceNode;

	private readonly instrumentZoneSynthesizerCache = new Map<
		InstrumentZone,
		InstrumentZoneSynthesizer
	>();

	constructor(
		private readonly context: AudioContext,
		private readonly masterVolumeNode: GainNode,
		private soundFont: SoundFont | null = null,
	) {
		this.pitchBend = new ConstantSourceNode(this.context);
		if (this.context.state === "running") {
			this.pitchBend.start();
		} else {
			this.context.addEventListener(
				"statechange",
				() => this.pitchBend.start(),
				{ once: true },
			);
		}
	}

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

	noteOn(message: NoteOnMessage): void {
		const { key, velocity } = message;

		if (this.preset === null) return;

		for (const instrumentZone of this.preset.getInstrumentZones(
			key,
			velocity,
		)) {
			let synthesizer = this.instrumentZoneSynthesizerCache.get(instrumentZone);
			if (synthesizer === undefined) {
				synthesizer = new InstrumentZoneSynthesizer({
					context: this.context,
					destination: this.masterVolumeNode,
					instrumentZone: instrumentZone,
					pitchBend: this.pitchBend,
				});
				this.instrumentZoneSynthesizerCache.set(instrumentZone, synthesizer);
			}
			synthesizer.noteOn(message);
		}
	}

	noteOff(message: NoteOffMessage): void {
		const { key } = message;
		if (!this.preset?.loopKeys?.has(key)) return;

		for (const synthesizer of this.instrumentZoneSynthesizerCache.values()) {
			const keyRange = synthesizer.instrumentZone.keyRange;
			if (key < keyRange.min || keyRange.max < key) {
				continue;
			}

			synthesizer.noteOff(message);
			break;
		}
	}

	noteOffAll(): void {
		for (const synthesizer of this.instrumentZoneSynthesizerCache.values()) {
			synthesizer.noteOffAll();
		}
	}

	reset() {
		for (const synthesizer of this.instrumentZoneSynthesizerCache.values()) {
			synthesizer.dispose();
		}
		this.instrumentZoneSynthesizerCache.clear();
		this.pitchBend.offset.cancelScheduledValues(0);
		this.pitchBend.offset.value = 0;
	}

	setPitchBend(cents: number, time?: number): void {
		time ??= this.context.currentTime;
		this.pitchBend.offset.setValueAtTime(cents, time);
	}
}

class InstrumentZoneSynthesizer {
	readonly instrumentZone: InstrumentZone;
	private readonly context: AudioContext;
	private readonly destination: AudioNode;
	private readonly pitchBend: ConstantSourceNode;

	private readonly filterNode: BiquadFilterNode;
	private readonly notes = new Set<PlayingNoteHandle>();
	private audioBuffer: AudioBuffer | null = null;

	constructor(props: {
		instrumentZone: InstrumentZone;
		context: AudioContext;
		destination: AudioNode;
		pitchBend: ConstantSourceNode;
	}) {
		this.instrumentZone = props.instrumentZone;
		this.context = props.context;
		this.destination = props.destination;
		this.pitchBend = props.pitchBend;

		this.filterNode = this.context.createBiquadFilter();
		this.filterNode.type =
			this.instrumentZone.initialFilterCutoffFrequency === null
				? "allpass"
				: "lowpass";
		this.filterNode.frequency.value =
			this.instrumentZone.initialFilterCutoffFrequency ?? 0;
		this.filterNode.Q.value = this.instrumentZone.initialFilterQ;
		this.filterNode.connect(this.destination);
	}

	noteOn({ key, velocity, time }: NoteOnMessage): void {
		if (time === undefined || time < this.context.currentTime) {
			time = this.context.currentTime;
		}

		const audioBuffer = this.getOrCreateAudioBuffer();

		const note = PlayingNoteHandle.noteOn({
			context: this.context,
			key,
			velocity,
			audioBuffer,
			instrumentZone: this.instrumentZone,
			destination: this.filterNode,
			pitchBend: this.pitchBend,
			time,
			onEnded: () => {
				this.notes.delete(note);
			},
		});
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

	dispose() {
		for (const note of this.notes) {
			note.dispose();
		}
	}

	private getOrCreateAudioBuffer(): AudioBuffer {
		if (this.audioBuffer !== null) return this.audioBuffer;

		this.audioBuffer = new AudioBuffer({
			length: this.instrumentZone.sample.length,
			numberOfChannels: 1,
			sampleRate: this.instrumentZone.sampleRate,
		});
		this.audioBuffer.copyToChannel(this.instrumentZone.sample, 0);
		return this.audioBuffer;
	}
}

/**
 * 再生中のノートのハンドル
 */
class PlayingNoteHandle {
	public isNoteOffQueued = false;
	public readonly noteOnAt: number = 0;
	public readonly key: number;
	private readonly bufferSource: AudioBufferSourceNode;
	private readonly keyDetune: ConstantSourceNode;
	private readonly gainNode: GainNode;
	private readonly volumeEnvelope: Envelope;

	constructor(props: {
		key: number;
		noteOnAt: number;
		bufferSource: AudioBufferSourceNode;
		keyDetune: ConstantSourceNode;
		gainNode: GainNode;
		volumeEnvelope: Envelope;
	}) {
		this.key = props.key;
		this.noteOnAt = props.noteOnAt;
		this.bufferSource = props.bufferSource;
		this.keyDetune = props.keyDetune;
		this.gainNode = props.gainNode;
		this.volumeEnvelope = props.volumeEnvelope;
	}

	static noteOn(props: {
		context: AudioContext;
		key: number;
		velocity: number;
		instrumentZone: InstrumentZone;
		destination: AudioNode;
		audioBuffer: AudioBuffer;
		pitchBend: ConstantSourceNode;
		time: number;
		onEnded?: () => void;
	}): PlayingNoteHandle {
		const {
			context,
			key,
			velocity,
			instrumentZone,
			destination,
			audioBuffer,
			pitchBend,
			time,
			onEnded,
		} = props;

		const bufferSource = new AudioBufferSourceNode(context, {
			buffer: audioBuffer,
		});
		switch (instrumentZone.sampleMode) {
			case "no_loop": {
				bufferSource.loop = false;
				break;
			}
			case "loop_until_key_off": {
				console.warn("NIY: loop_until_key_off sample mode", PlayingNoteHandle);
				bufferSource.loop = true;
				bufferSource.loopStart =
					instrumentZone.loopStartIndex / instrumentZone.sampleRate;
				bufferSource.loopEnd =
					instrumentZone.loopEndIndex / instrumentZone.sampleRate;
				break;
			}
			case "loop": {
				bufferSource.loop = true;
				bufferSource.loopStart =
					instrumentZone.loopStartIndex / instrumentZone.sampleRate;
				bufferSource.loopEnd =
					instrumentZone.loopEndIndex / instrumentZone.sampleRate;
				break;
			}
		}

		pitchBend.connect(bufferSource.detune);

		const keyDetune = new ConstantSourceNode(context, {
			offset: instrumentZone.getTuneForKey(key),
		});
		keyDetune.start();
		keyDetune.connect(bufferSource.detune);

		const volumeEnvelope = new Envelope({
			...instrumentZone.volumeEnvelope,
			scale: (velocity / 100) ** 2,
		});
		const gainNode = volumeEnvelope.createGainNode(context, time);

		bufferSource.connect(gainNode);
		gainNode.connect(destination);

		const note = new PlayingNoteHandle({
			key,
			noteOnAt: time,
			bufferSource,
			keyDetune,
			gainNode,
			volumeEnvelope,
		});
		bufferSource.start(time);
		bufferSource.addEventListener("ended", () => {
			note.dispose();
			onEnded?.();
		});

		return note;
	}

	noteOff(time: number): void {
		if (this.isNoteOffQueued) return;
		this.isNoteOffQueued = true;

		const currentValue = this.volumeEnvelope.getValueAt(time - this.noteOnAt);

		this.gainNode.gain.cancelScheduledValues(time);
		this.gainNode.gain.setValueAtTime(currentValue, time);
		this.gainNode.gain.setTargetAtTime(
			0.0001,
			time,
			this.volumeEnvelope.release / 5,
		);

		this.bufferSource.stop(time + this.volumeEnvelope.release + 0.05);
	}

	dispose(): void {
		this.bufferSource.stop();
		this.bufferSource.disconnect();
		this.keyDetune.stop();
		this.keyDetune.disconnect();
		this.gainNode.disconnect();
	}
}
