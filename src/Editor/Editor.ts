import { TICK_PER_MEASURE } from "../constants.ts";
import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import { getActiveChannel } from "../getActiveChannel.ts";
import { getMarqueeArea } from "../getMarqueeArea.ts";
import { minmax } from "../lib.ts";
import type { Note } from "../models/Note.ts";
import type { Player } from "../Player/Player.ts";
import type { SongStore } from "../SongStore.ts";
import { Stateful } from "../Stateful/Stateful.ts";
import { widthPerTick } from "./ParameterEditor/ParameterEditorViewRenderer.ts";

/**
 * PianoRollとParameterEditorとで共有される状態。
 * 各サブコンポーネント固有の状態はここではなく、個別にサブコンポーネントのStateで管理する。
 */
export interface EditorState {
	/**
	 * 新規に挿入されるノートのデフォルトの長さ
	 */
	readonly newNoteDurationInTick: number;

	/**
	 * 参照用に表示するチャンネルID一覧
	 */
	readonly previewChannelIds: ReadonlySet<number>;

	/**
	 * 編集中のチャンネルID
	 */
	readonly activeChannelId: number | null;

	/**
	 * ズーム率
	 */
	readonly zoom: number;

	/**
	 * エディタの表示幅 [px]
	 */
	readonly width: number;

	/**
	 * スクロール位置(水平) [px]
	 */
	readonly scrollLeft: number;

	/**
	 * 選択されているノートのID一覧
	 */
	readonly selectedNoteIds: ReadonlySet<number>;

	/**
	 * 時間方向の最小グリッド単位 [tick]
	 */
	readonly timelineGridUnitInTick: number;

	/**
	 * クオンタイズ単位 [tick]
	 */
	readonly quantizeUnitInTick: number;

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
}

export class Editor extends Stateful<EditorState> {
	static readonly Key = ComponentKey.of(Editor);

	constructor(
		private readonly songStore: SongStore,
		player: Player,
		bus: EventBus,
	) {
		super({
			newNoteDurationInTick: TICK_PER_MEASURE / 4,
			previewChannelIds: new Set<number>(),
			activeChannelId: null,
			zoom: 1,
			width: 0,
			scrollLeft: 0,
			selectedNoteIds: new Set<number>(),
			timelineGridUnitInTick: TICK_PER_MEASURE / 4,
			quantizeUnitInTick: TICK_PER_MEASURE / 16,
			marqueeAreaFrom: null,
			marqueeAreaTo: null,
		});

		player.addChangeListener((state) => {
			if (!state.isAutoScrollEnabled) return;

			const playHeadX = state.currentTick * widthPerTick(this.state.zoom);
			const scrollLeft = minmax(
				playHeadX - this.state.width / 2,
				playHeadX,
				this.state.scrollLeft,
			);

			this.setScrollLeft(scrollLeft);
		});

		bus
			.on("song.put.before", () => {
				this.setActiveChannel(null);
			})
			.on("song.put.after", (song) => {
				const firstChannel = song.channels[0];
				if (firstChannel !== undefined) {
					this.setActiveChannel(firstChannel.id);
				}
			})
			.on("channel.remove.before", (channelId: number) => {
				if (this.state.activeChannelId === channelId) {
					this.setActiveChannel(null);
				}
				this.cancelPreviewChannel(channelId);
			})
			.on("notes.remove.before", (channelId, noteIds) => {
				if (this.state.activeChannelId === channelId) {
					this.unselectNotes(noteIds);
				}
			});
	}

	setActiveChannel(activeChannelId: number | null) {
		this.updateState((state) => {
			if (state.activeChannelId === activeChannelId) return state;
			return { ...state, activeChannelId };
		});
	}

	togglePreviewChannel(channelId: number) {
		this.updateState((state) => {
			const previewChannelIds = new Set(state.previewChannelIds);
			if (previewChannelIds.has(channelId)) {
				previewChannelIds.delete(channelId);
			} else {
				previewChannelIds.add(channelId);
			}
			return { ...state, previewChannelIds };
		});
	}

	cancelPreviewChannel(channelId: number) {
		this.updateState((state) => {
			if (!state.previewChannelIds.has(channelId)) return state;
			const previewChannelIds = new Set(state.previewChannelIds);
			previewChannelIds.delete(channelId);
			return { ...state, previewChannelIds };
		});
	}

	startMarqueeSelection(position: { key: number; tick: number }) {
		this.updateState((state) => {
			if (
				state.marqueeAreaFrom === position &&
				state.marqueeAreaTo === position
			)
				return state;
			return { ...state, marqueeAreaFrom: position, marqueeAreaTo: position };
		});
	}

	setMarqueeAreaTo(position: null | { key: number; tick: number }) {
		this.updateState((state) => {
			if (state.marqueeAreaTo === position) return state;
			return { ...state, marqueeAreaTo: position };
		});
	}

	*findNotesInMarqueeArea(): Generator<Note> {
		const activeChannel = getActiveChannel(this.songStore.state, this.state);
		if (activeChannel === null) return;

		const area = getMarqueeArea(
			this.state.marqueeAreaFrom,
			this.state.marqueeAreaTo,
		);
		if (area === null) return;

		for (const note of activeChannel.notes.values()) {
			if (note.key < area.keyFrom) continue;
			if (area.keyTo <= note.key) continue;
			if (area.tickTo <= note.tickFrom) continue;
			if (note.tickTo <= area.tickFrom) continue;
			yield note;
		}
	}

	stopMarqueeSelection() {
		this.updateState((state) => {
			if (state.marqueeAreaFrom === null && state.marqueeAreaTo === null)
				return state;
			return { ...state, marqueeAreaFrom: null, marqueeAreaTo: null };
		});
	}

	setWidth(width: number) {
		this.updateState((state) => {
			if (state.width === width) return state;
			return { ...state, width };
		});
	}

	setScrollLeft(scrollLeft: number) {
		this.updateState((state) => {
			// DOM APIはスクロール位置として常に整数を返すため、小数点以下の比較を省かないと、更新が無限に発生する
			const oldValue = Math.round(state.scrollLeft);
			const newValue = Math.round(minmax(0, null, scrollLeft));

			if (oldValue === newValue) return state;

			return { ...state, scrollLeft: newValue };
		});
	}

	setAllSelectedNotes(selectedNoteIds: Iterable<number>) {
		this.updateState((state) => {
			const newSelectedNoteIds = new Set(selectedNoteIds);
			if (
				newSelectedNoteIds.size === state.selectedNoteIds.size &&
				[...selectedNoteIds].every((id) => state.selectedNoteIds.has(id))
			) {
				return state;
			}

			return { ...state, selectedNoteIds: newSelectedNoteIds };
		});
	}

	selectAllNotes() {
		const activeChannel = getActiveChannel(this.songStore.state, this.state);
		if (activeChannel === null) return;

		this.setAllSelectedNotes(
			activeChannel.notes.values().map((note) => note.id),
		);
	}

	clearSelectedNotes() {
		this.setAllSelectedNotes([]);
	}

	selectNotes(noteIds: readonly number[]) {
		const selectedNoteIds = new Set(this.state.selectedNoteIds);
		for (const noteId of noteIds) {
			selectedNoteIds.add(noteId);
		}
		if (selectedNoteIds.size === this.state.selectedNoteIds.size) {
			return this.state;
		}

		this.setAllSelectedNotes(selectedNoteIds);
	}

	unselectNotes(noteIds: Iterable<number>) {
		const selectedNoteIds = new Set(this.state.selectedNoteIds);
		for (const noteId of noteIds) {
			selectedNoteIds.delete(noteId);
		}
		if (selectedNoteIds.size === this.state.selectedNoteIds.size) {
			return this.state;
		}

		this.setAllSelectedNotes(selectedNoteIds);
	}

	zoomIn() {
		this.setZoom(this.state.zoom * 1.2);
	}

	zoomOut() {
		this.setZoom(this.state.zoom / 1.2);
	}

	setZoom(zoom: number) {
		this.updateState((state) => {
			const center =
				(this.state.scrollLeft + this.state.width / 2) /
				widthPerTick(this.state.zoom);
			const scrollLeft = center * widthPerTick(zoom) - this.state.width / 2;

			return { ...state, zoom, scrollLeft };
		});
	}

	setNewNoteDuration(newNoteDurationInTick: number) {
		this.updateState((state) => {
			if (state.newNoteDurationInTick === newNoteDurationInTick) return state;

			return { ...state, newNoteDurationInTick };
		});
	}

	setTimelineGridUnit(timelineGridUnitInTick: number) {
		this.updateState((state) => {
			if (state.timelineGridUnitInTick === timelineGridUnitInTick) return state;
			return { ...state, timelineGridUnitInTick };
		});
	}

	setQuantizeUnit(quantizeUnitInTick: number) {
		this.updateState((state) => {
			if (state.quantizeUnitInTick === quantizeUnitInTick) return state;
			return { ...state, quantizeUnitInTick };
		});
	}
}
