import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { EventBus } from "./EventBus.ts";
import type { Channel } from "./models/Channel.ts";
import type { Note } from "./models/Note.ts";
import { Song, type SongPatch } from "./models/Song.ts";
import { Stateful } from "./Stateful/Stateful.ts";

export class SongStore extends Stateful<Song> {
	static readonly Key = ComponentKey.of(SongStore);

	constructor(bus: EventBus) {
		super(new Song());

		bus
			.on("channel.add", (channel) => {
				this.appendChannel(channel);
			})
			.on("channel.delete", (channelId) => {
				this.deleteChannel(channelId);
			})
			.on("channel.update", (channelId, patch) => {
				this.updateChannel(channelId, (channel) => channel.applyPatch(patch));
			})
			.on("notes.set", (channelId, notes) => {
				this.setNotes(channelId, notes);
			})
			.on("notes.delete", (channelId, noteIds) =>
				this.deleteNotes(channelId, noteIds),
			)
			.on("song.set", (song) => this.setSong(song))
			.on("song.update", (patch) => this.applySongPatch(patch));
	}

	appendChannel(channel: Channel) {
		this.updateState((state) =>
			state.insertChannel(channel, state.channels.length),
		);
	}

	deleteChannel(channelId: number) {
		this.updateState((state) => state.deleteChannel(channelId));
	}

	updateChannel(channelId: number, updater: (channel: Channel) => Channel) {
		this.updateState((state) => {
			const channel = state.getChannel(channelId);
			if (channel === null) return state;

			return state.replaceChannel(updater(channel));
		});
	}

	/**
	 * 複数のノートを追加・更新する
	 * @param channelId チャンネルID
	 * @param notes 追加・更新するノート
	 */
	setNotes(channelId: number, notes: Iterable<Note>) {
		this.updateState((state) => state.setNotes(channelId, notes));
	}

	deleteNotes(channelId: number, noteIds: Iterable<number>) {
		this.updateState((state) => state.deleteNotes(channelId, noteIds));
	}

	setSong(song: Song) {
		this.setState(song);
	}

	applySongPatch(patch: SongPatch) {
		this.setSong(this.state.applyPatch(patch));
	}
}
