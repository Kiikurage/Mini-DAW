import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { EventBus } from "./EventBus.ts";
import type { FileStore } from "./FileStore.ts";
import type { Song } from "./models/Song.ts";
import type { SaveFile } from "./usecases/SaveFile.ts";

/**
 * 保存先が確定しているファイルを定期的に自動保存するサービス
 */
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
			.on("file.put.before", () => {
				this.disableAutoSave();
			})
			.on("file.put.after", () => {
				this.enableAutoSave();
			});
	}

	enableAutoSave() {
		this.disableAutoSave();
		const mainLoop = async () => {
			try {
				const { song, metadata } = this.fileStore.state;

				if (metadata !== null && song !== this.lastSavedSong) {
					await this.saveFile(metadata.location);
					this.lastSavedSong = song;
				}
			} finally {
				this.autoSaveTimerId = setTimeout(() => {
					requestIdleCallback(() => {
						mainLoop();
					});
				}, AutoSaveService.AUTO_SAVE_INTERVAL_IN_MS);
			}
		};
		this.autoSaveTimerId = setTimeout(() => {
			requestIdleCallback(() => {
				mainLoop();
			});
		}, AutoSaveService.AUTO_SAVE_INTERVAL_IN_MS);
	}

	disableAutoSave() {
		if (this.autoSaveTimerId === null) return;
		clearTimeout(this.autoSaveTimerId);
		this.autoSaveTimerId = null;
		this.lastSavedSong = null;
	}
}
