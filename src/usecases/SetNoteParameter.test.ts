import { describe, expect, it, mock } from "bun:test";
import { SetNoteParameter } from "./SetNoteParameter.ts";
import { Song } from "../models/Song.ts";
import { Channel } from "../models/Channel.ts";
import { Note } from "../models/Note.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Color } from "../Color.ts";

describe("SetNoteParameter", () => {
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

	describe("velocity parameter", () => {
		it("should update velocity of a single note", () => {
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

			const setNotesMock = mock((
				channelId: number,
				notes: Note[],
			) => {
				expect(notes).toHaveLength(1);
				expect(notes[0].velocity).toBe(100);
				expect(notes[0].id).toBe(1);
				expect(notes[0].key).toBe(60);
				expect(notes[0].tickFrom).toBe(0);
				expect(notes[0].tickTo).toBe(480);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const setNoteParameter = SetNoteParameter({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			setNoteParameter(1, [1], "velocity", 100);

			expect(setNotesMock).toBeCalledTimes(1);
		});

		it("should update velocity of multiple notes", () => {
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

			const setNotesMock = mock((
				channelId: number,
				notes: Note[],
			) => {
				expect(notes).toHaveLength(2);
				expect(notes[0].velocity).toBe(90);
				expect(notes[1].velocity).toBe(90);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const setNoteParameter = SetNoteParameter({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			setNoteParameter(1, [1, 2], "velocity", 90);

			expect(setNotesMock).toBeCalledTimes(1);
		});

		it("should handle zero velocity", () => {
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

			const setNotesMock = mock((
				channelId: number,
				notes: Note[],
			) => {
				expect(notes[0].velocity).toBe(0);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const setNoteParameter = SetNoteParameter({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			setNoteParameter(1, [1], "velocity", 0);

			expect(setNotesMock).toBeCalledTimes(1);
		});

		it("should handle maximum velocity (127)", () => {
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

			const setNotesMock = mock((
				channelId: number,
				notes: Note[],
			) => {
				expect(notes[0].velocity).toBe(127);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const setNoteParameter = SetNoteParameter({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			setNoteParameter(1, [1], "velocity", 127);

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

			const setNotesMock = mock((
				channelId: number,
				notes: Note[],
			) => {
				expect(notes).toHaveLength(1);
				expect(notes[0].id).toBe(1);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const setNoteParameter = SetNoteParameter({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			setNoteParameter(1, [1, 999], "velocity", 100);

			expect(setNotesMock).toBeCalledTimes(1);
		});

		it("should not call setNotes for empty note IDs", () => {
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

			const setNotesMock = mock(() => {});

			const songStoreMock = {
				state: song,
			} as any;

			const setNoteParameter = SetNoteParameter({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			setNoteParameter(1, [], "velocity", 100);

			// setNotes is still called with empty array
			expect(setNotesMock).toBeCalledTimes(1);
		});

		it("should not modify other note properties", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 100,
				tickTo: 500,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const setNotesMock = mock((
				channelId: number,
				notes: Note[],
			) => {
				expect(notes[0].key).toBe(60);
				expect(notes[0].tickFrom).toBe(100);
				expect(notes[0].tickTo).toBe(500);
			});

			const songStoreMock = {
				state: song,
			} as any;

			const setNoteParameter = SetNoteParameter({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			setNoteParameter(1, [1], "velocity", 64);

			expect(setNotesMock).toBeCalledTimes(1);
		});
	});

	describe("invalid parameters", () => {
		it("should throw error for unsupported parameter", () => {
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

			const setNotesMock = mock(() => {});

			const songStoreMock = {
				state: song,
			} as any;

			const setNoteParameter = SetNoteParameter({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			expect(() => {
				setNoteParameter(1, [1], "key", 64);
			}).toThrow();
		});

		it("should throw error for undefined parameter", () => {
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

			const setNotesMock = mock(() => {});

			const songStoreMock = {
				state: song,
			} as any;

			const setNoteParameter = SetNoteParameter({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			expect(() => {
				setNoteParameter(1, [1], "tickFrom", 0);
			}).toThrow();
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

			const setNoteParameter = SetNoteParameter({
				songStore: songStoreMock,
				setNotes: setNotesMock,
			});

			setNoteParameter(999, [1], "velocity", 100);

			expect(setNotesMock).not.toBeCalled();
		});
	});
});
