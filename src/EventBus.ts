import { ComponentKey } from "./Dependency/DIContainer.ts";
import { EventEmitter } from "./EventEmitter.ts";
import type { CC, CCId } from "./models/CC.ts";
import type { Channel, ChannelId, ChannelPatch } from "./models/Channel.ts";
import type { ControlType } from "./models/ControlType.ts";
import type { MDFile } from "./models/MDFile.ts";
import type { Note, NoteId, NotePatch } from "./models/Note.ts";
import type { SongPatch } from "./models/Song.ts";

interface EventBusEventMap {
	/**
	 * ファイルを開く
	 */
	"file.put": [file: MDFile];

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
	"channel.remove": [channelId: ChannelId];

	/**
	 * チャンネルのプロパティの変更
	 */
	"channel.update": [channelId: ChannelId, patch: ChannelPatch];

	/**
	 * ノートの追加または置換
	 */
	"notes.put": [channelId: ChannelId, notes: Iterable<Note>];

	/**
	 * ノートの更新
	 */
	"notes.update": [patches: Iterable<NotePatch>];

	/**
	 * ノートの削除
	 */
	"notes.remove": [channelId: ChannelId, noteIds: Iterable<NoteId>];

	/**
	 * コントロールチェンジの追加または置換
	 */
	"control.put": [
		args: {
			channelId: ChannelId;
			type: ControlType;
			ccs: Iterable<CC>;
		},
	];

	/**
	 * コントロールチェンジの削除
	 */
	"control.remove": [
		args: {
			channelId: ChannelId;
			type: ControlType;
			ids: Iterable<CCId>;
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
 *        - 変更に伴う副作用のうち、事前に処理しておく必要があるものはこのイベントで処理する。
 *            - 例: 変更の妨げとなる状態のクリーンアップ
 * - `XXX` イベント: 変更が適用された直後に発火される
 *        - 変更そのものを取り扱う。通常、ドメインモデルを所有するコンポーネントのみがこのイベントを処理する。
 * - `XXX.after` イベント: 変更が完全に適用された後に発火される
 *        - 変更に伴う副作用のうち、事後に処理する必要があるものはこのイベントで処理する。
 *            - 例: UIの更新、外部システムへの通知など
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
