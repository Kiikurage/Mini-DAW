import { describe, expect, it, mock } from "bun:test";
import { RemoveControlChanges } from "./RemoveControlChanges.ts";
import { Song } from "../models/Song.ts";
import { Channel } from "../models/Channel.ts";
import { ControlChangeList } from "../models/ControlChangeList.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Color } from "../Color.ts";

describe("RemoveControlChanges", () => {
	const createMockChannel = (
		id: number,
		controlChanges: Map<number, ControlChangeList>,
	): Channel => {
		return new Channel({
			id,
			label: `Channel ${id}`,
			instrumentKey: new InstrumentKey("GeneralUser GS", 0, 0),
			notes: new Map(),
			controlChanges,
			color: Color.hsl(0, 0, 0),
		});
	};

	describe("control change removal", () => {
		it("should remove control changes", () => {
			const controlChangeList = ControlChangeList.create().put([
				{ tick: 0, value: 64 },
				{ tick: 480, value: 64 },
				{ tick: 960, value: 64 },
			]);

			const controlChanges = new Map([[0, controlChangeList]]);

			const channel = createMockChannel(1, controlChanges);
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

			const removeControlChanges = RemoveControlChanges({
				bus: busMock,
				history: historyMock,
				songStore: songStoreMock,
			});

			removeControlChanges({
				channelId: 1,
				type: 0,
				ticks: [0, 480],
			});

			expect(historyMock.execute).toBeCalledTimes(1);
			expect(busMock.emitPhasedEvents).toBeCalledWith("control.remove", {
				channelId: 1,
				type: 0,
				ticks: [0, 480],
			});
		});

		it("should mark checkpoint after removal", () => {
			const controlChangeList = ControlChangeList.create().put([
				{ tick: 0, value: 64 },
			]);

			const controlChanges = new Map([[0, controlChangeList]]);

			const channel = createMockChannel(1, controlChanges);
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

			const removeControlChanges = RemoveControlChanges({
				bus: busMock,
				history: historyMock,
				songStore: songStoreMock,
			});

			removeControlChanges({
				channelId: 1,
				type: 0,
				ticks: [0],
			});

			expect(historyMock.markCheckpoint).toBeCalledTimes(1);
		});

		it("should support undo with control.put event", () => {
			const controlChangeList = ControlChangeList.create().put([
				{ tick: 0, value: 64 },
			]);

			const controlChanges = new Map([[0, controlChangeList]]);

			const channel = createMockChannel(1, controlChanges);
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

			const removeControlChanges = RemoveControlChanges({
				bus: busMock,
				history: historyMock,
				songStore: songStoreMock,
			});

			busMock.emitPhasedEvents.mockClear();
			removeControlChanges({
				channelId: 1,
				type: 0,
				ticks: [0],
			});

			// Execute undo
			undoCommand.undo();

			// Should emit control.put during undo
			expect(
				busMock.emitPhasedEvents.mock.calls.some((call: any) =>
					call[0] === "control.put"
				),
			).toBe(true);
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

			const removeControlChanges = RemoveControlChanges({
				bus: busMock,
				history: historyMock,
				songStore: songStoreMock,
			});

			removeControlChanges({
				channelId: 999,
				type: 0,
				ticks: [0],
			});

			expect(historyMock.execute).not.toBeCalled();
			expect(historyMock.markCheckpoint).not.toBeCalled();
		});

		it("should not execute removal when control type does not exist", () => {
			const channel = createMockChannel(1, new Map());
			const song = new Song({
				title: "Test",
				channels: [channel],
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

			const removeControlChanges = RemoveControlChanges({
				bus: busMock,
				history: historyMock,
				songStore: songStoreMock,
			});

			removeControlChanges({
				channelId: 1,
				type: 99,
				ticks: [0],
			});

			expect(historyMock.execute).not.toBeCalled();
			expect(historyMock.markCheckpoint).not.toBeCalled();
		});
	});

	describe("edge cases", () => {
		it("should handle empty ticks list", () => {
			const controlChangeList = ControlChangeList.create().put([
				{ tick: 0, value: 64 },
			]);

			const controlChanges = new Map([[0, controlChangeList]]);

			const channel = createMockChannel(1, controlChanges);
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

			const removeControlChanges = RemoveControlChanges({
				bus: busMock,
				history: historyMock,
				songStore: songStoreMock,
			});

			removeControlChanges({
				channelId: 1,
				type: 0,
				ticks: [],
			});

			expect(historyMock.execute).toBeCalledTimes(1);
		});

		it("should work with iterable ticks (not just array)", () => {
			const controlChangeList = ControlChangeList.create().put([
				{ tick: 0, value: 64 },
				{ tick: 480, value: 64 },
			]);

			const controlChanges = new Map([[0, controlChangeList]]);

			const channel = createMockChannel(1, controlChanges);
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

			const removeControlChanges = RemoveControlChanges({
				bus: busMock,
				history: historyMock,
				songStore: songStoreMock,
			});

			// Use Set instead of array
			removeControlChanges({
				channelId: 1,
				type: 0,
				ticks: new Set([0, 480]),
			});

			expect(historyMock.execute).toBeCalledTimes(1);
		});
	});
});
