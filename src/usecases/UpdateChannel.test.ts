import { describe, expect, it, mock } from "bun:test";
import { UpdateChannel } from "./UpdateChannel.ts";
import { Song } from "../models/Song.ts";
import { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Color } from "../Color.ts";

describe("UpdateChannel", () => {
	const createMockChannel = (
		id: number,
		label: string = "Test Channel",
	): Channel => {
		return new Channel({
			id,
			label,
			instrumentKey: new InstrumentKey("GeneralUser GS", 0, 0),
			notes: new Map(),
			controlChanges: new Map(),
			color: Color.hsl(0, 0, 0),
		});
	};

	describe("channel update", () => {
		it("should update channel label", () => {
			const channel = createMockChannel(1, "Old Label");
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

			const updateChannel = UpdateChannel({
				history: historyMock,
				bus: busMock,
				songStore: songStoreMock,
			});

			const patch = { label: "New Label" };
			updateChannel(1, patch);

			expect(historyMock.execute).toBeCalledTimes(1);
			expect(busMock.emitPhasedEvents).toBeCalledWith(
				"channel.update",
				1,
				patch,
			);
		});

		it("should update instrument key", () => {
			const channel = createMockChannel(1);
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

			const updateChannel = UpdateChannel({
				history: historyMock,
				bus: busMock,
				songStore: songStoreMock,
			});

			const newInstrumentKey = new InstrumentKey("GeneralUser GS", 1, 0);
			const patch = { instrumentKey: newInstrumentKey };
			updateChannel(1, patch);

			expect(historyMock.execute).toBeCalledTimes(1);
		});

		it("should update multiple properties", () => {
			const channel = createMockChannel(1, "Old Label");
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

			const updateChannel = UpdateChannel({
				history: historyMock,
				bus: busMock,
				songStore: songStoreMock,
			});

			const newInstrumentKey = new InstrumentKey("GeneralUser GS", 1, 0);
			const patch = {
				label: "New Label",
				instrumentKey: newInstrumentKey,
			};
			updateChannel(1, patch);

			expect(historyMock.execute).toBeCalledTimes(1);
		});
	});

	describe("undo/redo support", () => {
		it("should create inverse patch for undo", () => {
			const channel = createMockChannel(1, "Original Label");
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

			const updateChannel = UpdateChannel({
				history: historyMock,
				bus: busMock,
				songStore: songStoreMock,
			});

			busMock.emitPhasedEvents.mockClear();
			const patch = { label: "New Label" };
			updateChannel(1, patch);

			// Execute undo
			undoCommand.undo();

			// Should emit channel.update with inverse patch
			expect(busMock.emitPhasedEvents).toBeCalledWith(
				"channel.update",
				1,
				expect.objectContaining({ label: "Original Label" }),
			);
		});

		it("should preserve instrument key on undo", () => {
			const originalInstrumentKey = new InstrumentKey("GeneralUser GS", 0, 0);
			const channel = new Channel({
				id: 1,
				label: "Test",
				instrumentKey: originalInstrumentKey,
				notes: new Map(),
				controlChanges: new Map(),
				color: Color.hsl(0, 0, 0),
			});
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

			const updateChannel = UpdateChannel({
				history: historyMock,
				bus: busMock,
				songStore: songStoreMock,
			});

			busMock.emitPhasedEvents.mockClear();
			const newInstrumentKey = new InstrumentKey("GeneralUser GS", 1, 0);
			const patch = { instrumentKey: newInstrumentKey };
			updateChannel(1, patch);

			// Execute undo
			undoCommand.undo();

			// Check that undo was called with original values
			const lastCall = busMock.emitPhasedEvents.mock.calls.slice(-1)[0];
			expect(lastCall[0]).toBe("channel.update");
			expect(lastCall[1]).toBe(1);
		});

		it("should mark checkpoint after update", () => {
			const channel = createMockChannel(1);
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

			const updateChannel = UpdateChannel({
				history: historyMock,
				bus: busMock,
				songStore: songStoreMock,
			});

			updateChannel(1, { label: "New Label" });

			expect(historyMock.markCheckpoint).toBeCalledTimes(1);
		});
	});

	describe("invalid channel", () => {
		it("should not execute when channel does not exist", () => {
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

			const updateChannel = UpdateChannel({
				history: historyMock,
				bus: busMock,
				songStore: songStoreMock,
			});

			updateChannel(999, { label: "New Label" });

			expect(historyMock.execute).not.toBeCalled();
			expect(historyMock.markCheckpoint).not.toBeCalled();
		});
	});

	describe("edge cases", () => {
		it("should handle empty patch", () => {
			const channel = createMockChannel(1);
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

			const updateChannel = UpdateChannel({
				history: historyMock,
				bus: busMock,
				songStore: songStoreMock,
			});

			updateChannel(1, {});

			expect(historyMock.execute).toBeCalledTimes(1);
		});

		it("should handle null values in patch", () => {
			const channel = createMockChannel(1, "Original Label");
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

			const updateChannel = UpdateChannel({
				history: historyMock,
				bus: busMock,
				songStore: songStoreMock,
			});

			updateChannel(1, { label: undefined });

			expect(historyMock.execute).toBeCalledTimes(1);
		});
	});
});
