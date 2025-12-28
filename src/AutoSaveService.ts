import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { EventBus } from "./EventBus.ts";
import type { FileStore } from "./FileStore.ts";
import type { Song } from "./models/Song.ts";
import type { SaveFile } from "./usecases/SaveFile.ts";

export class AutoSaveService {
	static readonly Key = ComponentKey.of(AutoSaveService);

	private lastSavedSong: Song | null = null;
	private autoSaveTimerId: ReturnType<typeof setTimeout> | null = null;

	private static readonly AUTO_SAVE_INTERVAL_IN_MS = 5000;

	constructor(
		private readonly fileStore: FileStore,
		private readonly saveFile: SaveFile,
		bus: EventBus,
	) {
		bus
			.on("song.put.before", () => {
				this.disableAutoSave();
			})
			.on("song.put.after", () => {
				this.enableAutoSave();
			});
	}

	enableAutoSave() {
		this.disableAutoSave();
		const mainLoop = async () => {
			try {
				const { song, location } = this.fileStore.state;

				if (location !== null && song !== this.lastSavedSong) {
					await this.saveFile(location);
					this.lastSavedSong = song;
				}
			} finally {
				this.autoSaveTimerId = setInterval(
					mainLoop,
					AutoSaveService.AUTO_SAVE_INTERVAL_IN_MS,
				);
			}
		};
		this.autoSaveTimerId = setInterval(
			mainLoop,
			AutoSaveService.AUTO_SAVE_INTERVAL_IN_MS,
		);
	}

	disableAutoSave() {
		if (this.autoSaveTimerId === null) return;
		clearTimeout(this.autoSaveTimerId);
		this.autoSaveTimerId = null;
		this.lastSavedSong = null;
	}
}
