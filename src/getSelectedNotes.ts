import type { EditorState } from "./Editor/Editor.ts";
import { getActiveChannel } from "./getActiveChannel.ts";
import type { Note } from "./models/Note.ts";
import type { Song } from "./models/Song.ts";

export function* getSelectedNotes(
	song: Song,
	editorState: EditorState,
): Generator<Note> {
	const activeChannel = getActiveChannel(song, editorState);
	if (activeChannel === null) return;

	for (const noteId of editorState.selectedNoteIds) {
		const note = activeChannel.notes.get(noteId);
		if (note) {
			yield note;
		}
	}
}
