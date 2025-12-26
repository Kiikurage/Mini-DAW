import { ComponentKey } from "../Dependency/DIContainer.ts";
import { assert, isNotNullish } from "../lib.ts";
import { Note } from "../models/Note.ts";
import type { SongStore } from "../SongStore.ts";
import type { SetNotes } from "./SetNotes.ts";

export const SetNoteParameterKey =
	ComponentKey<SetNoteParameter>("SetNoteParameter");

export function SetNoteParameter({
	songStore,
	setNotes,
}: {
	songStore: SongStore;
	setNotes: SetNotes;
}) {
	return (
		channelId: number,
		noteIds: Iterable<number>,
		parameter: string,
		value: number,
	) => {
		assert(parameter === "velocity", `Unsupported parameter: ${parameter}`);

		const channel = songStore.state.song.getChannel(channelId);
		if (channel === null) return;

		const notes = [...noteIds]
			.map((noteId) => channel.notes.get(noteId))
			.filter(isNotNullish)
			.map((note) => Note.create({ ...note, velocity: value }));

		setNotes(channelId, notes);
	};
}
export type SetNoteParameter = ReturnType<typeof SetNoteParameter>;
