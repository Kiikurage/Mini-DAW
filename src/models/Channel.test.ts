import { describe, expect, it } from "bun:test";
import { Color } from "../Color.ts";
import { Channel } from "./Channel.ts";
import { InstrumentKey } from "./InstrumentKey.ts";
import { Note } from "./Note.ts";

describe("Channel", () => {
	const createTestChannel = (props: { notes?: Map<number, Note> } = {}) => {
		return new Channel({
			id: 0,
			label: "Test Channel",
			instrumentKey: new InstrumentKey("GeneralUser GS", 0, 0),
			notes: props.notes ?? new Map(),
			controlChanges: new Map(),
			color: Color.hsl(0, 0.5, 0.5),
		});
	};

	describe("initialization", () => {
		it("should create a channel with specified properties", () => {
			const channel = createTestChannel();

			expect(channel.id).toBe(0);
			expect(channel.label).toBe("Test Channel");
			expect(channel.notes.size).toBe(0);
		});
	});

	describe("lastTickFrom", () => {
		it("should return 0 when no notes", () => {
			const channel = createTestChannel();
			expect(channel.lastTickFrom).toBe(0);
		});

		it("should return the maximum tickFrom among notes", () => {
			const notes = new Map([
				[
					1,
					Note.create({
						id: 1,
						key: 60,
						tickFrom: 100,
						tickTo: 200,
						velocity: 80,
					}),
				],
				[
					2,
					Note.create({
						id: 2,
						key: 60,
						tickFrom: 500,
						tickTo: 600,
						velocity: 80,
					}),
				],
				[
					3,
					Note.create({
						id: 3,
						key: 60,
						tickFrom: 300,
						tickTo: 400,
						velocity: 80,
					}),
				],
			]);

			const channel = createTestChannel({ notes });
			expect(channel.lastTickFrom).toBe(500);
		});
	});

	describe("tickTo", () => {
		it("should return 0 when no notes", () => {
			const channel = createTestChannel();
			expect(channel.tickTo).toBe(0);
		});

		it("should return the maximum tickTo among notes", () => {
			const notes = new Map([
				[
					1,
					Note.create({
						id: 1,
						key: 60,
						tickFrom: 0,
						tickTo: 200,
						velocity: 80,
					}),
				],
				[
					2,
					Note.create({
						id: 2,
						key: 60,
						tickFrom: 100,
						tickTo: 600,
						velocity: 80,
					}),
				],
				[
					3,
					Note.create({
						id: 3,
						key: 60,
						tickFrom: 200,
						tickTo: 400,
						velocity: 80,
					}),
				],
			]);

			const channel = createTestChannel({ notes });
			expect(channel.tickTo).toBe(600);
		});
	});

	describe("labelOrDefault", () => {
		it("should return the label if not empty", () => {
			const channel = createTestChannel();
			expect(channel.labelOrDefault).toBe("Test Channel");
		});

		it("should return default label if empty", () => {
			const channel = new Channel({
				id: 5,
				label: "",
				instrumentKey: new InstrumentKey("GeneralUser GS", 0, 0),
				notes: new Map(),
				controlChanges: new Map(),
				color: Color.hsl(0, 0.5, 0.5),
			});

			expect(channel.labelOrDefault).toBe("Channel 6");
		});

		it("should return default label if whitespace only", () => {
			const channel = new Channel({
				id: 3,
				label: "   ",
				instrumentKey: new InstrumentKey("GeneralUser GS", 0, 0),
				notes: new Map(),
				controlChanges: new Map(),
				color: Color.hsl(0, 0.5, 0.5),
			});

			expect(channel.labelOrDefault).toBe("Channel 4");
		});
	});

	describe("removeNotes", () => {
		it("should return a new instance when notes are removed", () => {
			const notes = new Map([
				[
					1,
					Note.create({
						id: 1,
						key: 60,
						tickFrom: 0,
						tickTo: 100,
						velocity: 80,
					}),
				],
				[
					2,
					Note.create({
						id: 2,
						key: 60,
						tickFrom: 100,
						tickTo: 200,
						velocity: 80,
					}),
				],
			]);
			const channel1 = createTestChannel({ notes });
			const channel2 = channel1.removeNotes([1]);

			// イミュータビリティパターン
			expect(channel1).not.toBe(channel2);
			expect(channel1.notes.size).toBe(2);
			expect(channel2.notes.size).toBe(1);
			expect(channel2.notes.has(2)).toBe(true);
		});

		it("should return the same instance if no notes match", () => {
			const notes = new Map([
				[
					1,
					Note.create({
						id: 1,
						key: 60,
						tickFrom: 0,
						tickTo: 100,
						velocity: 80,
					}),
				],
			]);
			const channel1 = createTestChannel({ notes });
			const channel2 = channel1.removeNotes([999]);

			expect(channel1).toBe(channel2);
		});

		it("should remove multiple notes", () => {
			const notes = new Map([
				[
					1,
					Note.create({
						id: 1,
						key: 60,
						tickFrom: 0,
						tickTo: 100,
						velocity: 80,
					}),
				],
				[
					2,
					Note.create({
						id: 2,
						key: 60,
						tickFrom: 100,
						tickTo: 200,
						velocity: 80,
					}),
				],
				[
					3,
					Note.create({
						id: 3,
						key: 60,
						tickFrom: 200,
						tickTo: 300,
						velocity: 80,
					}),
				],
			]);
			const channel = createTestChannel({ notes });
			const updated = channel.removeNotes([1, 3]);

			expect(updated.notes.size).toBe(1);
			expect(updated.notes.has(2)).toBe(true);
		});
	});

	describe("putNotes", () => {
		it("should add new notes", () => {
			const channel = createTestChannel();
			const newNote = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 100,
				velocity: 80,
			});
			const updated = channel.putNotes([newNote]);

			// イミュータビリティパターン
			expect(channel).not.toBe(updated);
			expect(channel.notes.size).toBe(0);
			expect(updated.notes.size).toBe(1);
			expect(updated.notes.get(1)).toEqual(newNote);
		});

		it("should update existing notes", () => {
			const originalNote = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 100,
				velocity: 80,
			});
			const notes = new Map([[1, originalNote]]);
			const channel = createTestChannel({ notes });

			const updatedNote = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 150,
				velocity: 100,
			});
			const result = channel.putNotes([updatedNote]);

			expect(result.notes.get(1)?.tickTo).toBe(150);
			expect(result.notes.get(1)?.velocity).toBe(100);
		});

		it("should return the same instance if notes are unchanged", () => {
			const originalNote = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 100,
				velocity: 80,
			});
			const notes = new Map([[1, originalNote]]);
			const channel = createTestChannel({ notes });

			const result = channel.putNotes([originalNote]);
			expect(channel).toBe(result);
		});

		it("should handle multiple notes", () => {
			const channel = createTestChannel();
			const note1 = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 100,
				velocity: 80,
			});
			const note2 = Note.create({
				id: 2,
				key: 61,
				tickFrom: 100,
				tickTo: 200,
				velocity: 80,
			});

			const updated = channel.putNotes([note1, note2]);
			expect(updated.notes.size).toBe(2);
		});
	});

	describe("setLabel", () => {
		it("should return a new instance when label changes", () => {
			const channel1 = createTestChannel();
			const channel2 = channel1.setLabel("New Label");

			// イミュータビリティパターン
			expect(channel1).not.toBe(channel2);
			expect(channel1.label).toBe("Test Channel");
			expect(channel2.label).toBe("New Label");
		});

		it("should return the same instance if label is unchanged", () => {
			const channel1 = createTestChannel();
			const channel2 = channel1.setLabel("Test Channel");

			expect(channel1).toBe(channel2);
		});
	});

	describe("setInstrumentKey", () => {
		it("should return a new instance when instrument key changes", () => {
			const channel1 = createTestChannel();
			const newKey = new InstrumentKey("GeneralUser GS", 0, 1);
			const channel2 = channel1.setInstrumentKey(newKey);

			// イミュータビリティパターン
			expect(channel1).not.toBe(channel2);
			expect(channel1.instrumentKey.bankNumber).toBe(0);
			expect(channel2.instrumentKey.bankNumber).toBe(1);
		});

		it("should return the same instance if instrument key is unchanged", () => {
			const key = new InstrumentKey("GeneralUser GS", 0, 0);
			const channel1 = new Channel({
				id: 0,
				label: "Test",
				instrumentKey: key,
				notes: new Map(),
				controlChanges: new Map(),
				color: Color.hsl(0, 0.5, 0.5),
			});
			const channel2 = channel1.setInstrumentKey(key);

			expect(channel1).toBe(channel2);
		});
	});
});
