import { NUM_KEYS } from "../../constants.ts";
import { ComponentKey } from "../../Dependency/DIContainer.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import type {
	InstrumentStore,
	InstrumentStoreState,
} from "../../InstrumentStore.ts";
import { minmax } from "../../lib.ts";
import type { Song } from "../../models/Song.ts";
import type { SongStore } from "../../SongStore.ts";
import { Stateful } from "../../Stateful/Stateful.ts";
import type { Editor, EditorState } from "../Editor.ts";
import { PianoRollHoverNotesManager } from "./PianoRollHoverNotesManager.ts";
import { HEIGHT_PER_KEY, TIMELINE_HEIGHT } from "./PianoRollViewRenderer.ts";

export interface PianoRollState {
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
}

export class PianoRoll extends Stateful<PianoRollState> {
	static readonly Key = ComponentKey.of(PianoRoll);

	readonly hoverNotesManager: PianoRollHoverNotesManager;

	constructor(
		private readonly instrumentStore: InstrumentStore,
		private readonly songStore: SongStore,
		private readonly editor: Editor,
	) {
		super({
			cursor: "default",
			height: 0,
			scrollTop: 0,
		});

		this.hoverNotesManager = new PianoRollHoverNotesManager(
			this.editor,
			this,
			this.songStore,
			this.instrumentStore,
		);
	}

	setHeight(height: number) {
		this.updateState((state) => {
			if (state.height === height) return state;
			return { ...state, height };
		});
	}

	setScrollTop(scrollTop: number) {
		this.updateState((state) => {
			// DOM APIはスクロール位置として常に整数を返すため、小数点以下の比較を省かないと、更新が無限に発生する
			const oldValue = Math.round(state.scrollTop);
			const newValue = Math.round(
				minmax(
					0,
					NUM_KEYS * HEIGHT_PER_KEY - (state.height - TIMELINE_HEIGHT),
					scrollTop,
				),
			);

			if (oldValue === newValue) return state;

			return { ...state, scrollTop: newValue };
		});
	}

	setCursor(cursor: string) {
		if (this.hoverNotesManager.isUpdateDisabled) return;
		this.updateState((state) => {
			if (state.cursor === cursor) return state;
			return { ...state, cursor };
		});
	}

	get noLoopKeys(): ReadonlySet<number> {
		return getNoLoopKeys(
			this.editor.state,
			this.songStore.state,
			this.instrumentStore.state,
		);
	}
}

export function getNoLoopKeys(
	editorState: EditorState,
	song: Song,
	instrumentStoreState: InstrumentStoreState,
): ReadonlySet<number> {
	const activeChannel = getActiveChannel(song, editorState);
	if (activeChannel === null) return new Set();

	const instrument = instrumentStoreState.get(activeChannel.instrumentKey);
	if (instrument?.status !== "fulfilled") return new Set();

	return instrument.value.noLoopKeys;
}
