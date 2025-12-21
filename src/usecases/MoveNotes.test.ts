import { describe, expect, it, mock } from "bun:test";
import { MoveNotes } from "./MoveNotes.ts";
import { Song } from "../models/Song.ts";
import { Channel } from "../models/Channel.ts";
import { Note } from "../models/Note.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Color } from "../Color.ts";

describe("MoveNotes", () => {
	const createMockChannel = (
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

	describe("note movement", () => {
		it("should move note by key offset", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotesMock = mock((channelId: number, notes: Note[]) => {
				expect(notes).toHaveLength(1);
				expect(notes[0].key).toBe(64);
				expect(notes[0].tickFrom).toBe(0);
				expect(notes[0].tickTo).toBe(480);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			moveNotes(1, [1], 4, 0);

			expect(setNotesMock).toBeCalledTimes(1);
		});

		it("should move note by tick offset", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotesMock = mock((channelId: number, notes: Note[]) => {
				expect(notes).toHaveLength(1);
				expect(notes[0].key).toBe(60);
				expect(notes[0].tickFrom).toBe(480);
				expect(notes[0].tickTo).toBe(960);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			moveNotes(1, [1], 0, 480);

			expect(setNotesMock).toBeCalledTimes(1);
		});

		it("should move note by both key and tick offset", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotesMock = mock((channelId: number, notes: Note[]) => {
				expect(notes).toHaveLength(1);
				expect(notes[0].key).toBe(67);
				expect(notes[0].tickFrom).toBe(240);
				expect(notes[0].tickTo).toBe(720);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			moveNotes(1, [1], 7, 240);

			expect(setNotesMock).toBeCalledTimes(1);
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

			const channel = createMockChannel(1, [note1, note2]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotesMock = mock((channelId: number, notes: Note[]) => {
				expect(notes).toHaveLength(2);
				expect(notes[0].key).toBe(62);
				expect(notes[1].key).toBe(66);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			moveNotes(1, [1, 2], 2, 0);

			expect(setNotesMock).toBeCalledTimes(1);
		});

		it("should handle zero offset", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotesMock = mock((channelId: number, notes: Note[]) => {
				expect(notes).toHaveLength(1);
				expect(notes[0].key).toBe(60);
				expect(notes[0].tickFrom).toBe(0);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			moveNotes(1, [1], 0, 0);

			expect(setNotesMock).toBeCalledTimes(1);
		});

		it("should handle negative offsets", () => {
			const note = Note.create({
				id: 1,
				key: 72,
				tickFrom: 960,
				tickTo: 1440,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotesMock = mock((channelId: number, notes: Note[]) => {
				expect(notes).toHaveLength(1);
				expect(notes[0].key).toBe(64);
				expect(notes[0].tickFrom).toBe(480);
				expect(notes[0].tickTo).toBe(960);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			moveNotes(1, [1], -8, -480);

			expect(setNotesMock).toBeCalledTimes(1);
		});

		it("should skip non-existent note IDs", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotesMock = mock((channelId: number, notes: Note[]) => {
				expect(notes).toHaveLength(1);
				expect(notes[0].id).toBe(1);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			moveNotes(1, [1, 999], 5, 0);

			expect(setNotesMock).toBeCalledTimes(1);
		});
	});

	describe("invalid channel", () => {
		it("should not call setNotes when channel does not exist", () => {
			const song = new Song({
				title: "Test",
				channels: [],
				bpm: 120,
			});

			const setNotesMock = mock(() => {});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			moveNotes(999, [1], 5, 0);

			expect(setNotesMock).not.toBeCalled();
		});
	});

	describe("edge cases", () => {
		it("should handle empty note IDs list", () => {
			const channel = createMockChannel(1, []);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotesMock = mock((channelId: number, notes: Note[]) => {
				expect(notes).toHaveLength(0);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			moveNotes(1, [], 5, 0);

			expect(setNotesMock).toBeCalledTimes(1);
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

			const channel = createMockChannel(1, [note1, note2]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotesMock = mock((channelId: number, notes: Note[]) => {
				expect(notes).toHaveLength(2);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const moveNotes = MoveNotes({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			// Use Set instead of array
			moveNotes(1, new Set([1, 2]), 5, 0);

			expect(setNotesMock).toBeCalledTimes(1);
		});
	});
});
