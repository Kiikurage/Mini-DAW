import { describe, expect, it } from "bun:test";
import { computeSelectionArea } from "./computeSelectionArea.tsx";
import type { EditorState } from "./Editor/Editor.ts";
import { EditorSelection } from "./Editor/EditorSelection.ts";
import { Song } from "./models/Song.ts";
import { Channel } from "./models/Channel.ts";
import { Note } from "./models/Note.ts";
import { InstrumentKey } from "./models/InstrumentKey.ts";
import { Color } from "./Color.ts";

describe("computeSelectionArea", () => {
	const createMockChannel = (
		id: number,
		notes: Note[],
	): Channel => {
		const notesMap = new Map(notes.map((note) => [note.id, note]));
		return new Channel({
			id,
			label: `Channel ${id}`,
			instrumentKey: new InstrumentKey("GeneralUser GS", 0, 0),
			notes: notesMap,
			controlChanges: new Map(),
			color: Color.hsl(0, 0, 0),
		});
	};

	const createMockEditorState = (
		activeChannelId: number | null,
		selectedNoteIds: ReadonlySet<number>,
	): EditorState => ({
		newNoteDurationInTick: 480,
		previewChannelIds: new Set(),
		activeChannelId,
		zoom: 1,
		width: 800,
		scrollLeft: 0,
		selection: selectedNoteIds.size > 0
			? {
					type: "note",
					noteIds: selectedNoteIds,
				}
			: EditorSelection.void,
		marqueeAreaFrom: null,
		marqueeAreaTo: null,
		timelineGridUnitInTick: 480,
		quantizeUnitInTick: 480,
		parameterType: 0 as any,
	});

	describe("with selected notes", () => {
		it("should compute area containing all selected notes", () => {
			const note1 = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});
			const note2 = Note.create({
				id: 2,
				key: 64,
				tickFrom: 480,
				tickTo: 960,
				velocity: 85,
			});
			const note3 = Note.create({
				id: 3,
				key: 67,
				tickFrom: 240,
				tickTo: 720,
				velocity: 90,
			});

			const channel = createMockChannel(1, [note1, note2, note3]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(1, new Set([1, 2, 3]));
			const noLoopKeys = new Set<number>();

			const area = computeSelectionArea(noLoopKeys, song, editorState);

			expect(area).not.toBeNull();
			expect(area?.keyFrom).toBe(60);
			expect(area?.keyTo).toBe(68); // max(67) + 1
			expect(area?.tickFrom).toBe(0);
			expect(area?.tickTo).toBe(960);
		});

		it("should compute area with single selected note", () => {
			const note1 = Note.create({
				id: 1,
				key: 64,
				tickFrom: 100,
				tickTo: 600,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note1]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(1, new Set([1]));
			const noLoopKeys = new Set<number>();

			const area = computeSelectionArea(noLoopKeys, song, editorState);

			expect(area).not.toBeNull();
			expect(area?.keyFrom).toBe(64);
			expect(area?.keyTo).toBe(65);
			expect(area?.tickFrom).toBe(100);
			expect(area?.tickTo).toBe(600);
		});

		it("should handle notes with same key", () => {
			const note1 = Note.create({
				id: 1,
				key: 64,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});
			const note2 = Note.create({
				id: 2,
				key: 64,
				tickFrom: 480,
				tickTo: 960,
				velocity: 85,
			});

			const channel = createMockChannel(1, [note1, note2]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(1, new Set([1, 2]));
			const noLoopKeys = new Set<number>();

			const area = computeSelectionArea(noLoopKeys, song, editorState);

			expect(area).not.toBeNull();
			expect(area?.keyFrom).toBe(64);
			expect(area?.keyTo).toBe(65);
			expect(area?.tickFrom).toBe(0);
			expect(area?.tickTo).toBe(960);
		});

		it("should handle notes with wide key range", () => {
			const note1 = Note.create({
				id: 1,
				key: 36,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});
			const note2 = Note.create({
				id: 2,
				key: 96,
				tickFrom: 480,
				tickTo: 960,
				velocity: 85,
			});

			const channel = createMockChannel(1, [note1, note2]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(1, new Set([1, 2]));
			const noLoopKeys = new Set<number>();

			const area = computeSelectionArea(noLoopKeys, song, editorState);

			expect(area).not.toBeNull();
			expect(area?.keyFrom).toBe(36);
			expect(area?.keyTo).toBe(97);
		});
	});

	describe("with noLoopKeys", () => {
		it("should use tickFrom for looping notes instead of tickTo", () => {
			const note1 = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});
			const note2 = Note.create({
				id: 2,
				key: 64,
				tickFrom: 100,
				tickTo: 900,
				velocity: 85,
			});

			const channel = createMockChannel(1, [note1, note2]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(1, new Set([1, 2]));
			const noLoopKeys = new Set([64]); // note2's key is a no-loop key

			const area = computeSelectionArea(noLoopKeys, song, editorState);

			// tickTo should be max of: tickTo of note1 (480) and tickFrom of note2 (100)
			expect(area?.tickTo).toBe(480);
		});

		it("should use tickFrom for all notes in noLoopKeys", () => {
			const note1 = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 1000,
				velocity: 80,
			});
			const note2 = Note.create({
				id: 2,
				key: 64,
				tickFrom: 200,
				tickTo: 900,
				velocity: 85,
			});
			const note3 = Note.create({
				id: 3,
				key: 67,
				tickFrom: 100,
				tickTo: 600,
				velocity: 90,
			});

			const channel = createMockChannel(1, [note1, note2, note3]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(1, new Set([1, 2, 3]));
			const noLoopKeys = new Set([60, 64]); // note1 and note2 are no-loop keys

			const area = computeSelectionArea(noLoopKeys, song, editorState);

			// For no-loop keys: use tickFrom (60: 0, 64: 200)
			// For regular keys: use tickTo (67: 600)
			// So max should be 600
			expect(area?.tickTo).toBe(600);
		});

		it("should handle empty noLoopKeys set", () => {
			const note1 = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note1]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(1, new Set([1]));
			const noLoopKeys = new Set<number>();

			const area = computeSelectionArea(noLoopKeys, song, editorState);

			expect(area?.tickTo).toBe(480);
		});

		it("should handle noLoopKeys that don't match any selected notes", () => {
			const note1 = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note1]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(1, new Set([1]));
			const noLoopKeys = new Set([72]); // doesn't match note1's key

			const area = computeSelectionArea(noLoopKeys, song, editorState);

			expect(area?.tickTo).toBe(480);
		});
	});

	describe("when no notes are selected", () => {
		it("should return null", () => {
			const note1 = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note1]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(1, new Set());
			const noLoopKeys = new Set<number>();

			const area = computeSelectionArea(noLoopKeys, song, editorState);

			expect(area).toBeNull();
		});
	});

	describe("when active channel doesn't exist", () => {
		it("should return null", () => {
			const note1 = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note1]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(999, new Set([1]));
			const noLoopKeys = new Set<number>();

			const area = computeSelectionArea(noLoopKeys, song, editorState);

			expect(area).toBeNull();
		});
	});

	describe("return type", () => {
		it("should return PianoRollArea with all required properties", () => {
			const note1 = Note.create({
				id: 1,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});

			const channel = createMockChannel(1, [note1]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(1, new Set([1]));
			const noLoopKeys = new Set<number>();

			const area = computeSelectionArea(noLoopKeys, song, editorState);

			expect(area).toHaveProperty("keyFrom");
			expect(area).toHaveProperty("keyTo");
			expect(area).toHaveProperty("tickFrom");
			expect(area).toHaveProperty("tickTo");
		});
	});
});
