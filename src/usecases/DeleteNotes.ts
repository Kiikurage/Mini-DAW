import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import { isNotNullish } from "../lib.ts";
import type { Note } from "../models/Note.ts";
import type { SongStore } from "../SongStore.ts";

export const DeleteNotesKey = ComponentKey<DeleteNotes>("DeleteNotes");

export function DeleteNotes({
	songStore,
	history,
	bus,
}: {
	songStore: SongStore;
	history: EditHistoryManager;
	bus: EventBus;
}) {
	return (channelId: number, noteIds: Iterable<number>) => {
		const channel = songStore.state.getChannel(channelId);
		if (channel === null) return;

		const notes: Note[] = [...noteIds]
			.map((noteId) => channel.notes.get(noteId))
			.filter(isNotNullish);

		history.execute({
			do: () => {
				bus.emitPhasedEvents("notes.delete", channelId, noteIds);
			},
			undo: () => {
				bus.emitPhasedEvents("notes.set", channelId, notes);
			},
		});
		history.markCheckpoint();
	};
}
export type DeleteNotes = ReturnType<typeof DeleteNotes>;
