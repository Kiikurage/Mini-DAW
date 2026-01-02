import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import type { FileStore } from "../FileStore.ts";
import { isNotNullish } from "../lib.ts";
import type { ChannelId } from "../models/Channel.ts";
import type { Note, NoteId } from "../models/Note.ts";
import { Song } from "../models/Song.ts";

export const RemoveNotesKey = ComponentKey<RemoveNotes>("RemoveNotes");

export function RemoveNotes({
	fileStore,
	history,
	bus,
}: {
	fileStore: FileStore;
	history: EditHistoryManager;
	bus: EventBus;
}) {
	return (channelId: ChannelId, noteIds: Iterable<NoteId>) => {
		const channel = Song.getChannel(fileStore.state.song, channelId);
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
