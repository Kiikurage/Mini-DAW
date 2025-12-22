import type { EditorState } from "./Editor/Editor.ts";
import { getSelectedNotes } from "./getSelectedNotes.ts";
import type { PianoRollArea } from "./models/PianoRollArea.ts";
import type { Song } from "./models/Song.ts";

/**
 * 選択されているノートを包含する矩形範囲
 */
export function computeSelectionArea(
	loopKeys: ReadonlySet<number>,
	song: Song,
	editorState: EditorState,
): PianoRollArea | null {
	const notes = [...getSelectedNotes(song, editorState)];
	if (notes.length === 0) return null;

	const keys = notes.map((note) => note.key);
	const tickFroms = notes.map((note) => note.tickFrom);
	const tickTos = notes.map((note) => {
		if (loopKeys.has(note.key)) {
			return note.tickTo;
		} else {
			return note.tickFrom;
		}
	});

	return {
		keyFrom: Math.min(...keys),
		keyTo: Math.max(...keys) + 1,
		tickFrom: Math.min(...tickFroms),
		tickTo: Math.max(...tickTos),
	};
}
