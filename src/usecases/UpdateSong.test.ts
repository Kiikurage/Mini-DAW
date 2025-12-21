import { describe, expect, it, mock } from "bun:test";
import { UpdateSong } from "./UpdateSong.ts";
import { Song } from "../models/Song.ts";
import { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Color } from "../Color.ts";

describe("UpdateSong", () => {
	const createMockChannel = (id: number): Channel => {
		return new Channel({
			id,
			label: `Channel ${id}`,
			instrumentKey: new InstrumentKey("GeneralUser GS", 0, 0),
			notes: new Map(),
			controlChanges: new Map(),
			color: Color.hsl(0, 0, 0),
		});
	};

	describe("song update", () => {
		it("should emit song.update event with patch", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const updateSong = UpdateSong(busMock);

			const patch = { title: "New Title" };
			updateSong(patch);

			expect(busMock.emitPhasedEvents).toBeCalledWith("song.update", patch);
		});

		it("should update title", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const updateSong = UpdateSong(busMock);

			updateSong({ title: "Updated Title" });

			expect(busMock.emitPhasedEvents).toBeCalledWith("song.update", {
				title: "Updated Title",
			});
		});

		it("should update BPM", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const updateSong = UpdateSong(busMock);

			updateSong({ bpm: 140 });

			expect(busMock.emitPhasedEvents).toBeCalledWith("song.update", {
				bpm: 140,
			});
		});

		it("should update both title and BPM", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const updateSong = UpdateSong(busMock);

			const patch = { title: "New Title", bpm: 130 };
			updateSong(patch);

			expect(busMock.emitPhasedEvents).toBeCalledWith("song.update", patch);
		});

		it("should handle empty patch", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const updateSong = UpdateSong(busMock);

			updateSong({});

			expect(busMock.emitPhasedEvents).toBeCalledWith("song.update", {});
		});

		it("should preserve exact patch object", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const updateSong = UpdateSong(busMock);

			const patch = { title: "Test", bpm: 100 };
			updateSong(patch);

			const calls = busMock.emitPhasedEvents.mock.calls;
			expect(calls[0][1]).toBe(patch);
		});

		it("should handle different BPM values", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const updateSong = UpdateSong(busMock);

			for (let bpm = 60; bpm <= 200; bpm += 20) {
				updateSong({ bpm });
			}

			expect(busMock.emitPhasedEvents).toBeCalledTimes(8);
		});
	});
});
