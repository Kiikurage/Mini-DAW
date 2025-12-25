import { beforeEach, describe, expect, it, mock } from "bun:test";
import { vibrate, vibrateFeedback } from "./vibrate.ts";

describe("vibrate", () => {
	let originalNavigator: Navigator;
	let mockVibrateFunction: any;

	beforeEach(() => {
		// Save original navigator
		originalNavigator = globalThis.navigator;

		// Mock navigator.vibrate
		mockVibrateFunction = mock(() => true);

		// Create a mock navigator with vibrate method
		const mockNavigator = {
			...originalNavigator,
			vibrate: mockVibrateFunction,
		} as any;

		// Replace global navigator
		Object.defineProperty(globalThis, "navigator", {
			value: mockNavigator,
			writable: true,
			configurable: true,
		});
	});

	describe("vibrate function", () => {
		it("should call navigator.vibrate with a single number", () => {
			vibrate(20);
			expect(mockVibrateFunction).toBeCalledWith(20);
		});

		it("should call navigator.vibrate with an array pattern", () => {
			const pattern = [20, 10, 20, 10, 20];
			vibrate(pattern as any);
			expect(mockVibrateFunction).toBeCalledWith(pattern);
		});

		it("should return true when vibrate succeeds", () => {
			mockVibrateFunction = mock(() => true);
			Object.defineProperty(globalThis.navigator, "vibrate", {
				value: mockVibrateFunction,
			});

			const result = vibrate(20);
			expect(result).toBe(true);
		});

		it("should handle when vibrate returns false", () => {
			mockVibrateFunction = mock(() => false);
			Object.defineProperty(globalThis.navigator, "vibrate", {
				value: mockVibrateFunction,
			});

			const result = vibrate(20);
			expect(result).toBe(false);
		});

		it("should handle zero duration", () => {
			vibrate(0);
			expect(mockVibrateFunction).toBeCalledWith(0);
		});

		it("should handle large pattern arrays", () => {
			const pattern = new Array(20).fill(10);
			vibrate(pattern as any);
			expect(mockVibrateFunction).toBeCalledWith(pattern);
		});

		it("should call vibrate with exact pattern passed", () => {
			const pattern = [100, 50, 100];
			vibrate(pattern as any);
			expect(mockVibrateFunction).toBeCalledWith(pattern);
		});
	});

	describe("vibrateFeedback function", () => {
		it("should call vibrate with 20ms duration", () => {
			mockVibrateFunction = mock(() => true);
			Object.defineProperty(globalThis.navigator, "vibrate", {
				value: mockVibrateFunction,
			});

			vibrateFeedback();
			expect(mockVibrateFunction).toBeCalledWith(20);
		});

		it("should return result from vibrate function", () => {
			mockVibrateFunction = mock(() => true);
			Object.defineProperty(globalThis.navigator, "vibrate", {
				value: mockVibrateFunction,
			});

			const result = vibrateFeedback();
			expect(result).toBe(true);
		});

		it("should handle when vibrate returns false", () => {
			mockVibrateFunction = mock(() => false);
			Object.defineProperty(globalThis.navigator, "vibrate", {
				value: mockVibrateFunction,
			});

			const result = vibrateFeedback();
			expect(result).toBe(false);
		});

		it("should always use 20ms for feedback", () => {
			let capturedPattern: any;
			mockVibrateFunction = mock((pattern) => {
				capturedPattern = pattern;
				return true;
			});
			Object.defineProperty(globalThis.navigator, "vibrate", {
				value: mockVibrateFunction,
			});

			vibrateFeedback();
			expect(capturedPattern).toBe(20);
		});
	});

	describe("optional chaining behavior", () => {
		it("should safely handle missing navigator.vibrate", () => {
			const mockNavigator = {} as any;
			Object.defineProperty(globalThis, "navigator", {
				value: mockNavigator,
				writable: true,
				configurable: true,
			});

			const result = vibrate(20);
			expect(result).toBeUndefined();
		});

		it("should work when navigator exists but vibrate does not", () => {
			const mockNavigator = {
				geolocation: {},
			} as any;
			Object.defineProperty(globalThis, "navigator", {
				value: mockNavigator,
				writable: true,
				configurable: true,
			});

			const result = vibrate(20);
			expect(result).toBeUndefined();
		});
	});
});
