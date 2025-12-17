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
				this.putChannel(channel);
			})
			.on("channel.remove", (channelId) => {
				this.removeChannel(channelId);
			})
			.on("channel.update", (channelId, patch) => {
				this.updateChannel(channelId, (channel) => channel.applyPatch(patch));
			})
			.on("notes.put", (channelId, notes) => {
				this.putNotes(channelId, notes);
			})
			.on("notes.remove", (channelId, noteIds) =>
				this.removeNotes(channelId, noteIds),
			)
			.on("song.put", (song) => this.setSong(song))
			.on("song.update", (patch) => this.applySongPatch(patch))
			.on("control.put", (args) => {
				this.updateChannel(args.channelId, (channel) => {
					return channel.putControlChange(args.type, args.ticks, args.value);
				});
			});
	}

	putChannel(channel: Channel) {
		this.updateState((state) => state.putChannel(channel));
	}

	removeChannel(channelId: number) {
		this.updateState((state) => state.removeChannel(channelId));
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
	putNotes(channelId: number, notes: Iterable<Note>) {
		this.updateState((state) => state.putNotes(channelId, notes));
	}

	removeNotes(channelId: number, noteIds: Iterable<number>) {
		this.updateState((state) => state.removeNotes(channelId, noteIds));
	}

	setSong(song: Song) {
		this.setState(song);
	}

	applySongPatch(patch: SongPatch) {
		this.setSong(this.state.applyPatch(patch));
	}
}
