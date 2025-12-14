import { TICK_PER_MEASURE } from "../constants.ts";
import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import { minmax } from "../lib.ts";
import { Stateful } from "../Stateful/Stateful.ts";
import { widthPerTick } from "./PianoRoll/PianoRollViewRenderer.ts";

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
}

export class Editor extends Stateful<EditorState> {
	static readonly Key = ComponentKey.of(Editor);

	constructor(bus: EventBus) {
		super({
			activeChannelId: null,
			zoom: 1,
			width: 0,
			scrollLeft: 0,
			selectedNoteIds: new Set<number>(),
			timelineGridUnitInTick: TICK_PER_MEASURE / 4,
		});

		bus
			.on("song.set.before", () => {
				this.setActiveChannel(null);
			})
			.on("song.set.after", (song) => {
				const firstChannel = song.channels[0];
				if (firstChannel !== undefined) {
					this.setActiveChannel(firstChannel.id);
				}
			})
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

	setTimelineGridUnit(timelineGridUnitInTick: number) {
		this.updateState((state) => {
			if (state.timelineGridUnitInTick === timelineGridUnitInTick) return state;
			return { ...state, timelineGridUnitInTick };
		});
	}
}
