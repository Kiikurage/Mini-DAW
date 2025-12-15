import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import type { Note } from "../models/Note.ts";
import type { SongStore } from "../SongStore.ts";

export const SetNotesKey = ComponentKey<SetNotes>("SetNotes");

export function SetNotes({
	songStore,
	history,
	bus,
}: {
	songStore: SongStore;
	history: EditHistoryManager;
	bus: EventBus;
}) {
	return (channelId: number, notes: Iterable<Note>) => {
		const channel = songStore.state.getChannel(channelId);
		if (channel === null) return;

		const oldNotes: Note[] = [];
		const addedNoteIds: number[] = [];

		for (const note of notes) {
			const oldNote = channel.notes.get(note.id);
			if (oldNote === undefined) {
				addedNoteIds.push(note.id);
			} else {
				oldNotes.push(oldNote);
			}
		}

		history.execute({
			do: () => {
				bus.emitPhasedEvents("notes.put", channelId, notes);
			},
			undo: () => {
				bus.emitPhasedEvents("notes.remove", channelId, addedNoteIds);
				bus.emitPhasedEvents("notes.put", channelId, oldNotes);
			},
		});
		history.markCheckpoint();
	};
}
export type SetNotes = ReturnType<typeof SetNotes>;
