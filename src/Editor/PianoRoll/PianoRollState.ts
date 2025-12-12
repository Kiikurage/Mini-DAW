import { TICK_PER_MEASURE } from "../../constants.ts";

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
	 * 表示領域の幅 [px]
	 */
	readonly width: number;

	/**
	 * 表示領域の高さ [px]
	 */
	readonly height: number;

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
			width: number;
			height: number;
			hoveredNoteIds: ReadonlySet<number>;
			cursor: string;
			marqueeAreaFrom: null | { key: number; tick: number };
			marqueeAreaTo: null | { key: number; tick: number };
		} = {
			previewChannelIds: new Set(),
			mutedChannelIds: new Set(),
			quantizeUnitInTick: TICK_PER_MEASURE / 16,
			newNoteDurationInTick: TICK_PER_MEASURE / 4,
			width: 0,
			height: 0,
			hoveredNoteIds: new Set(),
			cursor: "default",
			marqueeAreaFrom: null,
			marqueeAreaTo: null,
		},
	) {
		this.previewChannelIds = props.previewChannelIds;
		this.mutedChannelIds = props.mutedChannelIds;
		this.quantizeUnitInTick = props.quantizeUnitInTick;
		this.newNoteDurationInTick = props.newNoteDurationInTick;
		this.width = props.width;
		this.height = props.height;
		this.hoveredNoteIds = props.hoveredNoteIds;
		this.cursor = props.cursor;
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

	setSize(width: number, height: number) {
		if (this.width === width && this.height === height) return this;

		return new PianoRollState({
			...this,
			width,
			height,
		});
	}

	setCursor(cursor: string) {
		if (this.cursor === cursor) return this;
		return new PianoRollState({ ...this, cursor });
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
