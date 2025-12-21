import { describe, expect, it } from "bun:test";
import { Time, timecents, seconds } from "./units.ts";

describe("Time", () => {
	describe("timecents", () => {
		it("should create Time from timecent value", () => {
			const time = timecents(1200);
			expect(time.inTimecent()).toBe(1200);
		});

		it("should handle zero timecents", () => {
			const time = timecents(0);
			expect(time.inTimecent()).toBe(0);
			expect(time.inSecond()).toBe(1);
		});

		it("should handle negative timecents", () => {
			const time = timecents(-1200);
			expect(time.inTimecent()).toBe(-1200);
		});

		it("should handle large timecent values", () => {
			const time = timecents(12000);
			expect(time.inTimecent()).toBe(12000);
		});
	});

	describe("seconds", () => {
		it("should create Time from seconds", () => {
			const time = seconds(1);
			expect(time.inSecond()).toBeCloseTo(1, 10);
		});

		it("should handle zero seconds", () => {
			const time = seconds(0);
			// log2(0) = -Infinity, so this will be -Infinity
			expect(Math.log2(0)).toBe(-Infinity);
		});

		it("should handle one second", () => {
			const time = seconds(1);
			expect(time.inTimecent()).toBe(0);
		});

		it("should handle two seconds (one octave up)", () => {
			const time = seconds(2);
			expect(time.inTimecent()).toBeCloseTo(1200, 10);
		});

		it("should handle half second (one octave down)", () => {
			const time = seconds(0.5);
			expect(time.inTimecent()).toBeCloseTo(-1200, 10);
		});

		it("should handle quarter second (two octaves down)", () => {
			const time = seconds(0.25);
			expect(time.inTimecent()).toBeCloseTo(-2400, 10);
		});

		it("should handle four seconds (two octaves up)", () => {
			const time = seconds(4);
			expect(time.inTimecent()).toBeCloseTo(2400, 10);
		});
	});

	describe("conversion round-trip", () => {
		it("should convert timecents to seconds and back", () => {
			const originalTimecents = 1200;
			const time = timecents(originalTimecents);
			const seconds_value = time.inSecond();
			const time2 = seconds(seconds_value);
			expect(time2.inTimecent()).toBeCloseTo(originalTimecents, 10);
		});

		it("should convert seconds to timecents and back", () => {
			const originalSeconds = 2;
			const time = seconds(originalSeconds);
			const timecent_value = time.inTimecent();
			const time2 = timecents(timecent_value);
			expect(time2.inSecond()).toBeCloseTo(originalSeconds, 10);
		});

		it("should handle various timecent values in round-trip", () => {
			const testValues = [0, 100, 600, 1200, 2400, -600, -1200];

			for (const originalTimecents of testValues) {
				const time = timecents(originalTimecents);
				const secondsValue = time.inSecond();
				const time2 = seconds(secondsValue);
				expect(time2.inTimecent()).toBeCloseTo(originalTimecents, 10);
			}
		});
	});

	describe("mathematical relationships", () => {
		it("should follow exponential relationship: 1200 timecents = 1 octave (2x frequency)", () => {
			const baseTime = timecents(0);
			const octaveUpTime = timecents(1200);

			expect(octaveUpTime.inSecond()).toBeCloseTo(
				baseTime.inSecond() * 2,
				10,
			);
		});

		it("should follow exponential relationship: 100 timecents = 1 semitone", () => {
			const c4 = timecents(0);
			const c_sharp_4 = timecents(100);

			// Each semitone is 2^(1/12) = ~1.05946
			const semitoneFactor = 2 ** (1 / 12);
			expect(c_sharp_4.inSecond()).toBeCloseTo(
				c4.inSecond() * semitoneFactor,
				10,
			);
		});

		it("should add timecents for multiplicative frequency ratios", () => {
			const time1 = timecents(600);
			const time2 = timecents(600);

			// 600 + 600 = 1200 timecents = 2x frequency
			const combined = timecents(1200);
			expect(time1.inSecond() * time2.inSecond()).toBeCloseTo(
				combined.inSecond(),
				10,
			);
		});
	});

	describe("edge cases", () => {
		it("should handle very small timecent values", () => {
			const time = timecents(0.01);
			expect(time.inTimecent()).toBe(0.01);
			expect(time.inSecond()).toBeCloseTo(2 ** (0.01 / 1200), 15);
		});

		it("should handle very large timecent values", () => {
			const time = timecents(48000);
			expect(time.inTimecent()).toBe(48000);
		});

		it("should handle fractional seconds", () => {
			const time = seconds(1.5);
			expect(time.inSecond()).toBeCloseTo(1.5, 10);
		});

		it("should maintain precision for mid-range values", () => {
			const time = timecents(5000);
			const secondsValue = time.inSecond();
			const time2 = seconds(secondsValue);
			expect(time2.inTimecent()).toBeCloseTo(5000, 8);
		});
	});
});
