import { describe, expect, it } from "bun:test";
import { getActiveChannel } from "./getActiveChannel.ts";
import type { EditorState } from "./Editor/Editor.ts";
import { EditorSelection } from "./Editor/EditorSelection.ts";
import { Song } from "./models/Song.ts";
import { Channel } from "./models/Channel.ts";
import { InstrumentKey } from "./models/InstrumentKey.ts";
import { Color } from "./Color.ts";

describe("getActiveChannel", () => {
	const createMockChannel = (id: number): Channel => {
		return new Channel({
			id,
			label: `Channel ${id}`,
			instrumentKey: new InstrumentKey("GeneralUser GS", 0, 0),
			notes: new Map(),
			controlChanges: new Map(),
			color: Color.hsl(0, 0, 0),
		});
	};

	const createMockEditorState = (
		activeChannelId: number | null,
	): EditorState => ({
		newNoteDurationInTick: 480,
		previewChannelIds: new Set(),
		activeChannelId,
		zoom: 1,
		width: 800,
		scrollLeft: 0,
		selection: EditorSelection.void,
		marqueeAreaFrom: null,
		marqueeAreaTo: null,
		timelineGridUnitInTick: 480,
		quantizeUnitInTick: 480,
		parameterType: 0 as any,
	});

	describe("when active channel exists", () => {
		it("should return the active channel", () => {
			const channel1 = createMockChannel(1);
			const channel2 = createMockChannel(2);
			const channel3 = createMockChannel(3);

			const song = new Song({
				title: "Test",
				channels: [channel1, channel2, channel3],
				bpm: 120,
			});

			const editorState = createMockEditorState(2);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBe(channel2);
		});

		it("should return first channel when activeChannelId is 0", () => {
			const channel1 = createMockChannel(0);
			const channel2 = createMockChannel(1);

			const song = new Song({
				title: "Test",
				channels: [channel1, channel2],
				bpm: 120,
			});

			const editorState = createMockEditorState(0);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBe(channel1);
		});

		it("should return the correct channel from multiple channels", () => {
			const channels = [
				createMockChannel(10),
				createMockChannel(20),
				createMockChannel(30),
				createMockChannel(40),
			];

			const song = new Song({
				title: "Test",
				channels,
				bpm: 120,
			});

			const editorState = createMockEditorState(30);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBe(channels[2]);
		});
	});

	describe("when active channel does not exist", () => {
		it("should return null when activeChannelId is null", () => {
			const channel1 = createMockChannel(1);

			const song = new Song({
				title: "Test",
				channels: [channel1],
				bpm: 120,
			});

			const editorState = createMockEditorState(null);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBeNull();
		});

		it("should return null when activeChannelId does not exist in song", () => {
			const channel1 = createMockChannel(1);
			const channel2 = createMockChannel(2);

			const song = new Song({
				title: "Test",
				channels: [channel1, channel2],
				bpm: 120,
			});

			const editorState = createMockEditorState(999);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBeNull();
		});

		it("should return null when song has no channels", () => {
			const song = new Song({
				title: "Test",
				channels: [],
				bpm: 120,
			});

			const editorState = createMockEditorState(1);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBeNull();
		});

		it("should return null when activeChannelId is negative", () => {
			const channel1 = createMockChannel(1);

			const song = new Song({
				title: "Test",
				channels: [channel1],
				bpm: 120,
			});

			const editorState = createMockEditorState(-1);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBeNull();
		});
	});
});
