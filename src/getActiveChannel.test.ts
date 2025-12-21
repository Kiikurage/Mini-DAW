import { describe, expect, it } from "bun:test";
import { Color } from "./Color.ts";
import type { EditorState } from "./Editor/Editor.ts";
import { EditorSelection } from "./Editor/EditorSelection.ts";
import { getActiveChannel } from "./getActiveChannel.ts";
import { Channel } from "./models/Channel.ts";
import { InstrumentKey } from "./models/InstrumentKey.ts";
import { Song } from "./models/Song.ts";

describe("getActiveChannel", () => {
	const defaultChannel = new Channel({
		id: 0,
		label: `Channel #N/A`,
		instrumentKey: new InstrumentKey("GeneralUser GS", 0, 0),
		notes: new Map(),
		controlChanges: new Map(),
		color: Color.hsl(0, 0, 0),
	});

	const createEditorState = (
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
			const channel1 = new Channel({ ...defaultChannel, id: 0 });
			const channel2 = new Channel({ ...defaultChannel, id: 1 });
			const channel3 = new Channel({ ...defaultChannel, id: 2 });

			const song = new Song({
				title: "Test",
				channels: [channel1, channel2, channel3],
				bpm: 120,
			});

			const editorState = createEditorState(2);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBe(channel3);
		});

		it("should return first channel when activeChannelId is 0", () => {
			const channel1 = new Channel({ ...defaultChannel, id: 0 });
			const channel2 = new Channel({ ...defaultChannel, id: 1 });

			const song = new Song({
				title: "Test",
				channels: [channel1, channel2],
				bpm: 120,
			});

			const editorState = createEditorState(0);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBe(channel1);
		});

		it("should return the correct channel from multiple channels", () => {
			const channel1 = new Channel({ ...defaultChannel, id: 1 });
			const channel2 = new Channel({ ...defaultChannel, id: 2 });
			const channel3 = new Channel({ ...defaultChannel, id: 3 });
			const channel4 = new Channel({ ...defaultChannel, id: 4 });

			const song = new Song({
				title: "Test",
				channels: [channel1, channel2, channel3, channel4],
				bpm: 120,
			});

			const editorState = createEditorState(2);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBe(channel2);
		});
	});

	describe("when active channel does not exist", () => {
		it("should return null when activeChannelId is null", () => {
			const channel1 = new Channel({ ...defaultChannel, id: 1 });

			const song = new Song({
				title: "Test",
				channels: [channel1],
				bpm: 120,
			});

			const editorState = createEditorState(null);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBeNull();
		});

		it("should return null when activeChannelId does not exist in song", () => {
			const channel1 = new Channel({ ...defaultChannel, id: 1 });
			const channel2 = new Channel({ ...defaultChannel, id: 2 });

			const song = new Song({
				title: "Test",
				channels: [channel1, channel2],
				bpm: 120,
			});

			const editorState = createEditorState(999);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBeNull();
		});

		it("should return null when song has no channels", () => {
			const song = new Song({
				title: "Test",
				channels: [],
				bpm: 120,
			});

			const editorState = createEditorState(1);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBeNull();
		});

		it("should return null when activeChannelId is negative", () => {
			const channel1 = new Channel({ ...defaultChannel, id: 1 });

			const song = new Song({
				title: "Test",
				channels: [channel1],
				bpm: 120,
			});

			const editorState = createEditorState(-1);

			const activeChannel = getActiveChannel(song, editorState);

			expect(activeChannel).toBeNull();
		});
	});
});
