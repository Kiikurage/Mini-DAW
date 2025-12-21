import { describe, expect, it } from "bun:test";
import { Sample } from "./Sample.ts";
import type { SHDR } from "./sf2.ts";

describe("Sample", () => {
	describe("constructor", () => {
		it("should create sample with properties", () => {
			const sampleData = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]);
			const sample = new Sample({
				name: "Test Sample",
				key: 60,
				sample: sampleData,
				rate: 44100,
				loopStartIndex: 100,
				loopEndIndex: 200,
			});

			expect(sample.name).toBe("Test Sample");
			expect(sample.key).toBe(60);
			expect(sample.sample).toBe(sampleData);
			expect(sample.rate).toBe(44100);
			expect(sample.loopStartIndex).toBe(100);
			expect(sample.loopEndIndex).toBe(200);
		});

		it("should handle empty sample data", () => {
			const sampleData = new Float32Array([]);
			const sample = new Sample({
				name: "Empty",
				key: 60,
				sample: sampleData,
				rate: 44100,
				loopStartIndex: 0,
				loopEndIndex: 0,
			});

			expect(sample.sample.length).toBe(0);
		});

		it("should handle large sample data", () => {
			const sampleData = new Float32Array(1000000);
			const sample = new Sample({
				name: "Large",
				key: 60,
				sample: sampleData,
				rate: 44100,
				loopStartIndex: 0,
				loopEndIndex: 1000000,
			});

			expect(sample.sample.length).toBe(1000000);
		});

		it("should support different key values", () => {
			for (let key = 0; key <= 127; key += 12) {
				const sample = new Sample({
					name: "Test",
					key,
					sample: new Float32Array([0.1]),
					rate: 44100,
					loopStartIndex: 0,
					loopEndIndex: 1,
				});

				expect(sample.key).toBe(key);
			}
		});

		it("should support different sample rates", () => {
			const rates = [8000, 16000, 22050, 44100, 48000, 96000];

			for (const rate of rates) {
				const sample = new Sample({
					name: "Test",
					key: 60,
					sample: new Float32Array([0.1]),
					rate,
					loopStartIndex: 0,
					loopEndIndex: 1,
				});

				expect(sample.rate).toBe(rate);
			}
		});
	});

	describe("loopStartSeconds", () => {
		it("should calculate loop start time", () => {
			const sample = new Sample({
				name: "Test",
				key: 60,
				sample: new Float32Array(44100),
				rate: 44100,
				loopStartIndex: 22050,
				loopEndIndex: 44100,
			});

			expect(sample.loopStartSeconds).toBeCloseTo(0.5, 5);
		});

		it("should return 0 when loop starts at index 0", () => {
			const sample = new Sample({
				name: "Test",
				key: 60,
				sample: new Float32Array(100),
				rate: 44100,
				loopStartIndex: 0,
				loopEndIndex: 50,
			});

			expect(sample.loopStartSeconds).toBe(0);
		});

		it("should work with different sample rates", () => {
			const sampleAt48k = new Sample({
				name: "Test",
				key: 60,
				sample: new Float32Array(96000),
				rate: 48000,
				loopStartIndex: 24000,
				loopEndIndex: 48000,
			});

			expect(sampleAt48k.loopStartSeconds).toBeCloseTo(0.5, 5);
		});

		it("should handle fractional seconds", () => {
			const sample = new Sample({
				name: "Test",
				key: 60,
				sample: new Float32Array(44100),
				rate: 44100,
				loopStartIndex: 11025,
				loopEndIndex: 22050,
			});

			expect(sample.loopStartSeconds).toBeCloseTo(0.25, 5);
		});
	});

	describe("loopEndSeconds", () => {
		it("should calculate loop end time", () => {
			const sample = new Sample({
				name: "Test",
				key: 60,
				sample: new Float32Array(44100),
				rate: 44100,
				loopStartIndex: 0,
				loopEndIndex: 22050,
			});

			expect(sample.loopEndSeconds).toBeCloseTo(0.5, 5);
		});

		it("should return 0 when loop ends at index 0", () => {
			const sample = new Sample({
				name: "Test",
				key: 60,
				sample: new Float32Array(100),
				rate: 44100,
				loopStartIndex: 0,
				loopEndIndex: 0,
			});

			expect(sample.loopEndSeconds).toBe(0);
		});

		it("should match sample duration when looping entire sample", () => {
			const duration = 100;
			const rate = 44100;
			const expectedSeconds = duration / rate;

			const sample = new Sample({
				name: "Test",
				key: 60,
				sample: new Float32Array(duration),
				rate,
				loopStartIndex: 0,
				loopEndIndex: duration,
			});

			expect(sample.loopEndSeconds).toBeCloseTo(expectedSeconds, 5);
		});
	});

	describe("create static method", () => {
		it("should create sample from SHDR", () => {
			const buffer = new Int16Array([100, 200, 300, 400, 500]);
			const shdr: SHDR = {
				name: "Test",
				start: 1,
				end: 4,
				startLoop: 1,
				endLoop: 4,
				sampleRate: 44100,
				originalPitch: 60,
				pitchCorrection: 0,
			};

			const sample = Sample.create(buffer, shdr);

			expect(sample.name).toBe("Test");
			expect(sample.key).toBe(60);
			expect(sample.rate).toBe(44100);
		});

		it("should normalize audio data to [-1, 1] range", () => {
			const buffer = new Int16Array([32767, -32768, 0]);
			const shdr: SHDR = {
				name: "Test",
				start: 0,
				end: 3,
				startLoop: 0,
				endLoop: 3,
				sampleRate: 44100,
				originalPitch: 60,
				pitchCorrection: 0,
			};

			const sample = Sample.create(buffer, shdr);

			expect(sample.sample[0]).toBeCloseTo(32767 / 32768, 4);
			expect(sample.sample[1]).toBeCloseTo(-32768 / 32768, 4);
			expect(sample.sample[2]).toBeCloseTo(0, 5);
		});

		it("should handle loop point offsets correctly", () => {
			const buffer = new Int16Array([
				0, 100, 200, 300, 400, 500, 600, 700,
			]);
			const shdr: SHDR = {
				name: "Test",
				start: 2,
				end: 6,
				startLoop: 3,
				endLoop: 5,
				sampleRate: 44100,
				originalPitch: 60,
				pitchCorrection: 0,
			};

			const sample = Sample.create(buffer, shdr);

			expect(sample.loopStartIndex).toBe(1); // 3 - 2
			expect(sample.loopEndIndex).toBe(3); // 5 - 2
		});

		it("should handle pitch correction (not applied, just stored)", () => {
			const buffer = new Int16Array([100, 200]);
			const shdr: SHDR = {
				name: "Test",
				start: 0,
				end: 2,
				startLoop: 0,
				endLoop: 2,
				sampleRate: 44100,
				originalPitch: 60,
				pitchCorrection: 50,
			};

			const sample = Sample.create(buffer, shdr);

			// pitchCorrection is in SHDR but not stored in Sample
			expect(sample.key).toBe(60);
		});
	});

	describe("edge cases", () => {
		it("should handle loop region larger than sample", () => {
			const sample = new Sample({
				name: "Test",
				key: 60,
				sample: new Float32Array(100),
				rate: 44100,
				loopStartIndex: 0,
				loopEndIndex: 200, // larger than sample
			});

			expect(sample.loopEndIndex).toBe(200);
			expect(sample.loopEndSeconds).toBeCloseTo(200 / 44100, 5);
		});

		it("should handle reversed loop points (invalid but tolerated)", () => {
			const sample = new Sample({
				name: "Test",
				key: 60,
				sample: new Float32Array(100),
				rate: 44100,
				loopStartIndex: 80,
				loopEndIndex: 20, // reversed
			});

			expect(sample.loopStartSeconds).toBeCloseTo(80 / 44100, 5);
			expect(sample.loopEndSeconds).toBeCloseTo(20 / 44100, 5);
		});
	});
});
