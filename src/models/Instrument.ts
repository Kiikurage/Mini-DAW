import type { InstrumentKey } from "./InstrumentKey.ts";

/**
 * 音声の生成を担当するインターフェース
 */
export interface Instrument {
	/**
	 * 楽器識別用のキー
	 */
	readonly key: InstrumentKey;

	/**
	 * 楽器の表示名
	 */
	readonly name: string;

	/**
	 * ループしない音のキー番号の集合
	 * @param key
	 */
	readonly noLoopKeys: ReadonlySet<number>;

	/**
	 * 指定した音を再生する
	 * @param note.key MIDIキー番号
	 * @param note.velocity 音の強さ
	 * @param note.time 再生開始する時間[秒]。オーディオコンテキストのグローバルタイムで指定する。
	 * 未指定の場合は即時再生される。現在時刻より前の時刻を指定した場合は何もしない。
	 */
	noteOn(note: { key: number; velocity: number; time?: number }): void;

	/**
	 * 指定した音を停止する。指定した音が再生されていない場合は何もしない。
	 * @param note.key MIDIキー番号
	 * @param note.time 音を止める時刻[秒]。オーディオコンテキストのグローバルタイムで指定する。
	 * 未指定の場合は即時停止される。現在時刻より前の時刻を指定した場合は何もしない。
	 */
	noteOff(note: { key: number; time?: number }): void;

	/**
	 * 全ての音を即時停止する。
	 */
	reset(): void;
}
