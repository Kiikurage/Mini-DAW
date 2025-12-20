import { MouseEventButton, NUM_KEYS } from "../../constants.ts";
import { getSelectedNotes } from "../../getSelectedNotes.ts";
import { minmax, quantize } from "../../lib.ts";
import { Note } from "../../models/Note.ts";
import type { PEMPointerEvent } from "../../PointerEventManager/PointerEventManager.ts";
import type { PointerEventManagerInteractionHandle } from "../../PointerEventManager/PointerEventManagerInteractionHandle.ts";
import type { PositionSnapshot } from "../../PointerEventManager/PositionSnapshot.ts";
import type { SongStore } from "../../SongStore.ts";
import type { RemoveNotes } from "../../usecases/RemoveNotes.ts";
import type { SetNotes } from "../../usecases/SetNotes.ts";
import {
	type Editor,
	type EditorState,
	getSelectedNoteIds,
} from "../Editor.ts";
import { widthPerTick } from "../ParameterEditor/ParameterEditorViewRenderer.ts";
import type { PianoRoll, PianoRollState } from "./PianoRoll.ts";
import type { PianoRollPreviewManager } from "./PianoRollPreviewManager.ts";
import {
	HEIGHT_PER_KEY,
	SIDEBAR_WIDTH,
	TIMELINE_HEIGHT,
} from "./PianoRollViewRenderer.ts";

/**
 * カーソルを変更する
 * @param context.pianoRoll
 */
export function setCursorFeature(context: {
	pianoRoll: PianoRoll;
	cursor: string;
}): PointerEventManagerInteractionHandle {
	const { pianoRoll, cursor } = context;

	return {
		handlePointerMove: () => {
			pianoRoll.setCursor(cursor);
		},
	};
}

/**
 * ノートを移動する
 * @param context.editor
 * @param context.songStore
 * @param context.setNotes
 * @param context.pianoRoll
 */
export function moveNotesFeature(context: {
	editor: Editor;
	songStore: SongStore;
	setNotes: SetNotes;
	pianoRoll: PianoRoll;
	previewManager: PianoRollPreviewManager;
}): PointerEventManagerInteractionHandle {
	const { editor, songStore, setNotes, pianoRoll, previewManager } = context;

	return {
		handlePointerDown: (ev) => {
			const activeChannelId = editor.state.activeChannelId;
			if (activeChannelId === null) return;

			const originalNotes = [
				...getSelectedNotes(songStore.state, editor.state),
			];
			previewManager.startPreviewNotes(originalNotes);

			const startPosition = toPianoRollPosition(
				ev.position,
				editor.state,
				pianoRoll.state,
			);
			let currentPreviewKey = startPosition.key;

			pianoRoll.hoverNotesManager.disableUpdate();
			ev.sessionEvents.on("dragMove", (ev) => {
				const position = toPianoRollPosition(
					ev.position,
					editor.state,
					pianoRoll.state,
				);
				const tickDiff = quantize(
					position.tick - startPosition.tick,
					editor.state.quantizeUnitInTick,
				);
				const keyDiff = position.key - startPosition.key;

				const newNotes = originalNotes.map((note) =>
					Note.create({
						...note,
						key: note.key + keyDiff,
						tickFrom: note.tickFrom + tickDiff,
						tickTo: note.tickTo + tickDiff,
					}),
				);
				setNotes(activeChannelId, newNotes);

				if (currentPreviewKey !== position.key) {
					previewManager.startPreviewNotes(newNotes);
					currentPreviewKey = position.key;
				}
			});
			ev.sessionEvents.on("pointerUp", () => {
				previewManager.stopPreviewNotes();
				pianoRoll.hoverNotesManager.enableUpdate();
			});
		},
	};
}

/**
 * ノートをリサイズする
 * @param context コンテキスト
 * @param context.ev
 * @param context.editor
 * @param context.pianoRoll
 * @param context.songStore
 * @param context.setNotes
 * @param context.noteIdForNewNoteDuration 新規ノートのデフォルトの長さとして今後参照されるノート
 * @param updateNote ノート更新関数
 */
function resizeNotes(
	context: {
		ev: PEMPointerEvent;
		editor: Editor;
		pianoRoll: PianoRoll;
		songStore: SongStore;
		setNotes: SetNotes;
		noteIdForNewNoteDuration: number | null;
	},
	updateNote: (note: Note, tickDiff: number) => Note,
) {
	const {
		ev,
		editor,
		pianoRoll,
		songStore,
		setNotes,
		noteIdForNewNoteDuration,
	} = context;

	const activeChannelId = editor.state.activeChannelId;
	if (activeChannelId === null) return;

	const originalNotes = [...getSelectedNotes(songStore.state, editor.state)];
	pianoRoll.hoverNotesManager.disableUpdate();

	const startTick = toPianoRollPosition(
		ev.position,
		editor.state,
		pianoRoll.state,
	).tick;

	ev.sessionEvents.on("dragMove", (ev) => {
		const currentTick = toPianoRollPosition(
			ev.position,
			editor.state,
			pianoRoll.state,
		).tick;
		const tickDiff = currentTick - startTick;

		setNotes(
			activeChannelId,
			originalNotes.map((note) => {
				note = updateNote(note, tickDiff);
				if (note.id === noteIdForNewNoteDuration) {
					editor.setNewNoteDuration(note.tickTo - note.tickFrom);
				}
				return note;
			}),
		);
	});
	ev.sessionEvents.on("pointerUp", () => {
		pianoRoll.hoverNotesManager.enableUpdate();
	});
}

/**
 * ノートの開始位置を変更する
 * @param context.editor
 * @param context.pianoRoll
 * @param context.songStore
 * @param context.setNotes
 * @param context.noteIdForNewNoteDuration 新規ノートのデフォルトの長さとして今後参照されるノート
 */
export function resizeNoteStartFeature(context: {
	editor: Editor;
	pianoRoll: PianoRoll;
	songStore: SongStore;
	setNotes: SetNotes;
	noteIdForNewNoteDuration: number | null;
}): PointerEventManagerInteractionHandle {
	return {
		handlePointerDown: (ev) => {
			resizeNotes({ ...context, ev }, (note, tickDiff) => {
				return Note.create({
					...note,
					tickFrom: quantize(
						minmax(
							null,
							note.tickTo - context.editor.state.quantizeUnitInTick,
							note.tickFrom + tickDiff,
						),
						context.editor.state.quantizeUnitInTick,
					),
				});
			});
		},
	};
}

/**
 * ノートの終了位置を変更する
 * @param context.editor
 * @param context.pianoRoll
 * @param context.songStore
 * @param context.setNotes
 * @param context.noteIdForNewNoteDuration 新規ノートのデフォルトの長さとして今後参照されるノート
 */
export function resizeNoteEndFeature(context: {
	editor: Editor;
	pianoRoll: PianoRoll;
	songStore: SongStore;
	setNotes: SetNotes;
	noteIdForNewNoteDuration: number | null;
}): PointerEventManagerInteractionHandle {
	return {
		handlePointerDown: (ev) => {
			resizeNotes({ ...context, ev }, (note, tickDiff) => {
				return Note.create({
					...note,
					tickTo: quantize(
						minmax(
							note.tickFrom + context.editor.state.quantizeUnitInTick,
							null,
							note.tickTo + tickDiff,
						),
						context.editor.state.quantizeUnitInTick,
					),
				});
			});
		},
	};
}

/**
 * ノート上でpointerdownした際にノートの選択状態を切り替える
 * @param note
 * @param editor
 */
export function toggleNoteSelectionFeature(
	note: Note,
	editor: Editor,
): PointerEventManagerInteractionHandle {
	return {
		handlePointerDown: (ev) => {
			if (ev.button !== MouseEventButton.PRIMARY) return;

			const selected = getSelectedNoteIds(editor.state).has(note.id);
			if (selected) {
				if (ev.metaKey) {
					ev.sessionEvents.on("tap", () => {
						editor.removeNotesFromSelection([note.id]);
					});
				}
			} else {
				editor.clearSelection();
				editor.putNotesToSelection([note.id]);
			}
		},
	};
}

/**
 * ノートをダブルクリックで削除する
 * @param note
 * @param editor
 * @param removeNotes
 */
export function removeNotesByDoubleClickFeature(
	note: Note,
	editor: Editor,
	removeNotes: RemoveNotes,
): PointerEventManagerInteractionHandle {
	return {
		handleDoubleClick: () => {
			const activeChannelId = editor.state.activeChannelId;
			if (activeChannelId === null) return;

			removeNotes(activeChannelId, [note.id]);
		},
	};
}

export function toPianoRollPosition(
	position: PositionSnapshot,
	editorState: EditorState,
	pianoRollState: PianoRollState,
): PianoRollPosition {
	const x = position.x + editorState.scrollLeft - SIDEBAR_WIDTH;
	const y = position.y + pianoRollState.scrollTop - TIMELINE_HEIGHT;
	const key = NUM_KEYS - 1 - Math.floor(y / HEIGHT_PER_KEY);
	const tick = Math.floor(x / widthPerTick(editorState.zoom));

	return { key, tick, x, y };
}

export interface PianoRollPosition {
	readonly key: number;
	readonly tick: number;
	readonly x: number;
	readonly y: number;
}
