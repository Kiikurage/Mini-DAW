import { describe, expect, it } from "bun:test";
import { Range } from "./Range.ts";

describe("Range", () => {
	describe("constructor", () => {
		it("should create a range with min and max", () => {
			const range = new Range(0, 100);
			expect(range.min).toBe(0);
			expect(range.max).toBe(100);
		});

		it("should allow equal min and max", () => {
			const range = new Range(50, 50);
			expect(range.min).toBe(50);
			expect(range.max).toBe(50);
		});

		it("should allow min > max (closed interval interpretation)", () => {
			const range = new Range(100, 0);
			expect(range.min).toBe(100);
			expect(range.max).toBe(0);
		});

		it("should handle negative values", () => {
			const range = new Range(-100, -50);
			expect(range.min).toBe(-100);
			expect(range.max).toBe(-50);
		});

		it("should handle zero values", () => {
			const range = new Range(0, 0);
			expect(range.min).toBe(0);
			expect(range.max).toBe(0);
		});

		it("should handle float values", () => {
			const range = new Range(1.5, 2.5);
			expect(range.min).toBe(1.5);
			expect(range.max).toBe(2.5);
		});
	});

	describe("includes", () => {
		it("should return true for value equal to min", () => {
			const range = new Range(0, 100);
			expect(range.includes(0)).toBe(true);
		});

		it("should return true for value equal to max", () => {
			const range = new Range(0, 100);
			expect(range.includes(100)).toBe(true);
		});

		it("should return true for value between min and max", () => {
			const range = new Range(0, 100);
			expect(range.includes(50)).toBe(true);
		});

		it("should return false for value below min", () => {
			const range = new Range(0, 100);
			expect(range.includes(-1)).toBe(false);
		});

		it("should return false for value above max", () => {
			const range = new Range(0, 100);
			expect(range.includes(101)).toBe(false);
		});

		it("should handle single-point ranges", () => {
			const range = new Range(50, 50);
			expect(range.includes(50)).toBe(true);
			expect(range.includes(49)).toBe(false);
			expect(range.includes(51)).toBe(false);
		});

		it("should handle negative ranges", () => {
			const range = new Range(-100, -50);
			expect(range.includes(-100)).toBe(true);
			expect(range.includes(-75)).toBe(true);
			expect(range.includes(-50)).toBe(true);
			expect(range.includes(-101)).toBe(false);
			expect(range.includes(-49)).toBe(false);
		});

		it("should handle ranges crossing zero", () => {
			const range = new Range(-50, 50);
			expect(range.includes(-50)).toBe(true);
			expect(range.includes(0)).toBe(true);
			expect(range.includes(50)).toBe(true);
			expect(range.includes(-51)).toBe(false);
			expect(range.includes(51)).toBe(false);
		});

		it("should handle float values", () => {
			const range = new Range(1.5, 2.5);
			expect(range.includes(1.5)).toBe(true);
			expect(range.includes(2.0)).toBe(true);
			expect(range.includes(2.5)).toBe(true);
			expect(range.includes(1.4)).toBe(false);
			expect(range.includes(2.6)).toBe(false);
		});

		it("should handle reversed ranges (min > max)", () => {
			const range = new Range(100, 0);
			// With min > max, includes will check: 100 <= value && value <= 0
			// This will always be false
			expect(range.includes(50)).toBe(false);
			expect(range.includes(0)).toBe(false);
			expect(range.includes(100)).toBe(false);
		});
	});

	describe("copy", () => {
		it("should create a new Range instance with same values", () => {
			const range = new Range(0, 100);
			const copy = range.copy();

			expect(copy.min).toBe(0);
			expect(copy.max).toBe(100);
		});

		it("should create a different object instance", () => {
			const range = new Range(0, 100);
			const copy = range.copy();

			expect(copy).not.toBe(range);
		});

		it("should create independent copy", () => {
			const range = new Range(0, 100);
			const copy = range.copy();

			// Modify original
			range.min = 10;
			range.max = 90;

			// Copy should be unchanged
			expect(copy.min).toBe(0);
			expect(copy.max).toBe(100);
		});

		it("should copy negative ranges", () => {
			const range = new Range(-100, -50);
			const copy = range.copy();

			expect(copy.min).toBe(-100);
			expect(copy.max).toBe(-50);
		});

		it("should copy float ranges", () => {
			const range = new Range(1.5, 2.5);
			const copy = range.copy();

			expect(copy.min).toBe(1.5);
			expect(copy.max).toBe(2.5);
		});

		it("should copy equal min/max ranges", () => {
			const range = new Range(42, 42);
			const copy = range.copy();

			expect(copy.min).toBe(42);
			expect(copy.max).toBe(42);
		});
	});

	describe("integration", () => {
		it("should include same values as original after copy", () => {
			const range = new Range(0, 100);
			const copy = range.copy();

			expect(copy.includes(50)).toBe(range.includes(50));
			expect(copy.includes(0)).toBe(range.includes(0));
			expect(copy.includes(100)).toBe(range.includes(100));
			expect(copy.includes(-1)).toBe(range.includes(-1));
			expect(copy.includes(101)).toBe(range.includes(101));
		});

		it("should maintain encapsulation with copy", () => {
			const range = new Range(10, 20);
			const copy = range.copy();

			copy.min = 15;
			expect(range.includes(12)).toBe(true);
			expect(copy.includes(12)).toBe(false);
		});
	});
});
