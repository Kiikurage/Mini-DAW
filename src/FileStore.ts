import { useSyncExternalStore } from "react";
import type { CleanUp } from "./CleanUp.ts";
import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { EventBus } from "./EventBus.ts";
import { Channel, type ChannelId } from "./models/Channel.ts";
import type { FileLocation } from "./models/FileLocation.ts";
import type { MDFile } from "./models/MDFile.ts";
import type { Note, NoteId } from "./models/Note.ts";
import { Song, type SongPatch } from "./models/Song.ts";
import { Stateful } from "./Stateful/Stateful.ts";

export interface FileStoreState {
	song: Song;
	metadata: MDFile["metadata"];
}

export class FileStore extends Stateful<FileStoreState> {
	static readonly Key = ComponentKey.of(FileStore);

	private readonly songListener = new Set<(song: Song["metadata"]) => void>();
	private readonly channelListeners = new Map<
		ChannelId,
		Set<(channel: Channel["metadata"] | null) => void>
	>();

	constructor(bus: EventBus) {
		super({
			song: Song.create(),
			metadata: null,
		});

		bus
			.on("channel.add", (channel) => {
				this.putChannel(channel);
			})
			.on("channel.remove", (channelId) => {
				this.removeChannel(channelId);
			})
			.on("channel.update", (channelId, patch) => {
				this.updateChannel(channelId, (channel) =>
					Channel.applyPatch(channel, patch),
				);
			})
			.on("notes.put", (channelId, notes) => {
				this.putNotes(channelId, notes);
			})
			.on("notes.remove", (channelId, noteIds) =>
				this.removeNotes(channelId, noteIds),
			)
			.on("file.put", (file) => this.setFile(file))
			.on("song.update", (patch) => this.applySongPatch(patch))
			.on("control.put", (args) => {
				this.updateChannel(args.channelId, (channel) => {
					return Channel.putCCs(channel, args.type, args.ccs);
				});
			})
			.on("control.remove", (args) => {
				this.updateChannel(args.channelId, (channel) => {
					return Channel.removeCCs(channel, args.type, args.ids);
				});
			});
	}

	/**
	 * 曲のメタデータを取得する
	 */
	getSong(): Song["metadata"] {
		return this.state.song.metadata;
	}

	/**
	 * 指定したチャンネルのメタデータを取得する
	 */
	getChannel(channelId: ChannelId): Channel["metadata"] | null {
		return Song.getChannel(this.state.song, channelId)?.metadata ?? null;
	}

	subscribeSong(listener: (song: Song["metadata"]) => void): CleanUp {
		this.songListener.add(listener);
		return () => {
			this.songListener.delete(listener);
		};
	}

	subscribeChannel(
		channelId: ChannelId,
		listener: (channel: Channel["metadata"] | null) => void,
	): CleanUp {
		let listeners = this.channelListeners.get(channelId);
		if (listeners === undefined) {
			listeners = new Set();
			this.channelListeners.set(channelId, listeners);
		}
		listeners.add(listener);

		return () => {
			listeners.delete(listener);
			if (listeners.size === 0) {
				this.channelListeners.delete(channelId);
			}
		};
	}

	putChannel(channel: Channel) {
		this.updateState((state) => ({
			...state,
			song: Song.putChannel(state.song, channel),
		}));
	}

	removeChannel(channelId: ChannelId) {
		this.updateState((state) => ({
			...state,
			song: Song.removeChannel(state.song, channelId),
		}));
	}

	updateChannel(channelId: ChannelId, updater: (channel: Channel) => Channel) {
		this.updateState((state) => {
			const channel = Song.getChannel(state.song, channelId);
			if (channel === null) return state;

			return {
				...state,
				song: Song.replaceChannel(state.song, updater(channel)),
			};
		});
	}

	/**
	 * 複数のノートを追加・更新する
	 * @param channelId チャンネルID
	 * @param notes 追加・更新するノート
	 */
	putNotes(channelId: ChannelId, notes: Iterable<Note>) {
		this.updateState((state) => ({
			...state,
			song: Song.putNotes(state.song, channelId, notes),
		}));
	}

	removeNotes(channelId: ChannelId, noteIds: Iterable<NoteId>) {
		this.updateState((state) => ({
			...state,
			song: Song.removeNotes(state.song, channelId, noteIds),
		}));
	}

	setSong(song: Song) {
		this.updateState((state) => ({
			...state,
			song,
		}));
	}

	setFile(file: MDFile) {
		this.updateState((state) => ({
			...state,
			song: file.song,
			metadata: file.metadata,
		}));
	}

	setFileLocation(location: FileLocation | null) {
		this.updateState((state) => ({
			...state,
			location,
		}));
	}

	applySongPatch(patch: SongPatch) {
		this.setSong(Song.applyPatch(this.state.song, patch));
	}

	protected override setState(newState: FileStoreState): void {
		const oldState = this.state;
		super.setState(newState);

		if (oldState.song.metadata !== newState.song.metadata) {
			for (const listener of this.songListener) {
				listener(newState.song.metadata);
			}
		}
		for (const [channelId, listeners] of this.channelListeners) {
			const oldChannel = Song.getChannel(oldState.song, channelId);
			const newChannel = Song.getChannel(newState.song, channelId);
			if (oldChannel?.metadata !== newChannel?.metadata) {
				for (const listener of listeners) {
					listener(newChannel?.metadata ?? null);
				}
			}
		}
	}
}

export function useSong(store: FileStore): Song["metadata"] {
	return useSyncExternalStore(
		(subscribe) => store.subscribeSong(subscribe),
		() => store.getSong(),
	);
}

export function useChannel(
	store: FileStore,
	channelId: ChannelId,
): Channel["metadata"] | null {
	return useSyncExternalStore(
		(subscribe) => store.subscribeChannel(channelId, subscribe),
		() => store.getChannel(channelId),
	);
}
