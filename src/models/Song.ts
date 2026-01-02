import { assertNotNullish, toMutableMap } from "../lib.ts";
import { Channel, type ChannelId, type SerializedChannel } from "./Channel.ts";
import type { Note, NoteId } from "./Note.ts";

export interface Song {
	readonly metadata: {
		readonly title: string;
		readonly bpm: number;
		readonly channelIds: readonly ChannelId[];
	};
	readonly channels: ReadonlyMap<ChannelId, Channel>;
}

export const Song = {
	create(): Song {
		return {
			metadata: {
				title: "Untitled",
				bpm: 120,
				channelIds: [],
			},
			channels: new Map(),
		};
	},
	serialize(song: Song): SerializedSong {
		return {
			version: 1,
			title: song.metadata.title,
			bpm: song.metadata.bpm,
			channels: song.metadata.channelIds.map((channelId) => {
				const channel = song.channels.get(channelId);
				assertNotNullish(channel);
				return Channel.serialize(channel);
			}),
		};
	},
	deserialize(data: SerializedSong): Song {
		if (data.version !== 1) {
			throw new Error(`非対応のバージョンです (version: ${data.version})`);
		}

		return {
			metadata: {
				title: data.title,
				bpm: data.bpm,
				channelIds: data.channels.map((ch) => ch.id),
			},
			channels: new Map(
				data.channels.map((ch) => {
					const channel = Channel.deserialize(ch);
					return [channel.metadata.id, channel] as const;
				}),
			),
		};
	},
	getChannel(song: Song, channelId: ChannelId): Channel | null {
		return song.channels.get(channelId) ?? null;
	},
	putChannel(song: Song, channel: Channel) {
		const channels = toMutableMap(song.channels);
		channels.set(channel.metadata.id, channel);

		if (channels.size === song.channels.size) {
			return { ...song, channels };
		} else {
			return {
				...song,
				metadata: {
					...song.metadata,
					channelIds: [...song.metadata.channelIds, channel.metadata.id],
				},
				channels,
			};
		}
	},
	removeChannel(song: Song, channelId: ChannelId) {
		if (!song.channels.has(channelId)) return song;

		const channels = toMutableMap(song.channels);
		channels.delete(channelId);

		return {
			...song,
			metadata: {
				...song.metadata,
				channelIds: song.metadata.channelIds.filter((id) => id !== channelId),
			},
			channels,
		};
	},
	replaceChannel(song: Song, channel: Channel) {
		const existingChannel = song.channels.get(channel.metadata.id);
		if (existingChannel === undefined) return song;
		if (existingChannel === channel) return song;

		const channels = toMutableMap(song.channels);
		channels.set(channel.metadata.id, channel);

		return { ...song, channels };
	},
	putNotes(song: Song, channelId: ChannelId, newNotes: Iterable<Note>) {
		const channel = song.channels.get(channelId);
		if (channel === undefined) return song;

		return Song.replaceChannel(song, Channel.putNotes(channel, newNotes));
	},
	removeNotes(song: Song, channelId: ChannelId, ids: Iterable<NoteId>) {
		const channel = song.channels.get(channelId);
		if (channel === undefined) return song;

		return Song.replaceChannel(song, Channel.removeNotes(channel, ids));
	},
	setTitle(song: Song, title: string): Song {
		if (song.metadata.title === title) return song;
		return { ...song, metadata: { ...song.metadata, title } };
	},
	setBPM(song: Song, bpm: number): Song {
		if (song.metadata.bpm === bpm) return song;
		return { ...song, metadata: { ...song.metadata, bpm } };
	},
	applyPatch(song: Song, patch: SongPatch): Song {
		if (patch.bpm !== undefined) {
			song = Song.setBPM(song, patch.bpm);
		}
		if (patch.title !== undefined) {
			song = Song.setTitle(song, patch.title);
		}
		return song;
	},
} as const;

export interface SongPatch {
	title?: string;
	bpm?: number;
}

export interface SerializedSong {
	readonly version: number;
	readonly title: string;
	readonly bpm: number;
	readonly channels: readonly SerializedChannel[];
}
