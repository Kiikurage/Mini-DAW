import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { Channel, ChannelPatch } from "./models/Channel.ts";
import type { ControlChange } from "./models/ControlChange.ts";
import type { ControlType } from "./models/ControlType.ts";
import type { Note } from "./models/Note.ts";
import type { Song, SongPatch } from "./models/Song.ts";
import { EventEmitter } from "./Stateful/EventEmitter.ts";

interface EventBusEventMap {
	/**
	 * 曲データの設定
	 */
	"song.put": [song: Song];

	/**
	 * 曲のプロパティの変更
	 */
	"song.update": [patch: SongPatch];

	/**
	 * チャンネルの追加
	 */
	"channel.add": [channel: Channel];

	/**
	 * チャンネルの削除
	 */
	"channel.remove": [channelId: number];

	/**
	 * チャンネルのプロパティの変更
	 */
	"channel.update": [channelId: number, patch: ChannelPatch];

	/**
	 * ノートの追加または置換
	 */
	"notes.put": [channelId: number, notes: Iterable<Note>];

	/**
	 * ノートの削除
	 */
	"notes.remove": [channelId: number, noteIds: Iterable<number>];

	/**
	 * コントロールチェンジの追加または置換
	 */
	"control.put": [
		args: {
			channelId: number;
			type: ControlType;
			changes: Iterable<ControlChange>;
		},
	];

	/**
	 * コントロールチェンジの削除
	 */
	"control.remove": [
		args: {
			channelId: number;
			type: ControlType;
			ticks: Iterable<number>;
		},
	];
}

type PhasedEvents<E> = {
	[K in keyof E as K extends string
		? `${K}.before` | K | `${K}.after`
		: never]: E[K];
};

/**
 * アプリケーション全体で使用されるドメインモデルの変更に関するイベントバス
 *
 * 各イベントは、ドメインモデル変更の前、中、後に発火される3種類のイベントからなる
 *
 * - `XXX.before` イベント: 変更が適用される前に発火される。
 * 		- 変更に伴う副作用のうち、事前に処理しておく必要があるものはこのイベントで処理する。
 * 			- 例: 変更の妨げとなる状態のクリーンアップ
 * - `XXX` イベント: 変更が適用された直後に発火される
 * 		- 変更そのものを取り扱う。通常、ドメインモデルを所有するコンポーネントのみがこのイベントを処理する。
 * - `XXX.after` イベント: 変更が完全に適用された後に発火される
 * 		- 変更に伴う副作用のうち、事後に処理する必要があるものはこのイベントで処理する。
 * 			- 例: UIの更新、外部システムへの通知など
 */
export class EventBus extends EventEmitter<PhasedEvents<EventBusEventMap>> {
	static readonly Key = ComponentKey.of(EventBus);

	emitPhasedEvents<K extends keyof EventBusEventMap>(
		eventName: K,
		...args: PhasedEvents<EventBusEventMap>[K]
	): void {
		this.emit(`${eventName}.before` as K, ...args);
		this.emit(eventName, ...args);
		this.emit(`${eventName}.after` as K, ...args);
	}
}
