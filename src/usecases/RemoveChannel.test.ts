import { describe, expect, it, mock } from "bun:test";
import { RemoveChannel } from "./RemoveChannel.ts";
import { Song } from "../models/Song.ts";
import { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Color } from "../Color.ts";

describe("RemoveChannel", () => {
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

	describe("channel removal", () => {
		it("should remove a channel", () => {
			const channel1 = createMockChannel(1);
			const channel2 = createMockChannel(2);

			const song = new Song({
				title: "Test",
				channels: [channel1, channel2],
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

			const removeChannel = RemoveChannel({
				history: historyMock,
				songStore: songStoreMock,
				bus: busMock,
			});

			removeChannel(1);

			expect(historyMock.execute).toBeCalledTimes(1);
			expect(busMock.emitPhasedEvents).toBeCalledWith("channel.remove", 1);
		});

		it("should emit channel.remove event on do", () => {
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

			const removeChannel = RemoveChannel({
				history: historyMock,
				songStore: songStoreMock,
				bus: busMock,
			});

			removeChannel(1);

			expect(busMock.emitPhasedEvents).toBeCalledWith("channel.remove", 1);
		});

		it("should support undo with channel.add event", () => {
			const channel = createMockChannel(1);
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

			const removeChannel = RemoveChannel({
				history: historyMock,
				songStore: songStoreMock,
				bus: busMock,
			});

			busMock.emitPhasedEvents.mockClear();
			removeChannel(1);

			// Execute undo
			undoCommand.undo();

			expect(busMock.emitPhasedEvents).toBeCalledWith("channel.add", channel);
		});

		it("should mark checkpoint after removal", () => {
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

			const removeChannel = RemoveChannel({
				history: historyMock,
				songStore: songStoreMock,
				bus: busMock,
			});

			removeChannel(1);

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

			const removeChannel = RemoveChannel({
				history: historyMock,
				songStore: songStoreMock,
				bus: busMock,
			});

			removeChannel(999);

			expect(historyMock.execute).not.toBeCalled();
			expect(historyMock.markCheckpoint).not.toBeCalled();
		});
	});
});
