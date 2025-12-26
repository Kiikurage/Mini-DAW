import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import { isNotNullish } from "../lib.ts";
import type { Note } from "../models/Note.ts";
import type { SongStore } from "../SongStore.ts";

export const RemoveNotesKey = ComponentKey<RemoveNotes>("RemoveNotes");

export function RemoveNotes({
	songStore,
	history,
	bus,
}: {
	songStore: SongStore;
	history: EditHistoryManager;
	bus: EventBus;
}) {
	return (channelId: number, noteIds: Iterable<number>) => {
		const channel = songStore.state.song.getChannel(channelId);
		if (channel === null) return;

		const notes: Note[] = [...noteIds]
			.map((noteId) => channel.notes.get(noteId))
			.filter(isNotNullish);

		history.execute({
			do: () => {
				bus.emitPhasedEvents("notes.remove", channelId, noteIds);
			},
			undo: () => {
				bus.emitPhasedEvents("notes.put", channelId, notes);
			},
		});
		history.markCheckpoint();
	};
}
export type RemoveNotes = ReturnType<typeof RemoveNotes>;
