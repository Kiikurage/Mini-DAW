import { assertNotNullish, minmax } from "../lib.ts";
import type { Sample } from "./Sample.ts";
import { type IGEN, type PGEN, SFGenerator } from "./sf2.ts";
import { type Zone, ZoneImpl } from "./Zone.ts";

export interface InstrumentZone extends Zone {
	/**
	 * サンプルの開始位置オフセット。サンプルに本来設定されている開始位置に対して加算される。
	 */
	readonly startAddressFineOffset: number;

	/**
	 * サンプルの終了位置オフセット。サンプルに本来設定されている終了位置に対して加算される。
	 */
	readonly endAddressFineOffset: number;

	/**
	 * サンプルのループ開始位置オフセット。サンプルに本来設定されているループ開始位置に対して加算される。
	 */
	readonly startLoopAddressFineOffset: number;

	/**
	 * サンプルのループ終了位置オフセット。サンプルに本来設定されているループ終了位置に対して加算される。
	 * ループ範囲は半開区間であり、ループ終了地点のサンプル点は再生されないことに注意。
	 * 例えば、ループ開始が1000、ループ終了が2000の場合、1000から1999までのサンプル点がループ再生される。
	 * 2000番のサンプル点はループ再生には含まれない。
	 */
	readonly endLoopAddressFineOffset: number;

	/**
	 * サンプルの開始位置の粗調整オフセット。サンプルに本来設定されている開始位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、startAddressCoarseOffsetが1の場合、32768サンプル分開始位置が後ろにずれる。
	 */
	readonly startAddressCoarseOffset: number;

	/**
	 * サンプルの終了位置の粗調整オフセット。サンプルに本来設定されている終了位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、endAddressCoarseOffsetが1の場合、32768サンプル分終了位置が後ろにずれる。
	 */
	readonly endAddressCoarseOffset: number;

	/**
	 * サンプルのループ開始位置の粗調整オフセット。サンプルに本来設定されているループ開始位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、startLoopAddressCoarseOffsetが1の場合、32768サンプル分ループ開始位置が後ろにずれる。
	 */
	readonly startLoopAddressCoarseOffset: number;

	/**
	 * サンプルのループ終了位置の粗調整オフセット。サンプルに本来設定されているループ終了位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、endLoopAddressCoarseOffsetが1の場合、32768サンプル分ループ終了位置が後ろにずれる。
	 */
	readonly endLoopAddressCoarseOffset: number;

	/**
	 * このゾーンが属する排他グループのクラス番号
	 * 同じ番号を持つゾーンは同時に複数再生できず、新しいゾーンが再生されると既存のゾーンの再生が停止される
	 * 0の場合は排他グループに属さない
	 */
	readonly exclusiveClass: number;

	/**
	 * このゾーンが参照するサンプル
	 */
	readonly sample: Sample | null;

	/**
	 * サンプルの再生モード
	 */
	readonly sampleMode: "no_loop" | "loop" | "loop_until_key_off";

	/**
	 * ルートキーの上書き [0-127]
	 * nullの場合、{@link Sample#key}が使用される
	 */
	readonly overridingRootKey: number | null;

	readonly startAddressOffset: number;

	readonly endAddressOffset: number;

	readonly startLoopAddressOffset: number;

	readonly endLoopAddressOffset: number;

	/**
	 * このゾーンのルートキー(サンプルの基準となるMIDIキー番号)
	 */
	readonly rootKey: number;

	getTuneForKey(key: number): number;

	createAudioBufferSourceNode(
		context: AudioContext,
	): AudioBufferSourceNode | null;
}

export class InstrumentZoneImpl extends ZoneImpl implements InstrumentZone {
	/**
	 * サンプルの開始位置オフセット。サンプルに本来設定されている開始位置に対して加算される。
	 */
	startAddressFineOffset = 0;

	/**
	 * サンプルの終了位置オフセット。サンプルに本来設定されている終了位置に対して加算される。
	 */
	endAddressFineOffset = 0;

	/**
	 * サンプルのループ開始位置オフセット。サンプルに本来設定されているループ開始位置に対して加算される。
	 */
	startLoopAddressFineOffset = 0;

	/**
	 * サンプルのループ終了位置オフセット。サンプルに本来設定されているループ終了位置に対して加算される。
	 * ループ範囲は半開区間であり、ループ終了地点のサンプル点は再生されないことに注意。
	 * 例えば、ループ開始が1000、ループ終了が2000の場合、1000から1999までのサンプル点がループ再生される。
	 * 2000番のサンプル点はループ再生には含まれない。
	 */
	endLoopAddressFineOffset = 0;

	/**
	 * サンプルの開始位置の粗調整オフセット。サンプルに本来設定されている開始位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、startAddressCoarseOffsetが1の場合、32768サンプル分開始位置が後ろにずれる。
	 */
	startAddressCoarseOffset = 0;

	/**
	 * サンプルの終了位置の粗調整オフセット。サンプルに本来設定されている終了位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、endAddressCoarseOffsetが1の場合、32768サンプル分終了位置が後ろにずれる。
	 */
	endAddressCoarseOffset = 0;

	/**
	 * サンプルのループ開始位置の粗調整オフセット。サンプルに本来設定されているループ開始位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、startLoopAddressCoarseOffsetが1の場合、32768サンプル分ループ開始位置が後ろにずれる。
	 */
	startLoopAddressCoarseOffset = 0;

	/**
	 * サンプルのループ終了位置の粗調整オフセット。サンプルに本来設定されているループ終了位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、endLoopAddressCoarseOffsetが1の場合、32768サンプル分ループ終了位置が後ろにずれる。
	 */
	endLoopAddressCoarseOffset = 0;

	/**
	 * このゾーンが属する排他グループのクラス番号
	 * 同じ番号を持つゾーンは同時に複数再生できず、新しいゾーンが再生されると既存のゾーンの再生が停止される
	 * 0の場合は排他グループに属さない
	 */
	exclusiveClass = 0;

	/**
	 * このゾーンが参照するサンプル
	 */
	sample: Sample | null = null;

	/**
	 * サンプルの再生モード
	 */
	sampleMode: "no_loop" | "loop" | "loop_until_key_off" = "no_loop";

	/**
	 * ルートキーの上書き [0-127]
	 * nullの場合、{@link Sample#key}が使用される
	 */
	overridingRootKey: number | null = null;

	get startAddressOffset() {
		return (
			this.startLoopAddressCoarseOffset * 32768 + this.startAddressFineOffset
		);
	}

	get endAddressOffset() {
		return this.endLoopAddressCoarseOffset * 32768 + this.endAddressFineOffset;
	}

	get startLoopAddressOffset() {
		return (
			this.startLoopAddressCoarseOffset * 32768 +
			this.startLoopAddressFineOffset
		);
	}

	get endLoopAddressOffset() {
		return (
			this.endLoopAddressCoarseOffset * 32768 + this.endLoopAddressFineOffset
		);
	}

	/**
	 * このゾーンのルートキー(サンプルの基準となるMIDIキー番号)
	 */
	get rootKey(): number {
		return this.overridingRootKey ?? this.sample?.key ?? 60;
	}

	/**
	 * 指定されたMIDIキーに対するピッチ調整倍率を取得する
	 */
	getTuneForKey(key: number): number {
		return this.tune * this.scaleTuning ** (key - this.rootKey);
	}

	copy(): InstrumentZoneImpl {
		const zone = new InstrumentZoneImpl();
		Object.assign(zone, this);
		return zone;
	}

	override applyGenerator(
		gen: IGEN | PGEN,
		getSample: (sampleNumber: number) => Sample | null,
	) {
		switch (gen.generator) {
			case SFGenerator.START_ADDRESS_OFFSET: {
				this.startAddressFineOffset = minmax(
					0,
					null,
					gen.amount.getInt16(0, true),
				);
				break;
			}
			case SFGenerator.END_ADDRESS_OFFSET: {
				this.endAddressFineOffset = minmax(
					null,
					0,
					gen.amount.getInt16(0, true),
				);
				break;
			}
			case SFGenerator.START_LOOP_ADDRESS_OFFSET: {
				this.startLoopAddressFineOffset = gen.amount.getInt16(0, true);
				break;
			}
			case SFGenerator.END_LOOP_ADDRESS_OFFSET: {
				this.endLoopAddressFineOffset = gen.amount.getInt16(0, true);
				break;
			}
			case SFGenerator.START_ADDRESS_COARSE_OFFSET: {
				this.startAddressCoarseOffset = minmax(
					0,
					null,
					gen.amount.getInt16(0, true),
				);
				break;
			}
			case SFGenerator.END_ADDRESS_COARSE_OFFSET: {
				this.endAddressCoarseOffset = minmax(
					null,
					0,
					gen.amount.getInt16(0, true),
				);
				break;
			}
			case SFGenerator.START_LOOP_ADDRESS_COARSE_OFFSET: {
				this.startLoopAddressCoarseOffset = gen.amount.getInt16(0, true);
				break;
			}
			case SFGenerator.END_LOOP_ADDRESS_COARSE_OFFSET: {
				this.endLoopAddressCoarseOffset = gen.amount.getInt16(0, true);
				break;
			}
			case SFGenerator.SAMPLE_ID: {
				if (!(this instanceof InstrumentZoneImpl)) break;
				const sampleNumber = gen.amount.getUint16(0, true);
				const sample = getSample(sampleNumber);
				assertNotNullish(sample);
				this.sample = sample;
				break;
			}
			case SFGenerator.SAMPLE_MODES: {
				// サンプルの再生モード（ループ設定など）TODO
				const rawValue = gen.amount.getUint8(0);
				switch (rawValue & 0b11) {
					case 0: // no loop
						this.sampleMode = "no_loop";
						break;
					case 1: // continuous loop
						this.sampleMode = "loop";
						break;
					case 2: // unused
						break;
					case 3: // loop until key off
						this.sampleMode = "loop_until_key_off";
						break;
				}
				break;
			}
			case SFGenerator.EXCLUSIVE_CLASS: {
				this.exclusiveClass = gen.amount.getUint16(0, true);
				break;
			}
			case SFGenerator.OVERRIDING_ROOT_KEY: {
				this.overridingRootKey = minmax(0, 127, gen.amount.getUint16(0, true));
				break;
			}
			default: {
				super.applyGenerator(gen);
			}
		}
	}

	private audioBuffer: AudioBuffer | null = null;

	createAudioBufferSourceNode(
		context: AudioContext,
	): AudioBufferSourceNode | null {
		if (this.sample === null) return null;

		if (this.audioBuffer === null) {
			this.audioBuffer = new AudioBuffer({
				length:
					this.sample.sample.length -
					this.startAddressOffset +
					this.endAddressOffset,
				numberOfChannels: 1,
				sampleRate: this.sample.rate,
			});
			this.audioBuffer.copyToChannel(
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
					buffer: this.audioBuffer,
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
					buffer: this.audioBuffer,
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
					buffer: this.audioBuffer,
				});
			}
		}
	}
}
