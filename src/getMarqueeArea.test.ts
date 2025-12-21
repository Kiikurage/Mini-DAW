import { describe, expect, it } from "bun:test";
import { getMarqueeArea } from "./getMarqueeArea.ts";
import type { PianoRollArea } from "./models/PianoRollArea.ts";

describe("getMarqueeArea", () => {
	describe("when both marquee points are provided", () => {
		it("should create area with correct boundaries when from is top-left", () => {
			const from = { key: 60, tick: 100 };
			const to = { key: 72, tick: 500 };

			const area = getMarqueeArea(from, to);

			expect(area).toEqual({
				keyFrom: 60,
				keyTo: 73,
				tickFrom: 100,
				tickTo: 501,
			});
		});

		it("should create area with correct boundaries when from is bottom-right", () => {
			const from = { key: 72, tick: 500 };
			const to = { key: 60, tick: 100 };

			const area = getMarqueeArea(from, to);

			expect(area).toEqual({
				keyFrom: 60,
				keyTo: 73,
				tickFrom: 100,
				tickTo: 501,
			});
		});

		it("should handle same key positions", () => {
			const from = { key: 64, tick: 100 };
			const to = { key: 64, tick: 500 };

			const area = getMarqueeArea(from, to);

			expect(area).toEqual({
				keyFrom: 64,
				keyTo: 65,
				tickFrom: 100,
				tickTo: 501,
			});
		});

		it("should handle same tick positions", () => {
			const from = { key: 60, tick: 300 };
			const to = { key: 72, tick: 300 };

			const area = getMarqueeArea(from, to);

			expect(area).toEqual({
				keyFrom: 60,
				keyTo: 73,
				tickFrom: 300,
				tickTo: 301,
			});
		});

		it("should handle identical positions", () => {
			const from = { key: 64, tick: 300 };
			const to = { key: 64, tick: 300 };

			const area = getMarqueeArea(from, to);

			expect(area).toEqual({
				keyFrom: 64,
				keyTo: 65,
				tickFrom: 300,
				tickTo: 301,
			});
		});

		it("should work with zero tick values", () => {
			const from = { key: 60, tick: 0 };
			const to = { key: 72, tick: 100 };

			const area = getMarqueeArea(from, to);

			expect(area).toEqual({
				keyFrom: 60,
				keyTo: 73,
				tickFrom: 0,
				tickTo: 101,
			});
		});

		it("should work with large tick values", () => {
			const from = { key: 60, tick: 10000 };
			const to = { key: 72, tick: 20000 };

			const area = getMarqueeArea(from, to);

			expect(area).toEqual({
				keyFrom: 60,
				keyTo: 73,
				tickFrom: 10000,
				tickTo: 20001,
			});
		});

		it("should work with negative key values", () => {
			const from = { key: -5, tick: 100 };
			const to = { key: 5, tick: 500 };

			const area = getMarqueeArea(from, to);

			expect(area).toEqual({
				keyFrom: -5,
				keyTo: 6,
				tickFrom: 100,
				tickTo: 501,
			});
		});

		it("should work with high key values", () => {
			const from = { key: 100, tick: 100 };
			const to = { key: 127, tick: 500 };

			const area = getMarqueeArea(from, to);

			expect(area).toEqual({
				keyFrom: 100,
				keyTo: 128,
				tickFrom: 100,
				tickTo: 501,
			});
		});

		it("should include the +1 offset for keyTo", () => {
			const from = { key: 60, tick: 0 };
			const to = { key: 60, tick: 0 };

			const area = getMarqueeArea(from, to);

			expect(area?.keyTo).toBe(61);
		});

		it("should include the +1 offset for tickTo", () => {
			const from = { key: 60, tick: 100 };
			const to = { key: 60, tick: 100 };

			const area = getMarqueeArea(from, to);

			expect(area?.tickTo).toBe(101);
		});
	});

	describe("when marquee points are null", () => {
		it("should return null when from is null", () => {
			const from = null;
			const to = { key: 72, tick: 500 };

			const area = getMarqueeArea(from, to);

			expect(area).toBeNull();
		});

		it("should return null when to is null", () => {
			const from = { key: 60, tick: 100 };
			const to = null;

			const area = getMarqueeArea(from, to);

			expect(area).toBeNull();
		});

		it("should return null when both are null", () => {
			const from = null;
			const to = null;

			const area = getMarqueeArea(from, to);

			expect(area).toBeNull();
		});
	});

	describe("return type", () => {
		it("should return PianoRollArea shape when both points exist", () => {
			const from = { key: 60, tick: 100 };
			const to = { key: 72, tick: 500 };

			const area = getMarqueeArea(from, to) as PianoRollArea;

			expect(area).toHaveProperty("keyFrom");
			expect(area).toHaveProperty("keyTo");
			expect(area).toHaveProperty("tickFrom");
			expect(area).toHaveProperty("tickTo");
		});

		it("should return null when points are missing", () => {
			const area = getMarqueeArea(null, null);

			expect(area).toBeNull();
		});
	});
});
