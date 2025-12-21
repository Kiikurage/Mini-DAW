import { describe, expect, it, mock } from "bun:test";
import { SetNotes } from "./SetNotes.ts";
import { Song } from "../models/Song.ts";
import { Channel } from "../models/Channel.ts";
import { Note } from "../models/Note.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Color } from "../Color.ts";

describe("SetNotes", () => {
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

	describe("note setting", () => {
		it("should set notes with history support", () => {
			const newNote = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, []);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const historyMock = {
				execute: mock((command: any) => {
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const songStoreMock = {
				state: song,
			} as any;

			const setNotes = SetNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			setNotes(1, [newNote]);

			expect(historyMock.execute).toBeCalledTimes(1);
			expect(busMock.emitPhasedEvents).toBeCalledWith("notes.put", 1, [
				newNote,
			]);
		});

		it("should update existing notes", () => {
			const existingNote = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const updatedNote = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 100,
			});

			const channel = createMockChannel(1, [existingNote]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const historyMock = {
				execute: mock((command: any) => {
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const songStoreMock = {
				state: song,
			} as any;

			const setNotes = SetNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			setNotes(1, [updatedNote]);

			expect(historyMock.execute).toBeCalledTimes(1);
		});

		it("should handle multiple notes", () => {
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

			const channel = createMockChannel(1, []);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const historyMock = {
				execute: mock((command: any) => {
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const songStoreMock = {
				state: song,
			} as any;

			const setNotes = SetNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			setNotes(1, [note1, note2]);

			expect(historyMock.execute).toBeCalledTimes(1);
		});
	});

	describe("undo/redo support", () => {
		it("should emit notes.remove for new notes on undo", () => {
			const newNote = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, []);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			let undoCommand: any = null;
			const historyMock = {
				execute: mock((command: any) => {
					undoCommand = command;
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const songStoreMock = {
				state: song,
			} as any;

			const setNotes = SetNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			busMock.emitPhasedEvents.mockClear();
			setNotes(1, [newNote]);

			// Execute undo
			undoCommand.undo();

			// Should emit notes.remove for newly added notes
			const calls = busMock.emitPhasedEvents.mock.calls;
			const hasRemoveCall = calls.some((call: any) => call[0] === "notes.remove");
			expect(hasRemoveCall).toBe(true);
		});

		it("should emit notes.put for old notes on undo", () => {
			const existingNote = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const updatedNote = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 100,
			});

			const channel = createMockChannel(1, [existingNote]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			let undoCommand: any = null;
			const historyMock = {
				execute: mock((command: any) => {
					undoCommand = command;
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const songStoreMock = {
				state: song,
			} as any;

			const setNotes = SetNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			busMock.emitPhasedEvents.mockClear();
			setNotes(1, [updatedNote]);

			// Execute undo
			undoCommand.undo();

			// Should emit notes.put to restore old notes
			const calls = busMock.emitPhasedEvents.mock.calls;
			const hasPutCall = calls.some((call: any) => call[0] === "notes.put");
			expect(hasPutCall).toBe(true);
		});

		it("should mark checkpoint after setting notes", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, []);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const historyMock = {
				execute: mock((command: any) => {
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const songStoreMock = {
				state: song,
			} as any;

			const setNotes = SetNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			setNotes(1, [note]);

			expect(historyMock.markCheckpoint).toBeCalledTimes(1);
		});
	});

	describe("invalid channel", () => {
		it("should not execute when channel does not exist", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const song = new Song({
				title: "Test",
				channels: [],
				bpm: 120,
			});

			const historyMock = {
				execute: mock(() => {}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const songStoreMock = {
				state: song,
			} as any;

			const setNotes = SetNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			setNotes(999, [note]);

			expect(historyMock.execute).not.toBeCalled();
			expect(historyMock.markCheckpoint).not.toBeCalled();
		});
	});

	describe("edge cases", () => {
		it("should handle empty notes list", () => {
			const channel = createMockChannel(1, []);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const historyMock = {
				execute: mock((command: any) => {
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const songStoreMock = {
				state: song,
			} as any;

			const setNotes = SetNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			setNotes(1, []);

			expect(historyMock.execute).toBeCalledTimes(1);
		});

		it("should work with iterable notes (not just array)", () => {
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

			const channel = createMockChannel(1, []);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const historyMock = {
				execute: mock((command: any) => {
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const songStoreMock = {
				state: song,
			} as any;

			const setNotes = SetNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			// Use Set instead of array
			setNotes(1, new Set([note1, note2]));

			expect(historyMock.execute).toBeCalledTimes(1);
		});
	});
});
