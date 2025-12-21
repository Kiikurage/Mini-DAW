import { describe, expect, it, mock } from "bun:test";
import { PutControlChange } from "./PutControlChange.ts";
import type { ControlChange } from "../models/ControlChange.ts";

describe("PutControlChange", () => {
	describe("control change put", () => {
		it("should emit control.put event with arguments", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const putControlChange = PutControlChange({
				bus: busMock,
			});

			const changes: ControlChange[] = [
				{ tick: 0, value: 64 },
				{ tick: 480, value: 64 },
			];

			putControlChange({
				channelId: 1,
				type: 0,
				changes,
			});

			expect(busMock.emitPhasedEvents).toBeCalledTimes(1);
			expect(busMock.emitPhasedEvents).toBeCalledWith("control.put", {
				channelId: 1,
				type: 0,
				changes,
			});
		});

		it("should handle single control change", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const putControlChange = PutControlChange({
				bus: busMock,
			});

			const changes: ControlChange[] = [{ tick: 100, value: 50 }];

			putControlChange({
				channelId: 2,
				type: 1,
				changes,
			});

			expect(busMock.emitPhasedEvents).toBeCalledWith("control.put", {
				channelId: 2,
				type: 1,
				changes,
			});
		});

		it("should handle empty changes list", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const putControlChange = PutControlChange({
				bus: busMock,
			});

			putControlChange({
				channelId: 1,
				type: 0,
				changes: [],
			});

			expect(busMock.emitPhasedEvents).toBeCalledWith("control.put", {
				channelId: 1,
				type: 0,
				changes: [],
			});
		});

		it("should work with iterable changes (not just array)", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const putControlChange = PutControlChange({
				bus: busMock,
			});

			const changes = new Set<ControlChange>([
				{ tick: 0, value: 64 },
				{ tick: 480, value: 64 },
			]);

			putControlChange({
				channelId: 1,
				type: 0,
				changes,
			});

			expect(busMock.emitPhasedEvents).toBeCalledTimes(1);
		});

		it("should preserve exact argument values", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const putControlChange = PutControlChange({
				bus: busMock,
			});

			const changes: ControlChange[] = [
				{ tick: 1000, value: 127 },
				{ tick: 2000, value: 0 },
			];

			const args = {
				channelId: 42,
				type: 5,
				changes,
			};

			putControlChange(args);

			expect(busMock.emitPhasedEvents).toBeCalledWith("control.put", args);
		});

		it("should handle different control types", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const putControlChange = PutControlChange({
				bus: busMock,
			});

			const changes: ControlChange[] = [{ tick: 0, value: 64 }];

			// Test different control types
			for (let type = 0; type < 5; type++) {
				putControlChange({
					channelId: 1,
					type,
					changes,
				});
			}

			expect(busMock.emitPhasedEvents).toBeCalledTimes(5);
		});

		it("should handle different channel IDs", () => {
			const busMock = {
				emitPhasedEvents: mock(() => {}),
			} as any;

			const putControlChange = PutControlChange({
				bus: busMock,
			});

			const changes: ControlChange[] = [{ tick: 0, value: 64 }];

			// Test different channel IDs
			for (let channelId = 0; channelId < 16; channelId++) {
				putControlChange({
					channelId,
					type: 0,
					changes,
				});
			}

			expect(busMock.emitPhasedEvents).toBeCalledTimes(16);
		});
	});
});
