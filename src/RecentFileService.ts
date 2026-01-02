import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { EventBus } from "./EventBus.ts";
import { FileLocation } from "./models/FileLocation.ts";
import { Stateful } from "./Stateful/Stateful.ts";

export interface RecentFileEntry {
	readonly fileName: string;
	readonly songTitle: string;
	readonly location: FileLocation;
	readonly lastAccessedAt: number; // UNIX Epoch in MilliSeconds
}

export interface RecentFileServiceState {
	recentFiles: RecentFileEntry[];
}

/**
 * 最近使ったファイルを管理するサービス
 */
export class RecentFileService extends Stateful<RecentFileServiceState> {
	static readonly Key = ComponentKey.of(RecentFileService);

	constructor(bus: EventBus) {
		super({
			recentFiles: [],
		});

		bus.on("file.put.after", (file) => {
			if (file.metadata !== null) {
				this.upsertEntry({
					songTitle: file.song.metadata.title,
					fileName: file.metadata.name,
					location: file.metadata.location,
				});
			}
		});
		this.addChangeListener((state) => {
			RecentFileService.saveToLocalStorage(state);
		});

		this.tryLoadFromLocalStorage();
	}

	/**
	 * 最近使ったファイルのエントリを追加または更新する。
	 * - すでに存在した場合は、そのエントリを先頭に移動する。
	 * - 存在しなかった場合は、新しいエントリを先頭に追加する。
	 */
	upsertEntry(entry: {
		songTitle: string;
		fileName: string;
		location: FileLocation;
	}) {
		const existed = this.updateLastUpdatedAt(entry.location);
		if (existed) return;

		this.updateState((state) => {
			const recentFiles = [
				{
					...entry,
					lastAccessedAt: Date.now(),
				},
				...state.recentFiles,
			];

			return { recentFiles };
		});
	}

	/**
	 * 指定した場所のエントリの最終更新日時を更新する。
	 * @param location
	 * @return エントリが存在した場合は true、存在しなかった場合は false
	 */
	updateLastUpdatedAt(location: FileLocation): boolean {
		for (const [i, existingEntry] of this.state.recentFiles.entries()) {
			if (FileLocation.isEqual(existingEntry.location, location)) {
				const updatedEntry: RecentFileEntry = {
					...existingEntry,
					lastAccessedAt: Date.now(),
				};

				this.updateState((state) => {
					const recentFiles = [...state.recentFiles];
					recentFiles.splice(i, 1);
					recentFiles.unshift(updatedEntry);

					return { recentFiles };
				});
				return true;
			}
		}
		return false;
	}

	private tryLoadFromLocalStorage() {
		const loadedState = RecentFileService.loadFromLocalStorage();
		if (loadedState !== null) {
			this.setState(loadedState);
		}
	}

	private static readonly LOCAL_STORAGE_KEY = "RecentFileServiceState";

	private static saveToLocalStorage(state: RecentFileServiceState) {
		const serialziedData: SerializedRecentFileServiceState = {
			recentFiles: state.recentFiles.map((entry) => ({
				fileName: entry.fileName,
				songTitle: entry.songTitle,
				location: entry.location,
				lastAccessedAt: entry.lastAccessedAt,
			})),
		};

		localStorage.setItem(
			RecentFileService.LOCAL_STORAGE_KEY,
			JSON.stringify(serialziedData),
		);
	}

	private static loadFromLocalStorage(): RecentFileServiceState | null {
		const data = localStorage.getItem(RecentFileService.LOCAL_STORAGE_KEY);
		if (data === null) return null;
		try {
			const parsed = JSON.parse(data) as SerializedRecentFileServiceState;
			return {
				recentFiles: parsed.recentFiles.map((entry) => ({
					fileName: entry.fileName,
					songTitle: entry.songTitle,
					location: entry.location,
					lastAccessedAt: entry.lastAccessedAt,
				})),
			};
		} catch {
			return null;
		}
	}
}

interface SerializedRecentFileServiceState {
	readonly recentFiles: readonly {
		readonly fileName: string;
		readonly songTitle: string;
		readonly location: FileLocation;
		readonly lastAccessedAt: number;
	}[];
}
