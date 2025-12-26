import { ComponentKey } from "../Dependency/DIContainer.ts";
import { isNotNullish } from "../lib.ts";
import { Note } from "../models/Note.ts";
import type { SongStore } from "../SongStore.ts";
import type { SetNotes } from "./SetNotes.ts";

export const MoveNotesKey = ComponentKey<MoveNotes>("MoveNotes");

export function MoveNotes({
	songStore,
	setNotes,
}: {
	songStore: SongStore;
	setNotes: SetNotes;
}) {
	return (
		channelId: number,
		noteIds: Iterable<number>,
		keyOffset: number,
		tickOffset: number,
	) => {
		const channel = songStore.state.song.getChannel(channelId);
		if (channel === null) return;

		setNotes(
			channelId,
			[...noteIds]
				.map((noteId) => channel.notes.get(noteId))
				.filter(isNotNullish)
				.map((note) =>
					Note.create({
						...note,
						key: note.key + keyOffset,
						tickFrom: note.tickFrom + tickOffset,
						tickTo: note.tickTo + tickOffset,
					}),
				),
		);
	};
}
export type MoveNotes = ReturnType<typeof MoveNotes>;
