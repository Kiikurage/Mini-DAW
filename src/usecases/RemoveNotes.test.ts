// Note: This usecase depends on EditHistoryManager, EventBus, and SongStore,
// which are complex classes. Integration tests are more appropriate.
// Unit testing with mocks provides false confidence.

import { describe } from "bun:test";
import { RemoveNotes } from "./RemoveNotes.ts";
import { Song } from "../models/Song.ts";
import { Channel } from "../models/Channel.ts";
import { Note } from "../models/Note.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Color } from "../Color.ts";

describe("RemoveNotes", () => {
	const createChannel = (
		id: number,
		notes: Note[],
	): Channel => {
		const notesMap = new Map(notes.map((note) => [note.id, note]));
		return new Channel({
			id,
			label: `Channel ${id}`,
			instrumentKey: new InstrumentKey("GeneralUser GS", 0, 0),
			notes: notesMap,
			controlChanges: new Map(),
			color: Color.hsl(0, 0, 0),
		});
	};
});
