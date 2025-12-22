import { assertNotNullish, minmax } from "../lib.ts";
import type { Sample } from "./Sample.ts";
import { type IGEN, type PGEN, SFGenerator } from "./sf2.ts";
import {
	applyZoneGenerator,
	createDefaultZoneBuilder,
	type ZoneBuilder,
} from "./ZoneBuilder.ts";

export type InstrumentZoneSampleMode =
	| "no_loop"
	| "loop"
	| "loop_until_key_off";

export interface InstrumentZoneBuilder extends ZoneBuilder {
	/**
	 * サンプルの開始位置オフセット。サンプルに本来設定されている開始位置に対して加算される。
	 */
	startAddressFineOffset: number;

	/**
	 * サンプルの終了位置オフセット。サンプルに本来設定されている終了位置に対して加算される。
	 */
	endAddressFineOffset: number;

	/**
	 * サンプルのループ開始位置オフセット。サンプルに本来設定されているループ開始位置に対して加算される。
	 */
	startLoopAddressFineOffset: number;

	/**
	 * サンプルのループ終了位置オフセット。サンプルに本来設定されているループ終了位置に対して加算される。
	 * ループ範囲は半開区間であり、ループ終了地点のサンプル点は再生されないことに注意。
	 * 例えば、ループ開始が1000、ループ終了が2000の場合、1000から1999までのサンプル点がループ再生される。
	 * 2000番のサンプル点はループ再生には含まれない。
	 */
	endLoopAddressFineOffset: number;

	/**
	 * サンプルの開始位置の粗調整オフセット。サンプルに本来設定されている開始位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、startAddressCoarseOffsetが1の場合、32768サンプル分開始位置が後ろにずれる。
	 */
	startAddressCoarseOffset: number;

	/**
	 * サンプルの終了位置の粗調整オフセット。サンプルに本来設定されている終了位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、endAddressCoarseOffsetが1の場合、32768サンプル分終了位置が後ろにずれる。
	 */
	endAddressCoarseOffset: number;

	/**
	 * サンプルのループ開始位置の粗調整オフセット。サンプルに本来設定されているループ開始位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、startLoopAddressCoarseOffsetが1の場合、32768サンプル分ループ開始位置が後ろにずれる。
	 */
	startLoopAddressCoarseOffset: number;

	/**
	 * サンプルのループ終了位置の粗調整オフセット。サンプルに本来設定されているループ終了位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、endLoopAddressCoarseOffsetが1の場合、32768サンプル分ループ終了位置が後ろにずれる。
	 */
	endLoopAddressCoarseOffset: number;

	/**
	 * このゾーンが属する排他グループのクラス番号
	 * 同じ番号を持つゾーンは同時に複数再生できず、新しいゾーンが再生されると既存のゾーンの再生が停止される
	 * 0の場合は排他グループに属さない
	 */
	exclusiveClass: number;

	/**
	 * このゾーンが参照するサンプル
	 */
	sample: Sample | null;

	/**
	 * サンプルの再生モード
	 */
	sampleMode: InstrumentZoneSampleMode;

	/**
	 * ルートキーの上書き [0-127]
	 * nullの場合、{@link Sample#key}が使用される
	 */
	overridingRootKey: number | null;
}

export function createDefaultInstrumentZoneBuilder(): InstrumentZoneBuilder {
	return {
		...createDefaultZoneBuilder(),
		startAddressFineOffset: 0,
		endAddressFineOffset: 0,
		startLoopAddressFineOffset: 0,
		endLoopAddressFineOffset: 0,
		startAddressCoarseOffset: 0,
		endAddressCoarseOffset: 0,
		startLoopAddressCoarseOffset: 0,
		endLoopAddressCoarseOffset: 0,
		exclusiveClass: 0,
		sample: null,
		sampleMode: "no_loop",
		overridingRootKey: null,
	};
}

export function applyInstrumentZoneGenerator(
	zone: InstrumentZoneBuilder,
	gen: IGEN | PGEN,
) {
	switch (gen.generator) {
		case SFGenerator.START_ADDRESS_OFFSET: {
			zone.startAddressFineOffset = minmax(
				0,
				null,
				gen.amount.getInt16(0, true),
			);
			break;
		}
		case SFGenerator.END_ADDRESS_OFFSET: {
			zone.endAddressFineOffset = minmax(null, 0, gen.amount.getInt16(0, true));
			break;
		}
		case SFGenerator.START_LOOP_ADDRESS_OFFSET: {
			zone.startLoopAddressFineOffset = gen.amount.getInt16(0, true);
			break;
		}
		case SFGenerator.END_LOOP_ADDRESS_OFFSET: {
			zone.endLoopAddressFineOffset = gen.amount.getInt16(0, true);
			break;
		}
		case SFGenerator.START_ADDRESS_COARSE_OFFSET: {
			zone.startAddressCoarseOffset = minmax(
				0,
				null,
				gen.amount.getInt16(0, true),
			);
			break;
		}
		case SFGenerator.END_ADDRESS_COARSE_OFFSET: {
			zone.endAddressCoarseOffset = minmax(
				null,
				0,
				gen.amount.getInt16(0, true),
			);
			break;
		}
		case SFGenerator.START_LOOP_ADDRESS_COARSE_OFFSET: {
			zone.startLoopAddressCoarseOffset = gen.amount.getInt16(0, true);
			break;
		}
		case SFGenerator.END_LOOP_ADDRESS_COARSE_OFFSET: {
			zone.endLoopAddressCoarseOffset = gen.amount.getInt16(0, true);
			break;
		}
		case SFGenerator.SAMPLE_ID: {
			throw new Error(
				"InstrumentZoneBuilder: SAMPLE_ID generator should be handled separately.",
			);
		}
		case SFGenerator.SAMPLE_MODES: {
			const rawValue = gen.amount.getUint8(0);
			switch (rawValue & 0b11) {
				case 0: // no loop
					zone.sampleMode = "no_loop";
					break;
				case 1: // continuous loop
					zone.sampleMode = "loop";
					break;
				case 2: // unused
					break;
				case 3: // loop until key off
					zone.sampleMode = "loop_until_key_off";
					break;
			}
			break;
		}
		case SFGenerator.EXCLUSIVE_CLASS: {
			zone.exclusiveClass = gen.amount.getUint16(0, true);
			break;
		}
		case SFGenerator.OVERRIDING_ROOT_KEY: {
			zone.overridingRootKey = minmax(0, 127, gen.amount.getUint16(0, true));
			break;
		}
		default: {
			applyZoneGenerator(zone, gen);
		}
	}
}
