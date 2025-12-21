import { describe, expect, it } from "bun:test";
import { Color } from "../Color.ts";
import { Channel } from "./Channel.ts";
import { InstrumentKey } from "./InstrumentKey.ts";
import { Note } from "./Note.ts";
import { Song } from "./Song.ts";

describe("Song", () => {
	// デフォルト Song インスタンス
	const defaultSong = new Song();

	// デフォルト Channel インスタンス
	const defaultChannel = new Channel({
		id: 0,
		label: "Channel 0",
		instrumentKey: new InstrumentKey("GeneralUser GS", 0, 0),
		notes: new Map(),
		controlChanges: new Map(),
		color: Color.hsl(0, 0.5, 0.5),
	});

	// デフォルト Note インスタンス
	const defaultNote = Note.create({
		id: 1,
		key: 60,
		tickFrom: 0,
		tickTo: 100,
		velocity: 80,
	});

	describe("initialization", () => {
		it("should create a song with default values", () => {
			const song = new Song();

			expect(song.title).toBe("Untitled");
			expect(song.bpm).toBe(120);
			expect(song.channels.length).toBe(0);
		});

		it("should create a song with specified properties", () => {
			const song = new Song({
				title: "My Song",
				bpm: 140,
				channels: [defaultChannel],
			});

			expect(song.title).toBe("My Song");
			expect(song.bpm).toBe(140);
			expect(song.channels.length).toBe(1);
		});
	});

	describe("getChannel", () => {
		it("should return a channel by id", () => {
			const channel0 = defaultChannel;
			const channel1 = new Channel({ ...defaultChannel, id: 1 });
			const song = new Song({ ...defaultSong, channels: [channel0, channel1] });

			const found = song.getChannel(0);
			expect(found).toBe(channel0);
		});

		it("should return null if channel not found", () => {
			const song = new Song({ ...defaultSong, channels: [defaultChannel] });

			const found = song.getChannel(999);
			expect(found).toBeNull();
		});
	});

	describe("putChannel", () => {
		it("should add a new channel", () => {
			const song1 = new Song({ ...defaultSong, channels: [defaultChannel] });
			const newChannel = new Channel({ ...defaultChannel, id: 1 });

			const song2 = song1.putChannel(newChannel);

			// イミュータビリティパターン
			expect(song1).not.toBe(song2);
			expect(song1.channels.length).toBe(1);
			expect(song2.channels.length).toBe(2);
			expect(song2.channels[1]).toBe(newChannel);
		});

		it("should update an existing channel", () => {
			const song1 = new Song({ ...defaultSong, channels: [defaultChannel] });
			const updatedChannel = defaultChannel.setLabel("Updated");

			const song2 = song1.putChannel(updatedChannel);

			// イミュータビリティパターン
			expect(song1).not.toBe(song2);
			expect(song1.channels[0]?.label).toBe("Channel 0");
			expect(song2.channels[0]?.label).toBe("Updated");
		});

		it("should return the same instance if channel is unchanged", () => {
			const song1 = new Song({ ...defaultSong, channels: [defaultChannel] });
			const song2 = song1.putChannel(defaultChannel);

			expect(song1).toBe(song2);
		});
	});

	describe("removeChannel", () => {
		it("should remove a channel by id", () => {
			const channel0 = defaultChannel;
			const channel1 = new Channel({ ...defaultChannel, id: 1 });
			const song1 = new Song({
				...defaultSong,
				channels: [channel0, channel1],
			});

			const song2 = song1.removeChannel(0);

			// イミュータビリティパターン
			expect(song1).not.toBe(song2);
			expect(song1.channels.length).toBe(2);
			expect(song2.channels.length).toBe(1);
			expect(song2.channels[0]?.id).toBe(1);
		});

		it("should return the same instance if channel not found", () => {
			const song1 = new Song({ ...defaultSong, channels: [defaultChannel] });
			const song2 = song1.removeChannel(999);

			expect(song1).toBe(song2);
		});
	});

	describe("replaceChannel", () => {
		it("should replace an existing channel", () => {
			const song1 = new Song({ ...defaultSong, channels: [defaultChannel] });
			const updatedChannel = defaultChannel.setLabel("Updated");

			const song2 = song1.replaceChannel(updatedChannel);

			// イミュータビリティパターン
			expect(song1).not.toBe(song2);
			expect(song1.channels[0]?.label).toBe("Channel 0");
			expect(song2.channels[0]?.label).toBe("Updated");
		});

		it("should return the same instance if channel is unchanged", () => {
			const song1 = new Song({ ...defaultSong, channels: [defaultChannel] });
			const song2 = song1.replaceChannel(defaultChannel);

			expect(song1).toBe(song2);
		});

		it("should return the same instance if channel not found", () => {
			const newChannel = new Channel({ ...defaultChannel, id: 999 });
			const song1 = new Song({ ...defaultSong, channels: [defaultChannel] });
			const song2 = song1.replaceChannel(newChannel);

			expect(song1).toBe(song2);
		});
	});

	describe("putNotes", () => {
		it("should add notes to a channel", () => {
			const song1 = new Song({ ...defaultSong, channels: [defaultChannel] });

			const song2 = song1.putNotes(0, [defaultNote]);

			// イミュータビリティパターン
			expect(song1).not.toBe(song2);
			expect(song1.channels[0]?.notes.size).toBe(0);
			expect(song2.channels[0]?.notes.size).toBe(1);
		});

		it("should return the same instance if channel not found", () => {
			const song = new Song({ ...defaultSong, channels: [defaultChannel] });

			const result = song.putNotes(999, [defaultNote]);

			expect(song).toBe(result);
		});
	});

	describe("removeNotes", () => {
		it("should remove notes from a channel", () => {
			const channelWithNote = new Channel({
				...defaultChannel,
				notes: new Map([[defaultNote.id, defaultNote]]),
			});
			const song1 = new Song({ ...defaultSong, channels: [channelWithNote] });

			const song2 = song1.removeNotes(0, [defaultNote.id]);

			// イミュータビリティパターン
			expect(song1).not.toBe(song2);
			expect(song1.channels[0]?.notes.size).toBe(1);
			expect(song2.channels[0]?.notes.size).toBe(0);
		});

		it("should return the same instance if channel not found", () => {
			const song = new Song({ ...defaultSong, channels: [defaultChannel] });

			const result = song.removeNotes(999, [defaultNote.id]);
			expect(song).toBe(result);
		});
	});

	describe("setTitle", () => {
		it("should return a new instance when title changes", () => {
			const song1 = new Song({ ...defaultSong, title: "Original" });
			const song2 = song1.setTitle("Updated");

			// イミュータビリティパターン
			expect(song1).not.toBe(song2);
			expect(song1.title).toBe("Original");
			expect(song2.title).toBe("Updated");
		});

		it("should return the same instance if title is unchanged", () => {
			const song1 = new Song({ ...defaultSong, title: "Title" });
			const song2 = song1.setTitle("Title");

			expect(song1).toBe(song2);
		});
	});

	describe("setBPM", () => {
		it("should return a new instance when BPM changes", () => {
			const song1 = new Song({ ...defaultSong, bpm: 120 });
			const song2 = song1.setBPM(140);

			// イミュータビリティパターン
			expect(song1).not.toBe(song2);
			expect(song1.bpm).toBe(120);
			expect(song2.bpm).toBe(140);
		});

		it("should return the same instance if BPM is unchanged", () => {
			const song1 = new Song({ ...defaultSong, bpm: 140 });
			const song2 = song1.setBPM(140);

			expect(song1).toBe(song2);
		});
	});

	describe("applyPatch", () => {
		it("should apply multiple patches at once", () => {
			const song = new Song({
				...defaultSong,
				title: "Original",
				bpm: 120,
			});
			const patched = song.applyPatch({ title: "Updated", bpm: 140 });

			expect(patched.title).toBe("Updated");
			expect(patched.bpm).toBe(140);
		});

		it("should apply only specified patches", () => {
			const song = new Song({
				...defaultSong,
				title: "Original",
				bpm: 120,
			});
			const patched = song.applyPatch({ bpm: 140 });

			expect(patched.title).toBe("Original");
			expect(patched.bpm).toBe(140);
		});

		it("should return the same instance if no patches apply", () => {
			const song = new Song({ ...defaultSong, title: "Title", bpm: 120 });
			const patched = song.applyPatch({});

			expect(song).toBe(patched);
		});
	});

	describe("serialization", () => {
		it("should serialize and deserialize correctly", () => {
			const original = new Song({
				title: "Test Song",
				bpm: 140,
				channels: [defaultChannel],
			});

			const serialized = original.serialize();
			const deserialized = Song.deserialize(serialized);

			expect(deserialized.title).toBe("Test Song");
			expect(deserialized.bpm).toBe(140);
			expect(deserialized.channels.length).toBe(1);
		});

		it("should throw on unsupported version", () => {
			const invalidData = {
				version: 999,
				title: "Test",
				bpm: 120,
				channels: [],
			};

			expect(() => Song.deserialize(invalidData as any)).toThrow();
		});
	});
});
