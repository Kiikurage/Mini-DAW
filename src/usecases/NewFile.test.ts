import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";
import { NewFile } from "./NewFile.ts";

describe("NewFile", () => {
	let originalConfirm: typeof confirm;

	beforeEach(() => {
		originalConfirm = globalThis.confirm;
	});

	afterEach(() => {
		Object.defineProperty(globalThis, "confirm", {
			value: originalConfirm,
			writable: true,
			configurable: true,
		});
	});

	describe("without confirmation", () => {
		it("should create new file without confirmation dialog", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const newFile = NewFile({
				bus: busMock,
			});

			newFile(false);

			expect(busMock.emitPhasedEvents).toBeCalledTimes(1);
			expect(busMock.emitPhasedEvents.mock.calls[0][0]).toBe("song.put");
		});

		it("should emit song.put with new song", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const newFile = NewFile({
				bus: busMock,
			});

			newFile(false);

			const song = busMock.emitPhasedEvents.mock.calls[0][1];
			expect(song.title).toBe("Untitled");
			expect(song.bpm).toBe(120);
		});

		it("should create default channels", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const newFile = NewFile({
				bus: busMock,
			});

			newFile(false);

			const song = busMock.emitPhasedEvents.mock.calls[0][1];
			expect(song.channels).toHaveLength(3);
		});

		it("should create channels with correct properties", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const newFile = NewFile({
				bus: busMock,
			});

			newFile(false);

			const song = busMock.emitPhasedEvents.mock.calls[0][1];
			for (let i = 0; i < 3; i++) {
				expect(song.channels[i].id).toBe(i);
				expect(song.channels[i].label).toBe("");
				expect(song.channels[i].notes.size).toBe(0);
			}
		});
	});

	describe("with confirmation", () => {
		it("should show confirmation dialog when withConfirmation is true", () => {
			const confirmMock = mock(() => true);
			Object.defineProperty(globalThis, "confirm", {
				value: confirmMock,
				writable: true,
				configurable: true,
			});

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const newFile = NewFile({
				bus: busMock,
			});

			newFile(true);

			expect(confirmMock).toBeCalledTimes(1);
		});

		it("should create new file when user confirms", () => {
			const confirmMock = mock(() => true);
			Object.defineProperty(globalThis, "confirm", {
				value: confirmMock,
				writable: true,
				configurable: true,
			});

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const newFile = NewFile({
				bus: busMock,
			});

			newFile(true);

			expect(busMock.emitPhasedEvents).toBeCalledTimes(1);
		});

		it("should not create new file when user cancels", () => {
			const confirmMock = mock(() => false);
			Object.defineProperty(globalThis, "confirm", {
				value: confirmMock,
				writable: true,
				configurable: true,
			});

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const newFile = NewFile({
				bus: busMock,
			});

			newFile(true);

			expect(busMock.emitPhasedEvents).not.toBeCalled();
		});

		it("should show confirmation message", () => {
			let capturedMessage = "";
			const confirmMock = mock((message: string) => {
				capturedMessage = message;
				return true;
			});
			Object.defineProperty(globalThis, "confirm", {
				value: confirmMock,
				writable: true,
				configurable: true,
			});

			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const newFile = NewFile({
				bus: busMock,
			});

			newFile(true);

			expect(capturedMessage).toContain("新規作成");
		});
	});

	describe("new song properties", () => {
		it("should set title to Untitled", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const newFile = NewFile({
				bus: busMock,
			});

			newFile(false);

			const song = busMock.emitPhasedEvents.mock.calls[0][1];
			expect(song.title).toBe("Untitled");
		});

		it("should set BPM to 120", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const newFile = NewFile({
				bus: busMock,
			});

			newFile(false);

			const song = busMock.emitPhasedEvents.mock.calls[0][1];
			expect(song.bpm).toBe(120);
		});

		it("should create exactly 3 channels", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const newFile = NewFile({
				bus: busMock,
			});

			newFile(false);

			const song = busMock.emitPhasedEvents.mock.calls[0][1];
			expect(song.channels.length).toBe(3);
		});

		it("should assign different colors to channels", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const newFile = NewFile({
				bus: busMock,
			});

			newFile(false);

			const song = busMock.emitPhasedEvents.mock.calls[0][1];
			const color0 = song.channels[0].color;
			const color1 = song.channels[1].color;
			const color2 = song.channels[2].color;

			// Colors should be different objects (from Channel.COLORS array)
			expect(color0).not.toBe(color1);
			expect(color1).not.toBe(color2);
		});
	});
});
