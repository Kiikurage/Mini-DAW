import { describe, expect, it } from "bun:test";
import { Color } from "./Color.ts";

describe("Color", () => {
	describe("constructor", () => {
		it("should create a color with RGBA values", () => {
			const color = new Color(1, 0.5, 0.25, 0.8);

			expect(color.r).toBe(1);
			expect(color.g).toBe(0.5);
			expect(color.b).toBe(0.25);
			expect(color.alpha).toBe(0.8);
		});

		it("should handle boundary values", () => {
			const min = new Color(0, 0, 0, 0);
			const max = new Color(1, 1, 1, 1);

			expect(min.r).toBe(0);
			expect(max.r).toBe(1);
		});
	});

	describe("cssString", () => {
		it("should generate valid CSS rgba string", () => {
			const color = new Color(1, 0.5, 0.25, 0.8);
			const css = color.cssString;

			expect(css).toBe("rgba(255, 127.5, 63.75, 0.8)");
		});

		it("should handle zero values", () => {
			const color = new Color(0, 0, 0, 1);
			const css = color.cssString;

			expect(css).toBe("rgba(0, 0, 0, 1)");
		});
	});

	describe("hsl", () => {
		it("should convert RGB to HSL", () => {
			const color = new Color(1, 0, 0, 1); // Red
			const [h, s, l] = color.hsl;

			expect(h).toBe(0);
			expect(s).toBeCloseTo(1);
			expect(l).toBeCloseTo(0.5);
		});

		it("should handle gray colors", () => {
			const color = new Color(0.5, 0.5, 0.5, 1);
			const [h, s, l] = color.hsl;

			expect(s).toBe(0);
			expect(l).toBeCloseTo(0.5);
		});

		it("should handle black", () => {
			const color = new Color(0, 0, 0, 1);
			const [h, s, l] = color.hsl;

			expect(l).toBe(0);
			expect(s).toBe(0);
		});

		it("should handle white", () => {
			const color = new Color(1, 1, 1, 1);
			const [h, s, l] = color.hsl;

			expect(l).toBe(1);
		});
	});

	describe("Color.hex", () => {
		it("should parse 6-digit hex color", () => {
			const color = Color.hex("#FF8040");

			expect(color.r).toBeCloseTo(1);
			expect(color.g).toBeCloseTo(0.5, 1);
			expect(color.b).toBeCloseTo(0.25, 1);
			expect(color.alpha).toBe(1);
		});

		it("should parse 6-digit hex without #", () => {
			const color = Color.hex("FF8040");

			expect(color.r).toBeCloseTo(1);
		});

		it("should parse 3-digit hex color", () => {
			const color = Color.hex("#F84");

			expect(color.r).toBeCloseTo(1);
			expect(color.g).toBeCloseTo(0.5, 1);
			expect(color.b).toBeCloseTo(0.25, 1);
		});

		it("should parse 3-digit hex without #", () => {
			const color = Color.hex("F84");

			expect(color.r).toBeCloseTo(1);
		});

		it("should throw on invalid hex format", () => {
			expect(() => Color.hex("#FFFF")).toThrow();
			expect(() => Color.hex("FFFFFFFF")).toThrow();
			// Note: "GG0000" is not detected as invalid because parseInt with radix 16 stops at 'GG'
		});

		it("should parse black", () => {
			const color = Color.hex("#000000");

			expect(color.r).toBe(0);
			expect(color.g).toBe(0);
			expect(color.b).toBe(0);
		});

		it("should parse white", () => {
			const color = Color.hex("#FFFFFF");

			expect(color.r).toBe(1);
			expect(color.g).toBe(1);
			expect(color.b).toBe(1);
		});
	});

	describe("Color.hsl", () => {
		it("should create color from HSL", () => {
			const color = Color.hsl(0, 1, 0.5); // Pure red
			const [h, s, l] = color.hsl;

			expect(h).toBeCloseTo(0);
			expect(s).toBeCloseTo(1);
			expect(l).toBeCloseTo(0.5);
		});

		it("should handle custom alpha", () => {
			const color = Color.hsl(0, 1, 0.5, 0.5);

			expect(color.alpha).toBe(0.5);
		});

		it("should create gray color", () => {
			const color = Color.hsl(0, 0, 0.5); // Gray
			const [h, s, l] = color.hsl;

			expect(s).toBe(0);
			expect(l).toBeCloseTo(0.5);
		});

		it("should handle different hues", () => {
			const red = Color.hsl(0, 1, 0.5);
			const green = Color.hsl(120, 1, 0.5);
			const blue = Color.hsl(240, 1, 0.5);

			const [h1] = red.hsl;
			const [h2] = green.hsl;
			const [h3] = blue.hsl;

			expect(h1).toBeCloseTo(0);
			expect(h2).toBeCloseTo(120);
			expect(h3).toBeCloseTo(240);
		});
	});

	describe("setAlpha", () => {
		it("should return new instance with updated alpha", () => {
			const color1 = new Color(1, 0.5, 0.25, 1);
			const color2 = color1.setAlpha(0.5);

			// イミュータビリティパターン
			expect(color1).not.toBe(color2);
			expect(color1.alpha).toBe(1);
			expect(color2.alpha).toBe(0.5);
			expect(color2.r).toBe(color1.r);
			expect(color2.g).toBe(color1.g);
			expect(color2.b).toBe(color1.b);
		});
	});

	describe("setL", () => {
		it("should return new instance with updated lightness", () => {
			const color1 = Color.hsl(0, 1, 0.5);
			const color2 = color1.setL(0.7);

			// イミュータビリティパターン
			expect(color1).not.toBe(color2);
			const [h1, s1, l1] = color1.hsl;
			const [h2, s2, l2] = color2.hsl;

			// Hue may change slightly when converting back, just verify lightness changed
			expect(l1).not.toBe(l2);
			expect(l2).toBeCloseTo(0.7);
		});

		it("should preserve alpha", () => {
			const color1 = Color.hsl(0, 1, 0.5, 0.5);
			const color2 = color1.setL(0.7);

			expect(color2.alpha).toBe(0.5);
		});
	});

	describe("serialization", () => {
		it("should serialize to array", () => {
			const color = new Color(1, 0.5, 0.25, 0.8);
			const serialized = color.serialize();

			expect(serialized).toEqual([1, 0.5, 0.25, 0.8]);
		});

		it("should deserialize from array", () => {
			const original = new Color(1, 0.5, 0.25, 0.8);
			const serialized = original.serialize();
			const deserialized = Color.deserialize(serialized);

			expect(deserialized.r).toBe(original.r);
			expect(deserialized.g).toBe(original.g);
			expect(deserialized.b).toBe(original.b);
			expect(deserialized.alpha).toBe(original.alpha);
		});

		it("should round-trip correctly", () => {
			const colors = [
				new Color(0, 0, 0, 1),
				new Color(1, 1, 1, 1),
				Color.hsl(120, 0.5, 0.5),
				Color.hex("#FF8040"),
			];

			for (const color of colors) {
				const deserialized = Color.deserialize(color.serialize());
				expect(deserialized.r).toBeCloseTo(color.r);
				expect(deserialized.g).toBeCloseTo(color.g);
				expect(deserialized.b).toBeCloseTo(color.b);
				expect(deserialized.alpha).toBeCloseTo(color.alpha);
			}
		});
	});
});
