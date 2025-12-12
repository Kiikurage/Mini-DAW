import { TICK_PER_MEASURE } from "../constants.ts";
import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import { Stateful } from "../Stateful/Stateful.ts";

/**
 * PianoRollとParameterEditorとで共有される状態。
 * 各サブコンポーネント固有の状態はここではなく、個別にサブコンポーネントのStateで管理する。
 */
export interface EditorState {
	/**
	 * 編集中のチャンネルID
	 */
	readonly activeChannelId: number | null;

	/**
	 * ズーム率
	 */
	readonly zoom: number;

	/**
	 * スクロール位置(垂直) [px]
	 */
	readonly scrollTop: number;

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
}

export class Editor extends Stateful<EditorState> {
	static readonly Key = ComponentKey.of(Editor);

	constructor(bus: EventBus) {
		super({
			activeChannelId: null,
			zoom: 1,
			scrollLeft: 0,
			scrollTop: 0,
			selectedNoteIds: new Set<number>(),
			timelineGridUnitInTick: TICK_PER_MEASURE / 4,
		});

		bus
			.on("channel.delete.before", (channelId: number) => {
				if (this.state.activeChannelId === channelId) {
					this.setActiveChannel(null);
				}
			})
			.on("notes.delete.before", (channelId, noteIds) => {
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

	setScrollLeft(scrollLeft: number) {
		this.updateState((state) => {
			// DOM APIはスクロール位置として常に整数を返すため、小数点以下の比較を省かないと、更新が無限に発生する
			if (Math.round(state.scrollLeft) === Math.round(scrollLeft)) return state;
			return { ...state, scrollLeft };
		});
	}

	setScrollTop(scrollTop: number) {
		this.updateState((state) => {
			// DOM APIはスクロール位置として常に整数を返すため、小数点以下の比較を省かないと、更新が無限に発生する
			if (Math.round(state.scrollTop) === Math.round(scrollTop)) return state;
			return { ...state, scrollTop };
		});
	}

	unselectAllNotes() {
		this.updateState((state) => {
			if (state.selectedNoteIds.size === 0) return state;
			return { ...state, selectedNoteIds: new Set() };
		});
	}

	setSelectedNotes(selectedNoteIds: Iterable<number>) {
		this.updateState((state) => {
			return { ...state, selectedNoteIds: new Set(selectedNoteIds) };
		});
	}

	selectNotes(noteIds: readonly number[]) {
		this.updateState((state) => {
			const selectedNoteIds = new Set(state.selectedNoteIds);
			for (const noteId of noteIds) {
				selectedNoteIds.add(noteId);
			}
			if (selectedNoteIds.size === state.selectedNoteIds.size) return state;

			return { ...state, selectedNoteIds };
		});
	}

	unselectNotes(noteIds: Iterable<number>) {
		this.updateState((state) => {
			const selectedNoteIds = new Set(state.selectedNoteIds);
			for (const noteId of noteIds) {
				selectedNoteIds.delete(noteId);
			}
			if (selectedNoteIds.size === state.selectedNoteIds.size) return state;

			return { ...state, selectedNoteIds };
		});
	}

	zoomIn() {
		this.updateState((state) => ({ ...state, zoom: state.zoom * 1.2 }));
	}

	zoomOut() {
		this.updateState((state) => ({ ...state, zoom: state.zoom / 1.2 }));
	}

	setZoom(zoom: number) {
		this.updateState((state) => {
			if (state.zoom === zoom) return state;
			return { ...state, zoom };
		});
	}

	setTimelineGridUnit(timelineGridUnitInTick: number) {
		this.updateState((state) => {
			if (state.timelineGridUnitInTick === timelineGridUnitInTick) return state;
			return { ...state, timelineGridUnitInTick };
		});
	}
}
