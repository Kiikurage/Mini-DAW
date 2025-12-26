import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { EventBus } from "./EventBus.ts";
import type { Channel } from "./models/Channel.ts";
import type { Note } from "./models/Note.ts";
import { Song, type SongPatch } from "./models/Song.ts";
import { Stateful } from "./Stateful/Stateful.ts";

export interface GoogleDriveSongLocation {
	type: "googleDrive";
	fileId: string;
}

export interface LocalSongLocation {
	type: "local";
}

export interface NewFileSongLocation {
	type: "newFile";
}

export type SongLocation =
	| GoogleDriveSongLocation
	| LocalSongLocation
	| NewFileSongLocation;

export interface SongStoreState {
	song: Song;
	location: SongLocation;
}

export class SongStore extends Stateful<SongStoreState> {
	static readonly Key = ComponentKey.of(SongStore);

	constructor(bus: EventBus) {
		super({
			song: new Song(),
			location: { type: "newFile" },
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

	setLocation(location: SongLocation) {
		this.updateState((state) => ({ ...state, location }));
		saveLastFileLocation(location);
	}

	applySongPatch(patch: SongPatch) {
		this.setSong(this.state.song.applyPatch(patch));
	}
}

const LOCALSTORAGE_LAST_FILE_LOCATION_KEY = "lastFileLocation";
export function saveLastFileLocation(location: SongLocation | null) {
	if (location === null) {
		localStorage.removeItem(LOCALSTORAGE_LAST_FILE_LOCATION_KEY);
		return;
	}
	try {
		localStorage.setItem(
			LOCALSTORAGE_LAST_FILE_LOCATION_KEY,
			JSON.stringify(location),
		);
	} catch {
		// ignore
	}
}

export function loadLastFileLocation(): SongLocation | null {
	try {
		const item = localStorage.getItem(LOCALSTORAGE_LAST_FILE_LOCATION_KEY);
		if (item === null) return null;
		return JSON.parse(item) as SongLocation;
	} catch {
		return null;
	}
}
