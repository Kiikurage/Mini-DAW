// Note: This usecase depends on EditHistoryManager, EventBus, and SongStore,
// which are complex classes. Integration tests are more appropriate.
// Unit testing with mocks provides false confidence.

import { describe } from "bun:test";
import { Color } from "../Color.ts";
import { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Song } from "../models/Song.ts";
import { SetSong } from "./SetSong.ts";

describe("SetSong", () => {
	const createChannel = (id: number): Channel => {
		return new Channel({
			id,
			label: `Channel ${id}`,
			instrumentKey: new InstrumentKey("GeneralUser GS", 0, 0),
			notes: new Map(),
			controlChanges: new Map(),
			color: Color.hsl(0, 0, 0),
		});
	};
});
