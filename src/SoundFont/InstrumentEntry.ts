import { assertNotNullish } from "../lib.ts";
import type { Envelope } from "./Envelope.ts";
import type {
	InstrumentZoneBuilder,
	InstrumentZoneSampleMode,
} from "./InstrumentZoneBuilder.ts";
import { Range } from "./Range.ts";
import type { Sample } from "./Sample.ts";
import type { ZoneBuilder } from "./ZoneBuilder.ts";

export class InstrumentEntry {
	readonly sampleMode: InstrumentZoneSampleMode;
	readonly keyRange: Range;
	readonly velocityRange: Range;
	readonly volumeEnvelope: Envelope;
	readonly initialFilterCutoffFrequency: number | null;
	readonly initialFilterQ: number;
	private readonly sample: Sample;
	private readonly startAddressOffset: number;
	private readonly endAddressOffset: number;
	private readonly endLoopAddressOffset: number;
	private readonly coarseTune: number;
	private readonly fineTune: number;
	private readonly scaleTuning: number;

	/**
	 * このゾーンのルートキー(サンプルの基準となるMIDIキー番号)
	 */
	private readonly rootKey: number;

	private audioBufferCache: AudioBuffer | null = null;

	constructor(props: {
		sampleMode: InstrumentZoneSampleMode;
		keyRange: Range;
		velocityRange: Range;
		volumeEnvelope: Envelope;
		initialFilterCutoffFrequency: number | null;
		initialFilterQ: number;
		sample: Sample;
		startAddressOffset: number;
		endAddressOffset: number;
		endLoopAddressOffset: number;
		coarseTune: number;
		fineTune: number;
		scaleTuning: number;
		rootKey: number;
	}) {
		this.sampleMode = props.sampleMode;
		this.keyRange = props.keyRange;
		this.velocityRange = props.velocityRange;
		this.volumeEnvelope = props.volumeEnvelope;
		this.initialFilterCutoffFrequency = props.initialFilterCutoffFrequency;
		this.initialFilterQ = props.initialFilterQ;
		this.sample = props.sample;
		this.startAddressOffset = props.startAddressOffset;
		this.endAddressOffset = props.endAddressOffset;
		this.endLoopAddressOffset = props.endLoopAddressOffset;
		this.coarseTune = props.coarseTune;
		this.fineTune = props.fineTune;
		this.scaleTuning = props.scaleTuning;
		this.rootKey = props.rootKey;
	}

	/**
	 * サンプルを指定されたキーで再生する際に必要なピッチ調整値 [cents] を取得する
	 * @param key
	 */
	getTuneForKey(key: number): number {
		return (
			this.coarseTune * 100 +
			this.fineTune +
			this.scaleTuning * (key - this.rootKey)
		);
	}

	createAudioBufferSourceNode(context: AudioContext): AudioBufferSourceNode {
		if (this.audioBufferCache === null) {
			this.audioBufferCache = new AudioBuffer({
				length:
					this.sample.sample.length -
					this.startAddressOffset +
					this.endAddressOffset,
				numberOfChannels: 1,
				sampleRate: this.sample.rate,
			});
			this.audioBufferCache.copyToChannel(
				this.sample.sample.slice(
					this.startAddressOffset,
					this.startAddressOffset + this.sample.sample.length,
				),
				0,
			);
		}

		switch (this.sampleMode) {
			case "no_loop": {
				return new AudioBufferSourceNode(context, {
					loop: false,
					buffer: this.audioBufferCache,
				});
			}
			case "loop": {
				return new AudioBufferSourceNode(context, {
					loop: true,
					loopStart:
						this.sample.loopStartSeconds +
						this.startAddressOffset / this.sample.rate,
					loopEnd:
						this.sample.loopEndSeconds +
						this.endLoopAddressOffset / this.sample.rate,
					buffer: this.audioBufferCache,
				});
			}
			case "loop_until_key_off": {
				console.warn("NIY: loop_until_key_off sample mode", this);
				return new AudioBufferSourceNode(context, {
					loop: true,
					loopStart:
						this.sample.loopStartSeconds +
						this.startAddressOffset / this.sample.rate,
					loopEnd:
						this.sample.loopEndSeconds +
						this.endLoopAddressOffset / this.sample.rate,
					buffer: this.audioBufferCache,
				});
			}
		}
	}
}

export function createInstrumentEntry(
	instrumentZoneBuilder: InstrumentZoneBuilder,
	presetZoneBuilder: ZoneBuilder,
): InstrumentEntry {
	assertNotNullish(
		instrumentZoneBuilder.sample,
		"InstrumentEntry: sample is null",
	);

	return new InstrumentEntry({
		sampleMode: instrumentZoneBuilder.sampleMode,
		keyRange: new Range(
			Math.max(
				instrumentZoneBuilder.keyRange.min,
				presetZoneBuilder.keyRange.min,
			),
			Math.min(
				instrumentZoneBuilder.keyRange.max,
				presetZoneBuilder.keyRange.max,
			),
		),
		velocityRange: new Range(
			Math.max(
				instrumentZoneBuilder.velocityRange.min,
				presetZoneBuilder.velocityRange.min,
			),
			Math.min(
				instrumentZoneBuilder.velocityRange.max,
				presetZoneBuilder.velocityRange.max,
			),
		),
		volumeEnvelope: instrumentZoneBuilder.volumeEnvelope,
		initialFilterCutoffFrequency:
			instrumentZoneBuilder.initialFilterCutoffFrequency,
		initialFilterQ: instrumentZoneBuilder.initialFilterQ,
		sample: instrumentZoneBuilder.sample,
		startAddressOffset:
			instrumentZoneBuilder.startLoopAddressCoarseOffset * 32768 +
			instrumentZoneBuilder.startAddressFineOffset,
		endAddressOffset:
			instrumentZoneBuilder.endLoopAddressCoarseOffset * 32768 +
			instrumentZoneBuilder.endAddressFineOffset,
		endLoopAddressOffset:
			instrumentZoneBuilder.endLoopAddressCoarseOffset * 32768 +
			instrumentZoneBuilder.endLoopAddressFineOffset,
		coarseTune: instrumentZoneBuilder.coarseTune,
		fineTune: instrumentZoneBuilder.fineTune,
		scaleTuning: instrumentZoneBuilder.scaleTuning,
		rootKey:
			instrumentZoneBuilder.overridingRootKey ??
			instrumentZoneBuilder.sample?.key ??
			60,
	});
}
