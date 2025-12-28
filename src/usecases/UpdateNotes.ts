import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { FileStore } from "../FileStore.ts";
import { isNotNullish } from "../lib.ts";
import { Note, type NotePatch } from "../models/Note.ts";
import type { PutNotes } from "./PutNotes.ts";

export const UpdateNotesKey = ComponentKey<UpdateNotes>("UpdateNotes");

export function UpdateNotes({
	fileStore,
	setNotes,
}: {
	fileStore: FileStore;
	setNotes: PutNotes;
}) {
	return (channelId: number, patches: Iterable<NotePatch>) => {
		const channel = fileStore.state.song.getChannel(channelId);
		if (channel === null) return;

		const notes = [...patches]
			.map((patch) => {
				const note = channel.notes.get(patch.id);
				if (note === undefined) return null;
				return Note.applyPatch(note, patch);
			})
			.filter(isNotNullish);

		setNotes(channelId, notes);
	};
}

export type UpdateNotes = ReturnType<typeof UpdateNotes>;
