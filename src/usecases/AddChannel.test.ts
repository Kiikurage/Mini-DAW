import { describe, expect, it, mock } from "bun:test";
import { AddChannel } from "./AddChannel.ts";
import { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Color } from "../Color.ts";

describe("AddChannel", () => {
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

	describe("channel addition", () => {
		it("should add a channel", () => {
			const newChannel = createMockChannel(1);

			const historyMock = {
				execute: mock((command: any) => {
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const editorMock = {
				setActiveChannel: mock(() => {}),
			} as any;

			const addChannel = AddChannel({
				history: historyMock,
				bus: busMock,
				editor: editorMock,
			});

			addChannel(newChannel);

			expect(historyMock.execute).toBeCalledTimes(1);
			expect(busMock.emitPhasedEvents).toBeCalledWith(
				"channel.add",
				newChannel,
			);
		});

		it("should emit channel.add event on do", () => {
			const newChannel = createMockChannel(1);

			const historyMock = {
				execute: mock((command: any) => {
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const editorMock = {
				setActiveChannel: mock(() => {}),
			} as any;

			const addChannel = AddChannel({
				history: historyMock,
				bus: busMock,
				editor: editorMock,
			});

			addChannel(newChannel);

			expect(busMock.emitPhasedEvents).toBeCalledWith(
				"channel.add",
				newChannel,
			);
		});

		it("should support undo with channel.remove event", () => {
			const newChannel = createMockChannel(1);

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

			const editorMock = {
				setActiveChannel: mock(() => {}),
			} as any;

			const addChannel = AddChannel({
				history: historyMock,
				bus: busMock,
				editor: editorMock,
			});

			busMock.emitPhasedEvents.mockClear();
			addChannel(newChannel);

			// Execute undo
			undoCommand.undo();

			expect(busMock.emitPhasedEvents).toBeCalledWith("channel.remove", 1);
		});

		it("should set active channel after addition", () => {
			const newChannel = createMockChannel(5);

			const historyMock = {
				execute: mock((command: any) => {
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const editorMock = {
				setActiveChannel: mock(() => {}),
			} as any;

			const addChannel = AddChannel({
				history: historyMock,
				bus: busMock,
				editor: editorMock,
			});

			addChannel(newChannel);

			expect(editorMock.setActiveChannel).toBeCalledWith(5);
		});

		it("should mark checkpoint after addition", () => {
			const newChannel = createMockChannel(1);

			const historyMock = {
				execute: mock((command: any) => {
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const editorMock = {
				setActiveChannel: mock(() => {}),
			} as any;

			const addChannel = AddChannel({
				history: historyMock,
				bus: busMock,
				editor: editorMock,
			});

			addChannel(newChannel);

			expect(historyMock.markCheckpoint).toBeCalledTimes(1);
		});
	});

	describe("multiple channels", () => {
		it("should add different channels in sequence", () => {
			const channel1 = createMockChannel(1);
			const channel2 = createMockChannel(2);

			const historyMock = {
				execute: mock((command: any) => {
					command.do();
				}),
				markCheckpoint: mock(() => {}),
			} as any;

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const editorMock = {
				setActiveChannel: mock(() => {}),
			} as any;

			const addChannel = AddChannel({
				history: historyMock,
				bus: busMock,
				editor: editorMock,
			});

			addChannel(channel1);
			addChannel(channel2);

			expect(historyMock.execute).toBeCalledTimes(2);
			expect(editorMock.setActiveChannel).toBeCalledTimes(2);
			expect(editorMock.setActiveChannel).toBeCalledWith(2);
		});
	});
});
