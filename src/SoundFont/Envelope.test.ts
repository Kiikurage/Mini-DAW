import { describe, expect, it } from "bun:test";
import { Envelope } from "./Envelope.ts";

describe("Envelope", () => {
	describe("getValueAt", () => {
		it("should return 0 before delay", () => {
			const envelope = new Envelope({
				delay: 0.1,
				attack: 0.1,
			});

			expect(envelope.getValueAt(0)).toBe(0);
			expect(envelope.getValueAt(0.05)).toBe(0);
		});

		it("should return interpolated value during attack", () => {
			const envelope = new Envelope({
				delay: 0,
				attack: 0.1,
			});

			const valueHalf = envelope.getValueAt(0.05);
			expect(valueHalf).toBeCloseTo(0.5, 1);

			const valueEnd = envelope.getValueAt(0.1);
			expect(valueEnd).toBeCloseTo(1, 1);
		});

		it("should return 1 during hold", () => {
			const envelope = new Envelope({
				delay: 0,
				attack: 0.1,
				hold: 0.1,
			});

			const valueDuringHold = envelope.getValueAt(0.15);
			expect(valueDuringHold).toBe(1);
		});

		it("should interpolate value during decay", () => {
			const envelope = new Envelope({
				delay: 0,
				attack: 0.1,
				hold: 0,
				decay: 0.1,
				sustain: 0.5,
			});

			const valueHalf = envelope.getValueAt(0.15);
			expect(valueHalf).toBeCloseTo(0.75, 1);

			const valueEnd = envelope.getValueAt(0.2);
			expect(valueEnd).toBeCloseTo(0.5, 1);
		});

		it("should return sustain level after decay", () => {
			const envelope = new Envelope({
				delay: 0,
				attack: 0.1,
				hold: 0,
				decay: 0.1,
				sustain: 0.6,
			});

			const valueSustain = envelope.getValueAt(0.3);
			expect(valueSustain).toBeCloseTo(0.6, 1);
		});

		it("should handle zero attack time", () => {
			const envelope = new Envelope({
				delay: 0,
				attack: 0,
				hold: 0,
			});

			const value = envelope.getValueAt(0);
			expect(value).toBeCloseTo(1, 1);
		});

		it("should handle zero sustain", () => {
			const envelope = new Envelope({
				delay: 0,
				attack: 0,
				hold: 0,
				decay: 0.1,
				sustain: 0,
			});

			const valueSustain = envelope.getValueAt(0.2);
			expect(valueSustain).toBeCloseTo(0, 1);
		});

		it("should handle full sustain (1.0)", () => {
			const envelope = new Envelope({
				delay: 0,
				attack: 0,
				hold: 0,
				decay: 0.1,
				sustain: 1.0,
			});

			const valueDuringDecay = envelope.getValueAt(0.15);
			expect(valueDuringDecay).toBeCloseTo(1, 1);

			const valueSustain = envelope.getValueAt(0.3);
			expect(valueSustain).toBeCloseTo(1, 1);
		});

		it("should have zero release effect in getValueAt", () => {
			const envelope = new Envelope({
				attack: 0.1,
				release: 0.5, // Release should not affect getValueAt
			});

			const value = envelope.getValueAt(0.1);
			expect(value).toBeCloseTo(1, 1);
		});
	});

	describe("initialization", () => {
		it("should have default values", () => {
			const envelope = new Envelope();

			expect(envelope.delay).toBe(0);
			expect(envelope.attack).toBe(0);
			expect(envelope.hold).toBe(0);
			expect(envelope.decay).toBe(0);
			expect(envelope.sustain).toBe(1);
			expect(envelope.release).toBe(0);
		});
	});

	describe("edge cases", () => {
		it("should handle very small time values", () => {
			const envelope = new Envelope({
				attack: 0.001,
			});

			const value = envelope.getValueAt(0.0005);
			expect(value).toBeGreaterThan(0);
			expect(value).toBeLessThan(1);
		});

		it("should handle very large time values", () => {
			const envelope = new Envelope({
				decay: 10,
				sustain: 0.5,
			});

			const value = envelope.getValueAt(100);
			expect(value).toBeCloseTo(0.5, 1);
		});

		it("should handle sustain greater than 1 (edge case)", () => {
			const envelope = new Envelope({
				attack: 0,
				decay: 0.1,
				sustain: 1.5, // Sustain level > 1
			});

			const value = envelope.getValueAt(0.2);
			// Should still follow the math, even if sustain > 1
			expect(value).toBeCloseTo(1.5, 1);
		});
	});

	describe("ADSR envelope behavior", () => {
		it("should follow ADSR pattern (Attack, Decay, Sustain, Release disabled)", () => {
			const envelope = new Envelope({
				attack: 0.1,
				hold: 0.05,
				decay: 0.2,
				sustain: 0.4,
			});

			// Attack phase (0 to 0.1s)
			expect(envelope.getValueAt(0)).toBe(0);
			expect(envelope.getValueAt(0.05)).toBeCloseTo(0.5, 1);
			expect(envelope.getValueAt(0.1)).toBeCloseTo(1, 1);

			// Hold phase (0.1 to 0.15s)
			expect(envelope.getValueAt(0.125)).toBeCloseTo(1, 1);

			// Decay phase (0.15 to 0.35s)
			expect(envelope.getValueAt(0.25)).toBeCloseTo(0.7, 1); // Halfway through decay

			// Sustain phase (after 0.35s)
			expect(envelope.getValueAt(1.0)).toBeCloseTo(0.4, 1);
		});
	});
});
