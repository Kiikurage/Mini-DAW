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
		keyDiff: number,
		tickDiff: number,
	) => {
		const channel = songStore.state.getChannel(channelId);
		if (channel === null) return;

		setNotes(
			channelId,
			[...noteIds]
				.map((noteId) => channel.notes.get(noteId))
				.filter(isNotNullish)
				.map(
					(note) =>
						new Note({
							...note,
							key: note.key + keyDiff,
							tickFrom: note.tickFrom + tickDiff,
							tickTo: note.tickTo + tickDiff,
						}),
				),
		);
	};
}
export type MoveNotes = ReturnType<typeof MoveNotes>;
