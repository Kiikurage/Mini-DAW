import { describe, expect, it } from "bun:test";
import { getSelectedNotes } from "./getSelectedNotes.ts";
import type { EditorState } from "./Editor/Editor.ts";
import { EditorSelection } from "./Editor/EditorSelection.ts";
import { Song } from "./models/Song.ts";
import { Channel } from "./models/Channel.ts";
import { Note } from "./models/Note.ts";
import { InstrumentKey } from "./models/InstrumentKey.ts";
import { Color } from "./Color.ts";
import { ControlChangeList } from "./models/ControlChangeList.ts";

describe("getSelectedNotes", () => {
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

	describe("when active channel exists", () => {
		it("should yield selected notes from active channel", () => {
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
				tickFrom: 960,
				tickTo: 1440,
				velocity: 90,
			});

			const channel = createMockChannel(1, [note1, note2, note3]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(1, new Set([1, 3]));

			const selectedNotes = [...getSelectedNotes(song, editorState)];

			expect(selectedNotes).toHaveLength(2);
			expect(selectedNotes[0]).toBe(note1);
			expect(selectedNotes[1]).toBe(note3);
		});

		it("should yield notes in order of selection IDs", () => {
			const note1 = Note.create({
				id: 10,
				key: 60,
				tickFrom: 0,
				tickTo: 480,
				velocity: 80,
			});
			const note2 = Note.create({
				id: 20,
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

			const editorState = createMockEditorState(1, new Set([10, 20]));

			const selectedNotes = [...getSelectedNotes(song, editorState)];

			expect(selectedNotes).toHaveLength(2);
			expect(selectedNotes[0].id).toBe(10);
			expect(selectedNotes[1].id).toBe(20);
		});

		it("should return empty generator when no notes are selected", () => {
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

			const selectedNotes = [...getSelectedNotes(song, editorState)];

			expect(selectedNotes).toHaveLength(0);
		});

		it("should skip non-existent note IDs", () => {
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

			// Selection includes ID 1 and 999 (non-existent)
			const editorState = createMockEditorState(1, new Set([1, 999]));

			const selectedNotes = [...getSelectedNotes(song, editorState)];

			expect(selectedNotes).toHaveLength(1);
			expect(selectedNotes[0].id).toBe(1);
		});
	});

	describe("when active channel does not exist", () => {
		it("should return empty generator when activeChannelId is null", () => {
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

			const editorState = createMockEditorState(null, new Set([1]));

			const selectedNotes = [...getSelectedNotes(song, editorState)];

			expect(selectedNotes).toHaveLength(0);
		});

		it("should return empty generator when activeChannelId does not exist in song", () => {
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

			// Active channel ID 999 does not exist
			const editorState = createMockEditorState(999, new Set([1]));

			const selectedNotes = [...getSelectedNotes(song, editorState)];

			expect(selectedNotes).toHaveLength(0);
		});
	});

	describe("generator behavior", () => {
		it("should be iterable multiple times", () => {
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

			const generator = getSelectedNotes(song, editorState);

			// First iteration
			const first = [...generator];
			expect(first).toHaveLength(1);

			// Second iteration should be empty (generator is exhausted)
			const second = [...generator];
			expect(second).toHaveLength(0);
		});

		it("should be consumable with spread operator", () => {
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

			const channel = createMockChannel(1, [note1, note2]);
			const song = new Song({
				title: "Test",
				channels: [channel],
				bpm: 120,
			});

			const editorState = createMockEditorState(1, new Set([1, 2]));

			const selectedNotes = [...getSelectedNotes(song, editorState)];

			expect(selectedNotes).toEqual([note1, note2]);
		});
	});
});
