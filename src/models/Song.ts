import { Channel, type SerializedChannel } from "./Channel.ts";
import type { Note } from "./Note.ts";

export class Song {
	readonly title: string;
	readonly bpm: number;
	readonly channels: readonly Channel[];

	constructor(
		props: {
			title: string;
			channels: readonly Channel[];
			bpm: number;
		} = {
			title: "Untitled",
			channels: [],
			bpm: 120,
		},
	) {
		this.title = props.title;
		this.channels = props.channels;
		this.bpm = props.bpm;
	}

	getChannel(channelId: number): Channel | null {
		return this.channels.find((ch) => ch.id === channelId) ?? null;
	}

	putChannel(channel: Channel) {
		const channels = [...this.channels];
		const index = channels.findIndex((ch) => ch.id === channel.id);
		if (index === -1) {
			channels.push(channel);
			return new Song({ ...this, channels });
		} else {
			if (channels[index] === channel) return this;
			channels[index] = channel;
			return new Song({ ...this, channels });
		}
	}

	removeChannel(channelId: number) {
		const channels = this.channels.filter((ch) => ch.id !== channelId);
		if (channels.length === this.channels.length) return this;

		return new Song({ ...this, channels });
	}

	replaceChannel(channel: Channel) {
		const index = this.channels.findIndex((ch) => ch.id === channel.id);
		if (index === -1) return this;
		if (this.channels[index] === channel) return this;

		const channels = [...this.channels];
		channels[index] = channel;

		return new Song({ ...this, channels });
	}

	putNotes(channelId: number, newNotes: Iterable<Note>) {
		const channel = this.channels.find((ch) => ch.id === channelId);
		if (channel === undefined) return this;

		return this.replaceChannel(channel.putNotes(newNotes));
	}

	removeNotes(channelId: number, ids: Iterable<number>) {
		const channel = this.channels.find((ch) => ch.id === channelId);
		if (channel === undefined) return this;

		return this.replaceChannel(channel.removeNotes(ids));
	}

	setTitle(title: string) {
		if (this.title === title) return this;
		return new Song({ ...this, title });
	}

	setBPM(bpm: number) {
		if (this.bpm === bpm) return this;
		return new Song({ ...this, bpm });
	}

	applyPatch(patch: SongPatch) {
		let song: Song = this;
		if (patch.bpm !== undefined) {
			song = song.setBPM(patch.bpm);
		}
		if (patch.title !== undefined) {
			song = song.setTitle(patch.title);
		}
		return song;
	}

	serialize(): SerializedSong {
		return {
			version: 1,
			title: this.title,
			bpm: this.bpm,
			channels: this.channels.map((ch) => ch.serialize()),
		};
	}

	static deserialize(data: SerializedSong): Song {
		if (data.version !== 1) {
			throw new Error(`非対応のバージョンです (version: ${data.version})`);
		}

		return new Song({
			title: data.title,
			bpm: data.bpm,
			channels: data.channels.map((ch) => Channel.deserialize(ch)),
		});
	}
}

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
