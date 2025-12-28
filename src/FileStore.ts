import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { EventBus } from "./EventBus.ts";
import type { Channel } from "./models/Channel.ts";
import type { FileLocation } from "./models/FileLocation.ts";
import type { Note } from "./models/Note.ts";
import { Song, type SongPatch } from "./models/Song.ts";
import { Stateful } from "./Stateful/Stateful.ts";

export interface FileStoreState {
	song: Song;
	location: FileLocation | null;
}

export class FileStore extends Stateful<FileStoreState> {
	static readonly Key = ComponentKey.of(FileStore);

	constructor(bus: EventBus) {
		super({
			song: new Song(),
			location: null,
		});

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
					return channel.putControlChange(args.type, args.changes);
				});
			})
			.on("control.remove", (args) => {
				this.updateChannel(args.channelId, (channel) => {
					return channel.removeControlChange(args.type, args.ticks);
				});
			});
	}

	putChannel(channel: Channel) {
		this.updateState((state) => ({
			...state,
			song: state.song.putChannel(channel),
		}));
	}

	removeChannel(channelId: number) {
		this.updateState((state) => ({
			...state,
			song: state.song.removeChannel(channelId),
		}));
	}

	updateChannel(channelId: number, updater: (channel: Channel) => Channel) {
		this.updateState((state) => {
			const channel = state.song.getChannel(channelId);
			if (channel === null) return state;

			return {
				...state,
				song: state.song.replaceChannel(updater(channel)),
			};
		});
	}

	/**
	 * 複数のノートを追加・更新する
	 * @param channelId チャンネルID
	 * @param notes 追加・更新するノート
	 */
	putNotes(channelId: number, notes: Iterable<Note>) {
		this.updateState((state) => ({
			...state,
			song: state.song.putNotes(channelId, notes),
		}));
	}

	removeNotes(channelId: number, noteIds: Iterable<number>) {
		this.updateState((state) => ({
			...state,
			song: state.song.removeNotes(channelId, noteIds),
		}));
	}

	setSong(song: Song) {
		this.updateState((state) => ({
			...state,
			song,
		}));
	}

	setFileLocation(location: FileLocation | null) {
		this.updateState((state) => ({
			...state,
			location,
		}));
	}

	applySongPatch(patch: SongPatch) {
		this.setSong(this.state.song.applyPatch(patch));
	}
}
