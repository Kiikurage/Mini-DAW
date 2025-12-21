import { describe, expect, it } from "bun:test";
import { InstrumentKey } from "./InstrumentKey.ts";

describe("InstrumentKey", () => {
	describe("constructor", () => {
		it("should create an instrument key with valid sound font", () => {
			const key = new InstrumentKey("GeneralUser GS", 0, 0);

			expect(key.name).toBe("GeneralUser GS");
			expect(key.presetNumber).toBe(0);
			expect(key.bankNumber).toBe(0);
			expect(key.url).toBeTruthy();
		});

		it("should throw on invalid sound font name", () => {
			expect(() => new InstrumentKey("Invalid Sound Font", 0, 0)).toThrow();
		});

		it("should resolve the sound font URL", () => {
			const key = new InstrumentKey("GeneralUser GS", 0, 0);

			expect(key.url).toBeTruthy();
			expect(typeof key.url).toBe("string");
		});

		it("should handle different preset and bank numbers", () => {
			const key = new InstrumentKey("GeneralUser GS", 5, 10);

			expect(key.presetNumber).toBe(5);
			expect(key.bankNumber).toBe(10);
		});
	});

	describe("serialization", () => {
		it("should serialize correctly", () => {
			const key = new InstrumentKey("GeneralUser GS", 5, 10);
			const serialized = key.serialize();

			expect(serialized.name).toBe("GeneralUser GS");
			expect(serialized.presetNumber).toBe(5);
			expect(serialized.bankNumber).toBe(10);
		});

		it("should deserialize correctly", () => {
			const original = new InstrumentKey("GeneralUser GS", 5, 10);
			const serialized = original.serialize();
			const deserialized = InstrumentKey.deserialize(serialized);

			expect(deserialized.name).toBe("GeneralUser GS");
			expect(deserialized.presetNumber).toBe(5);
			expect(deserialized.bankNumber).toBe(10);
			expect(deserialized.url).toBe(original.url);
		});
	});
});
