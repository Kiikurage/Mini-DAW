import { describe, expect, it, mock } from "bun:test";
import { Color } from "../Color.ts";
import { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Note } from "../models/Note.ts";
import { Song } from "../models/Song.ts";
import { MoveNotes } from "./MoveNotes.ts";

describe("MoveNotes", () => {
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

	describe("note movement", () => {
		it("should move note by key offset", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotes = mock((channelId: number, notes: Iterable<Note>) => {
				const noteArray = [...notes];
				expect(noteArray).toHaveLength(1);
				expect(noteArray[0]?.key).toBe(64);
				expect(noteArray[0]?.tickFrom).toBe(0);
				expect(noteArray[0]?.tickTo).toBe(480);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes,
			});

			moveNotes(1, [1], 4, 0);

			expect(setNotes).toBeCalledTimes(1);
		});

		it("should move note by tick offset", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotes = mock((channelId: number, notes: Iterable<Note>) => {
				const noteArray = [...notes];
				expect(noteArray).toHaveLength(1);
				expect(noteArray[0]?.key).toBe(60);
				expect(noteArray[0]?.tickFrom).toBe(480);
				expect(noteArray[0]?.tickTo).toBe(960);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes,
			});

			moveNotes(1, [1], 0, 480);

			expect(setNotes).toBeCalledTimes(1);
		});

		it("should move note by both key and tick offset", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotes = mock((channelId: number, notes: Iterable<Note>) => {
				const noteArray = [...notes];
				expect(noteArray).toHaveLength(1);
				expect(noteArray[0]?.key).toBe(67);
				expect(noteArray[0]?.tickFrom).toBe(240);
				expect(noteArray[0]?.tickTo).toBe(720);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes,
			});

			moveNotes(1, [1], 7, 240);

			expect(setNotes).toBeCalledTimes(1);
		});

		it("should move multiple notes", () => {
			const note1 = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});
			const note2 = Note.create({
				id: 2,
				key: 64,
				tickFrom: 480,
				tickTo: 960,
				velocity: 85,
			});

			const channel = createChannel(1, [note1, note2]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotes = mock((channelId: number, notes: Iterable<Note>) => {
				const noteArray = [...notes];
				expect(noteArray).toHaveLength(2);
				expect(noteArray[0]?.key).toBe(62);
				expect(noteArray[1]?.key).toBe(66);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes,
			});

			moveNotes(1, [1, 2], 2, 0);

			expect(setNotes).toBeCalledTimes(1);
		});

		it("should handle zero offset", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotes = mock((channelId: number, notes: Iterable<Note>) => {
				const noteArray = [...notes];
				expect(noteArray).toHaveLength(1);
				expect(noteArray[0]?.key).toBe(60);
				expect(noteArray[0]?.tickFrom).toBe(0);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes,
			});

			moveNotes(1, [1], 0, 0);

			expect(setNotes).toBeCalledTimes(1);
		});

		it("should handle negative offsets", () => {
			const note = Note.create({
				id: 1,
				key: 72,
				tickFrom: 960,
				tickTo: 1440,
				velocity: 80,
			});

			const channel = createChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotes = mock((channelId: number, notes: Iterable<Note>) => {
				const noteArray = [...notes];
				expect(noteArray).toHaveLength(1);
				expect(noteArray[0]?.key).toBe(64);
				expect(noteArray[0]?.tickFrom).toBe(480);
				expect(noteArray[0]?.tickTo).toBe(960);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes,
			});

			moveNotes(1, [1], -8, -480);

			expect(setNotes).toBeCalledTimes(1);
		});

		it("should skip non-existent note IDs", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotes = mock((channelId: number, notes: Iterable<Note>) => {
				const noteArray = [...notes];
				expect(noteArray).toHaveLength(1);
				expect(noteArray[0]?.id).toBe(1);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes,
			});

			moveNotes(1, [1, 999], 5, 0);

			expect(setNotes).toBeCalledTimes(1);
		});
	});

	describe("invalid channel", () => {
		it("should not call setNotes when channel does not exist", () => {
			const song = new Song({
				title: "Test",
				channels: [],
				bpm: 120,
			});

			const setNotes = mock(() => {});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes,
			});

			moveNotes(999, [1], 5, 0);

			expect(setNotes).not.toBeCalled();
		});
	});

	describe("edge cases", () => {
		it("should handle empty note IDs list", () => {
			const channel = createChannel(1, []);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotes = mock((channelId: number, notes: Iterable<Note>) => {
				const noteArray = [...notes];
				expect(noteArray).toHaveLength(0);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes,
			});

			moveNotes(1, [], 5, 0);

			expect(setNotes).toBeCalledTimes(1);
		});

		it("should work with iterable note IDs (not just array)", () => {
			const note1 = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});
			const note2 = Note.create({
				id: 2,
				key: 64,
				tickFrom: 480,
				tickTo: 960,
				velocity: 85,
			});

			const channel = createChannel(1, [note1, note2]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotes = mock((channelId: number, notes: Iterable<Note>) => {
				const noteArray = [...notes];
				expect(noteArray).toHaveLength(2);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes,
			});

			// Use Set instead of array
			moveNotes(1, new Set([1, 2]), 5, 0);

			expect(setNotes).toBeCalledTimes(1);
		});
	});
});
