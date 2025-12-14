import { NUM_KEYS, TICK_PER_MEASURE } from "../../constants.ts";
import { minmax } from "../../lib.ts";
import { HEIGHT_PER_KEY, TIMELINE_HEIGHT } from "./PianoRollViewRenderer.ts";

export interface PianoRollArea {
	keyFrom: number;

	/**
	 * 選択範囲のキー上限(指定されたキーを含まない)
	 */
	keyTo: number;

	tickFrom: number;
	tickTo: number;
}

export class PianoRollState {
	/**
	 * 参照用に表示するチャンネルID一覧
	 */
	readonly previewChannelIds: ReadonlySet<number>;

	/**
	 * ミュートされているチャンネルID一覧
	 */
	readonly mutedChannelIds: ReadonlySet<number>;

	/**
	 * クオンタイズ単位 [tick]
	 */
	readonly quantizeUnitInTick: number;

	/**
	 * 新規に挿入されるノートのデフォルトの長さ
	 */
	readonly newNoteDurationInTick: number;

	/**
	 * 高さ [px]
	 */
	readonly height: number;

	/**
	 * スクロール位置(垂直) [px]
	 */
	readonly scrollTop: number;

	/**
	 * 現在のカーソル状態
	 */
	readonly cursor: string;

	/**
	 * ポインタがホバーしているノートのID
	 */
	readonly hoveredNoteIds: ReadonlySet<number>;

	/**
	 * 範囲選択の開始位置(指定されたキーを含む)
	 *
	 * PianoRollState.marqueeArea.fromが返す座標は、選択範囲の裏返りなどを正規化しているため、
	 * この値とは異なる可能性がある。
	 */
	readonly marqueeAreaFrom: null | { key: number; tick: number };

	/**
	 * 範囲選択の終了位置(指定されたキーを含む)
	 *
	 * PianoRollState.marqueeArea.toが返す座標は、選択範囲の裏返りなどを正規化しているため、
	 * この値とは異なる可能性がある。
	 */
	readonly marqueeAreaTo: null | { key: number; tick: number };

	/**
	 * 範囲選択の範囲
	 */
	get marqueeArea(): null | PianoRollArea {
		if (this.marqueeAreaFrom === null || this.marqueeAreaTo === null) {
			return null;
		}
		return {
			tickFrom: Math.min(this.marqueeAreaFrom.tick, this.marqueeAreaTo.tick),
			tickTo: Math.max(this.marqueeAreaTo.tick, this.marqueeAreaFrom.tick) + 1,
			keyFrom: Math.min(this.marqueeAreaFrom.key, this.marqueeAreaTo.key),
			keyTo: Math.max(this.marqueeAreaTo.key, this.marqueeAreaFrom.key) + 1,
		};
	}

	constructor(
		props: {
			previewChannelIds: ReadonlySet<number>;
			mutedChannelIds: ReadonlySet<number>;
			quantizeUnitInTick: number;
			newNoteDurationInTick: number;
			hoveredNoteIds: ReadonlySet<number>;
			cursor: string;
			height: number;
			scrollTop: number;
			marqueeAreaFrom: null | { key: number; tick: number };
			marqueeAreaTo: null | { key: number; tick: number };
		} = {
			previewChannelIds: new Set(),
			mutedChannelIds: new Set(),
			quantizeUnitInTick: TICK_PER_MEASURE / 16,
			newNoteDurationInTick: TICK_PER_MEASURE / 4,
			hoveredNoteIds: new Set(),
			cursor: "default",
			height: 0,
			scrollTop: 0,
			marqueeAreaFrom: null,
			marqueeAreaTo: null,
		},
	) {
		this.previewChannelIds = props.previewChannelIds;
		this.mutedChannelIds = props.mutedChannelIds;
		this.quantizeUnitInTick = props.quantizeUnitInTick;
		this.newNoteDurationInTick = props.newNoteDurationInTick;
		this.hoveredNoteIds = props.hoveredNoteIds;
		this.cursor = props.cursor;
		this.height = props.height;
		this.scrollTop = props.scrollTop;
		this.marqueeAreaFrom = props.marqueeAreaFrom;
		this.marqueeAreaTo = props.marqueeAreaTo;
	}

	setPreviewChannels(previewChannelIds: Iterable<number>): PianoRollState {
		return new PianoRollState({
			...this,
			previewChannelIds: new Set(previewChannelIds),
		});
	}

	togglePreviewChannel(channelId: number): PianoRollState {
		const previewChannelIds = new Set(this.previewChannelIds);
		if (previewChannelIds.has(channelId)) {
			previewChannelIds.delete(channelId);
		} else {
			previewChannelIds.add(channelId);
		}
		return this.setPreviewChannels(previewChannelIds);
	}

	cancelPreviewChannel(channelId: number): PianoRollState {
		const previewChannelIds = new Set(this.previewChannelIds);
		if (!previewChannelIds.has(channelId)) return this;

		previewChannelIds.delete(channelId);
		return this.setPreviewChannels(previewChannelIds);
	}

	setMutedChannels(mutedChannelIds: Iterable<number>): PianoRollState {
		return new PianoRollState({
			...this,
			mutedChannelIds: new Set(mutedChannelIds),
		});
	}

	toggleMuteChannel(channelId: number): PianoRollState {
		const mutedChannelIds = new Set(this.mutedChannelIds);
		if (mutedChannelIds.has(channelId)) {
			mutedChannelIds.delete(channelId);
		} else {
			mutedChannelIds.add(channelId);
		}
		return this.setMutedChannels(mutedChannelIds);
	}

	cancelMuteChannel(channelId: number): PianoRollState {
		const mutedChannelIds = new Set(this.mutedChannelIds);
		if (!mutedChannelIds.has(channelId)) return this;

		mutedChannelIds.delete(channelId);
		return this.setMutedChannels(mutedChannelIds);
	}

	setQuantizeUnit(quantizeUnitInTick: number): PianoRollState {
		if (this.quantizeUnitInTick === quantizeUnitInTick) return this;

		return new PianoRollState({ ...this, quantizeUnitInTick });
	}

	setCursor(cursor: string) {
		if (this.cursor === cursor) return this;
		return new PianoRollState({ ...this, cursor });
	}

	setHeight(height: number) {
		if (this.height === height) return this;
		return new PianoRollState({ ...this, height });
	}

	setScrollTop(scrollTop: number) {
		// DOM APIはスクロール位置として常に整数を返すため、小数点以下の比較を省かないと、更新が無限に発生する
		const oldValue = Math.round(this.scrollTop);
		const newValue = Math.round(
			minmax(
				0,
				NUM_KEYS * HEIGHT_PER_KEY - (this.height - TIMELINE_HEIGHT),
				scrollTop,
			),
		);

		if (oldValue === newValue) return this;

		return new PianoRollState({ ...this, scrollTop: newValue });
	}

	setHoveredNoteIds(noteIds: ReadonlySet<number>) {
		if (this.hoveredNoteIds === noteIds) return this;
		return new PianoRollState({ ...this, hoveredNoteIds: noteIds });
	}

	setMarqueeAreaFrom(position: null | { key: number; tick: number }) {
		if (this.marqueeAreaFrom === position) return this;
		return new PianoRollState({ ...this, marqueeAreaFrom: position });
	}

	setMarqueeAreaTo(position: null | { key: number; tick: number }) {
		if (this.marqueeAreaTo === position) return this;
		return new PianoRollState({ ...this, marqueeAreaTo: position });
	}

	setNewNoteDurationTick(newNoteDurationInTick: number) {
		if (this.newNoteDurationInTick === newNoteDurationInTick) return this;

		return new PianoRollState({ ...this, newNoteDurationInTick });
	}
}
