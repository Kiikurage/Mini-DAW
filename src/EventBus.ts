import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { Channel, ChannelPatch } from "./models/Channel.ts";
import type { Note } from "./models/Note.ts";
import type { Song, SongPatch } from "./models/Song.ts";
import { EventEmitter } from "./Stateful/EventEmitter.ts";

interface EventBusEventMap {
	/**
	 * 曲データの設定
	 */
	"song.set": [song: Song];

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
	"channel.delete": [channelId: number];

	/**
	 * チャンネルのプロパティの変更
	 */
	"channel.update": [channelId: number, patch: ChannelPatch];

	/**
	 * ノートの追加または更新
	 */
	"notes.set": [channelId: number, notes: Iterable<Note>];

	/**
	 * ノートの削除
	 */
	"notes.delete": [channelId: number, noteIds: Iterable<number>];
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
