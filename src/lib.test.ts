import { describe, expect, it } from "bun:test";
import { TICK_PER_MEASURE } from "./constants.ts";
import {
	assert,
	assertNotNullish,
	EmptySet,
	formatDuration,
	isNotNullish,
	isNullish,
	minmax,
	quantize,
	toMutableSet,
	toSet,
} from "./lib.ts";

describe("lib utilities", () => {
	describe("isNullish", () => {
		it("should return true for null", () => {
			expect(isNullish(null)).toBe(true);
		});

		it("should return true for undefined", () => {
			expect(isNullish(undefined)).toBe(true);
		});

		it("should return false for other values", () => {
			expect(isNullish(0)).toBe(false);
			expect(isNullish("")).toBe(false);
			expect(isNullish(false)).toBe(false);
		});
	});

	describe("isNotNullish", () => {
		it("should return false for null", () => {
			expect(isNotNullish(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(isNotNullish(undefined)).toBe(false);
		});

		it("should return true for other values", () => {
			expect(isNotNullish(0)).toBe(true);
			expect(isNotNullish("")).toBe(true);
			expect(isNotNullish(false)).toBe(true);
		});
	});

	describe("assertNotNullish", () => {
		it("should not throw for non-nullish values", () => {
			expect(() => assertNotNullish(42)).not.toThrow();
			expect(() => assertNotNullish("value")).not.toThrow();
		});

		it("should throw for null", () => {
			expect(() => assertNotNullish(null)).toThrow();
		});

		it("should throw for undefined", () => {
			expect(() => assertNotNullish(undefined)).toThrow();
		});

		it("should use custom message", () => {
			expect(() => assertNotNullish(null, "Custom message")).toThrow(
				"Custom message",
			);
		});
	});

	describe("assert", () => {
		it("should not throw for true condition", () => {
			expect(() => assert(true)).not.toThrow();
		});

		it("should throw for false condition", () => {
			expect(() => assert(false)).toThrow();
		});

		it("should use custom message", () => {
			expect(() => assert(false, "Custom message")).toThrow("Custom message");
		});
	});

	describe("minmax", () => {
		it("should clamp value between min and max", () => {
			expect(minmax(0, 10, 5)).toBe(5);
		});

		it("should return min when value is below min", () => {
			expect(minmax(0, 10, -5)).toBe(0);
		});

		it("should return max when value is above max", () => {
			expect(minmax(0, 10, 15)).toBe(10);
		});

		it("should handle null min", () => {
			expect(minmax(null, 10, 20)).toBe(10);
			expect(minmax(null, 10, 5)).toBe(5);
		});

		it("should handle null max", () => {
			expect(minmax(0, null, -5)).toBe(0);
			expect(minmax(0, null, 15)).toBe(15);
		});

		it("should handle both null", () => {
			expect(minmax(null, null, 42)).toBe(42);
		});

		it("should handle edge case when min equals max", () => {
			expect(minmax(5, 5, 3)).toBe(5);
			expect(minmax(5, 5, 7)).toBe(5);
		});
	});

	describe("quantize", () => {
		it("should round to nearest step", () => {
			expect(quantize(53, 96)).toBe(96); // Math.round(53/96) * 96 = 1 * 96 = 96
			expect(quantize(100, 96)).toBe(96); // Math.round(100/96) * 96 = 1 * 96 = 96
		});

		it("should handle zero", () => {
			expect(quantize(0, 96)).toBe(0);
		});

		it("should handle exact multiples", () => {
			expect(quantize(96, 96)).toBe(96);
			expect(quantize(192, 96)).toBe(192);
		});

		it("should handle negative values", () => {
			expect(quantize(-50, 96)).toBe(-96); // Math.round(-50/96) * 96 = -1 * 96 = -96
		});

		it("should handle step of 1", () => {
			expect(quantize(5.4, 1)).toBe(5);
			expect(quantize(5.6, 1)).toBe(6);
		});
	});

	describe("formatDuration", () => {
		it("should format whole note", () => {
			expect(formatDuration(TICK_PER_MEASURE)).toBe("全音符");
		});

		it("should format half note", () => {
			expect(formatDuration(TICK_PER_MEASURE / 2)).toBe("2分音符");
		});

		it("should format quarter note", () => {
			expect(formatDuration(TICK_PER_MEASURE / 4)).toBe("4分音符");
		});

		it("should format eighth note", () => {
			expect(formatDuration(TICK_PER_MEASURE / 8)).toBe("8分音符");
		});

		it("should format sixteenth note", () => {
			expect(formatDuration(TICK_PER_MEASURE / 16)).toBe("16分音符");
		});

		it("should format thirty-second note", () => {
			expect(formatDuration(TICK_PER_MEASURE / 32)).toBe("32分音符");
		});

		it("should format sixty-fourth note", () => {
			expect(formatDuration(TICK_PER_MEASURE / 64)).toBe("64分音符");
		});

		it("should format unknown duration as tick", () => {
			expect(formatDuration(123)).toBe("123 tick");
			expect(formatDuration(999)).toBe("999 tick");
		});
	});

	describe("toSet", () => {
		it("should return the same Set if already a Set", () => {
			const original = new Set([1, 2, 3]);
			const result = toSet(original);

			expect(result).toBe(original);
		});

		it("should convert array to Set", () => {
			const result = toSet([1, 2, 3]);

			expect(result instanceof Set).toBe(true);
			expect(result.size).toBe(3);
			expect(result.has(1)).toBe(true);
		});

		it("should handle empty array", () => {
			const result = toSet([]);

			expect(result.size).toBe(0);
		});
	});

	describe("toMutableSet", () => {
		it("should create a new Set from array", () => {
			const result = toMutableSet([1, 2, 3]);

			expect(result instanceof Set).toBe(true);
			expect(result.size).toBe(3);
		});

		it("should create a new Set from Set", () => {
			const original = new Set([1, 2, 3]);
			const result = toMutableSet(original);

			expect(result).not.toBe(original);
			expect(result.size).toBe(3);
		});
	});

	describe("EmptySet", () => {
		it("should be an empty set", () => {
			expect(EmptySet.size).toBe(0);
		});
	});
});
