import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { FileStore } from "../FileStore.ts";
import { isNotNullish } from "../lib.ts";
import type { ChannelId } from "../models/Channel.ts";
import { Note, type NotePatch } from "../models/Note.ts";
import { Song } from "../models/Song.ts";
import type { PutNotes } from "./PutNotes.ts";

export const UpdateNotesKey = ComponentKey<UpdateNotes>("UpdateNotes");

export function UpdateNotes({
	fileStore,
	putNotes,
}: {
	fileStore: FileStore;
	putNotes: PutNotes;
}) {
	return (
		channelId: ChannelId,
		patches: Iterable<NotePatch>,
		markCheckpoint: boolean,
	) => {
		const channel = Song.getChannel(fileStore.state.song, channelId);
		if (channel === null) return;

		const notes = [...patches]
			.map((patch) => {
				const note = channel.notes.get(patch.id);
				if (note === undefined) return null;
				return Note.applyPatch(note, patch);
			})
			.filter(isNotNullish);

		putNotes(channelId, notes, markCheckpoint);
	};
}

export type UpdateNotes = ReturnType<typeof UpdateNotes>;
