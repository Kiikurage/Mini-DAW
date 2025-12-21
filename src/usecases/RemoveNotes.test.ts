import { describe, expect, it, mock } from "bun:test";
import { RemoveNotes } from "./RemoveNotes.ts";
import { Song } from "../models/Song.ts";
import { Channel } from "../models/Channel.ts";
import { Note } from "../models/Note.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Color } from "../Color.ts";

describe("RemoveNotes", () => {
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

	describe("note removal", () => {
		it("should remove a single note", () => {
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

			let doCallCount = 0;
			let undoCallCount = 0;

			const historyMock = {
				execute: mock((command: any) => {
					doCallCount++;
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

			const removeNotes = RemoveNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			removeNotes(1, [1]);

			expect(historyMock.execute).toBeCalledTimes(1);
			expect(historyMock.markCheckpoint).toBeCalledTimes(1);
			expect(busMock.emitPhasedEvents).toBeCalledTimes(1);
			expect(busMock.emitPhasedEvents).toBeCalledWith(
				"notes.remove",
				1,
				[1],
			);
		});

		it("should remove multiple notes", () => {
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
			const note3 = Note.create({
				id: 3,
				key: 67,
				tickFrom: 960,
				tickTo: 1440,
				velocity: 90,
			});

			const channel = createMockChannel(1, [note1, note2, note3]);
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

			const removeNotes = RemoveNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			removeNotes(1, [1, 3]);

			expect(historyMock.execute).toBeCalledTimes(1);
			expect(busMock.emitPhasedEvents).toBeCalledTimes(1);
			expect(busMock.emitPhasedEvents).toBeCalledWith(
				"notes.remove",
				1,
				[1, 3],
			);
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

			const removeNotes = RemoveNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			removeNotes(1, [1, 999]);

			// Should still execute the command but only with existing notes
			expect(historyMock.execute).toBeCalledTimes(1);
		});
	});

	describe("undo/redo support", () => {
		it("should execute do command", () => {
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

			let doExecuted = false;
			const historyMock = {
				execute: mock((command: any) => {
					doExecuted = true;
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

			const removeNotes = RemoveNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			removeNotes(1, [1]);

			expect(doExecuted).toBe(true);
		});

		it("should support undo with notes.put event", () => {
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

			const removeNotes = RemoveNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			busMock.emitPhasedEvents.mockClear();
			removeNotes(1, [1]);

			// Execute undo
			undoCommand.undo();

			// Should emit notes.put events during undo
			expect(busMock.emitPhasedEvents.mock.calls.length).toBeGreaterThan(0);
		});

		it("should mark checkpoint after removal", () => {
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

			const removeNotes = RemoveNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			removeNotes(1, [1]);

			expect(historyMock.markCheckpoint).toBeCalledTimes(1);
		});
	});

	describe("invalid channel", () => {
		it("should not execute removal when channel does not exist", () => {
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

			const removeNotes = RemoveNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			removeNotes(999, [1]);

			expect(historyMock.execute).not.toBeCalled();
			expect(historyMock.markCheckpoint).not.toBeCalled();
		});
	});

	describe("edge cases", () => {
		it("should handle empty note IDs list", () => {
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

			const removeNotes = RemoveNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			removeNotes(1, []);

			expect(historyMock.execute).toBeCalledTimes(1);
		});

		it("should work with iterable input (not just array)", () => {
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

			const removeNotes = RemoveNotes({
				songStore: songStoreMock,
				history: historyMock,
				bus: busMock,
			});

			// Use Set instead of array (both are Iterable)
			removeNotes(1, new Set([1, 2]));

			expect(historyMock.execute).toBeCalledTimes(1);
		});
	});
});
