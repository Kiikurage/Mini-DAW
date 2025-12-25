import { describe, expect, it } from "bun:test";
import { Note } from "./Note.ts";

describe("Note", () => {
	describe("create", () => {
		it("should create a note with specified properties", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 100,
				tickTo: 200,
				velocity: 80,
			});

			expect(note.id).toBe(1);
			expect(note.key).toBe(60);
			expect(note.tickFrom).toBe(100);
			expect(note.tickTo).toBe(200);
			expect(note.velocity).toBe(80);
		});

		it("should normalize negative tickFrom to 0", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: -100,
				tickTo: 200,
				velocity: 80,
			});

			expect(note.tickFrom).toBe(0);
		});

		it("should ensure tickTo >= tickFrom", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 200,
				tickTo: 100,
				velocity: 80,
			});

			expect(note.tickTo).toBe(200);
		});

		it("should normalize negative tickFrom and adjust tickTo", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: -100,
				tickTo: -50,
				velocity: 80,
			});

			expect(note.tickFrom).toBe(0);
			expect(note.tickTo).toBe(0);
		});

		it("should handle zero duration", () => {
			const note = Note.create({
				id: 1,
				key: 60,
				tickFrom: 100,
				tickTo: 100,
				velocity: 80,
			});

			expect(note.tickFrom).toBe(100);
			expect(note.tickTo).toBe(100);
		});
	});
});
