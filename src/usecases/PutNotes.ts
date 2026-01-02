import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import type { FileStore } from "../FileStore.ts";
import type { ChannelId } from "../models/Channel.ts";
import type { Note, NoteId } from "../models/Note.ts";
import { Song } from "../models/Song.ts";

export const PutNotesKey = ComponentKey<PutNotes>("PutNotes");

export function PutNotes({
	fileStore,
	history,
	bus,
}: {
	fileStore: FileStore;
	history: EditHistoryManager;
	bus: EventBus;
}) {
	return (
		channelId: ChannelId,
		notes: Iterable<Note>,
		markCheckpoint: boolean,
	) => {
		const channel = Song.getChannel(fileStore.state.song, channelId);
		if (channel === null) return;

		const oldNotes: Note[] = [];
		const addedNoteIds: NoteId[] = [];

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
		if (markCheckpoint) {
			history.markCheckpoint();
		}
	};
}
export type PutNotes = ReturnType<typeof PutNotes>;
