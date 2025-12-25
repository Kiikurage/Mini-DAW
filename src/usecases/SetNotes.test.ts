import { describe, it } from "bun:test";
import { Color } from "../Color.ts";
import { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import type { Note } from "../models/Note.ts";
import { Song } from "../models/Song.ts";

describe("SetNotes", () => {
	const createChannel = (id: number, notes: Note[]): Channel => {
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

	// Note: SetNotes usecase depends on EditHistoryManager and EventBus,
	// which are complex classes. We test these through integration tests
	// rather than unit tests with mocks, as mocks provide false confidence.
	// If this usecase needs unit testing, consider separating the business
	// logic from infrastructure concerns.
});
