import { describe, expect, it, mock } from "bun:test";
import { SetSong } from "./SetSong.ts";
import { Song } from "../models/Song.ts";
import { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Color } from "../Color.ts";

describe("SetSong", () => {
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

	describe("song setting", () => {
		it("should emit song.put event with song", () => {
			const channel = createMockChannel(1);
			const song = new Song({
				title: "Test Song",
				channels: [channel],
				bpm: 120,
			});

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const setSong = SetSong({
				bus: busMock,
			});

			setSong(song);

			expect(busMock.emitPhasedEvents).toBeCalledWith("song.put", song);
		});

		it("should handle different BPM values", () => {
			const channel = createMockChannel(1);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 140,
			});

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const setSong = SetSong({
				bus: busMock,
			});

			setSong(song);

			expect(busMock.emitPhasedEvents).toBeCalledWith("song.put", song);
		});

		it("should handle different titles", () => {
			const channel = createMockChannel(1);
			const song = new Song({
				title: "My Awesome Song",
				channels: [channel],
				bpm: 120,
			});

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const setSong = SetSong({
				bus: busMock,
			});

			setSong(song);

			expect(busMock.emitPhasedEvents).toBeCalledWith("song.put", song);
		});

		it("should handle multiple channels", () => {
			const channel1 = createMockChannel(1);
			const channel2 = createMockChannel(2);
			const song = new Song({
				title: "Test",
				channels: [channel1, channel2],
				bpm: 120,
			});

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const setSong = SetSong({
				bus: busMock,
			});

			setSong(song);

			expect(busMock.emitPhasedEvents).toBeCalledWith("song.put", song);
		});

		it("should preserve exact song object", () => {
			const channel = createMockChannel(1);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const setSong = SetSong({
				bus: busMock,
			});

			setSong(song);

			const calls = busMock.emitPhasedEvents.mock.calls;
			expect(calls[0][1]).toBe(song);
		});
	});
});
