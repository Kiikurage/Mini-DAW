import type { Envelope } from "./Envelope.ts";
import type { Range } from "./Range.ts";

/**
 * パース済みのSoundFont2のInstrumentZoneを表すデータクラス。
 * 各種プロパティや波形データはアクセスしやすい形に変換されている。
 */
export class InstrumentZone {
	readonly keyRange: Range;
	readonly velocityRange: Range;
	readonly volumeEnvelope: Envelope;
	readonly initialFilterCutoffFrequency: number;

	/**
	 * フィルタのQ値 [dB]
	 */
	readonly initialFilterQ: number;

	/**
	 * ピッチの調整値 [cent]
	 */
	private readonly tune: number;

	/**
	 * ピッチの調整値 [cent/octave]
	 */
	private readonly scaleTuning: number;

	/**
	 * このゾーンのルートキー(サンプルの基準となるMIDIキー番号)
	 */
	private readonly rootKey: number;

	readonly sample: Float32Array<ArrayBuffer>;
	readonly sampleRate: number;
	readonly sampleMode: "no_loop" | "loop" | "loop_until_key_off";
	readonly loopStartIndex: number;
	readonly loopEndIndex: number;

	constructor(props: {
		keyRange: Range;
		velocityRange: Range;
		volumeEnvelope: Envelope;
		initialFilterCutoffFrequency: number;
		initialFilterQ: number;
		tune: number;
		scaleTuning: number;
		rootKey: number;
		sample: Float32Array<ArrayBuffer>;
		sampleRate: number;
		sampleMode: "no_loop" | "loop" | "loop_until_key_off";
		loopStartIndex: number;
		loopEndIndex: number;
	}) {
		this.keyRange = props.keyRange;
		this.velocityRange = props.velocityRange;
		this.volumeEnvelope = props.volumeEnvelope;
		this.initialFilterCutoffFrequency = props.initialFilterCutoffFrequency;
		this.initialFilterQ = props.initialFilterQ;
		this.tune = props.tune;
		this.scaleTuning = props.scaleTuning;
		this.rootKey = props.rootKey;
		this.sample = props.sample;
		this.sampleRate = props.sampleRate;
		this.sampleMode = props.sampleMode;
		this.loopStartIndex = props.loopStartIndex;
		this.loopEndIndex = props.loopEndIndex;
	}

	/**
	 * サンプルを指定されたキーで再生する際に必要なピッチ調整値 [cents] を取得する
	 * @param key
	 */
	getTuneForKey(key: number): number {
		return this.tune + this.scaleTuning * (key - this.rootKey);
	}
}
