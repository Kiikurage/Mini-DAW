import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import type { GoogleAPIClient } from "../GoogleDriveAPI/GoogleAPIClient.ts";
import { type SerializedSong, Song } from "../models/Song.ts";
import type { SongLocation, SongStore, SongStoreState } from "../SongStore.ts";
import type { StatusBar } from "../StatusBar/StatusBar.tsx";

export class AutoSaveService {
	public static readonly Key = ComponentKey.of(AutoSaveService);
	private lastSavedSongStoreState: SongStoreState | null = null;

	constructor(
		private readonly songStore: SongStore,
		private readonly statusBar: StatusBar,
		private readonly googleAPIClient: GoogleAPIClient,
		private readonly bus: EventBus,
	) {
		bus.on("song.put.before", () => this.save());
		setInterval(() => this.saveIfNeeded(), 30 * 1000);
	}

	async saveIfNeeded() {
		if (this.songStore.state === this.lastSavedSongStoreState) return;

		this.lastSavedSongStoreState = this.songStore.state;
		return this.save();
	}

	async save(): Promise<void> {
		const { song, location } = this.songStore.state;

		switch (location.type) {
			case "googleDrive": {
				this.statusBar.showMessage("保存中", 2000);
				const json = JSON.stringify(song.serialize());

				await this.googleAPIClient.patchFile({
					fileId: location.fileId,
					file: new File([json], "仮のファイル名", {
						type: "application/json",
					}),
				});
				break;
			}
			default: {
				// Do Noghint
				return;
			}
		}
		this.statusBar.showMessage("保存しました", 2000);
	}

	async open(location: SongLocation): Promise<void> {
		switch (location.type) {
			case "googleDrive": {
				const buffer = await this.googleAPIClient.getFile(location.fileId);
				const body = await new Promise<string>((resolve) => {
					const reader = new FileReader();
					reader.addEventListener("loadend", () => {
						resolve(reader.result as string);
					});
					reader.readAsText(new Blob([buffer]));
				});
				const data = JSON.parse(body) as SerializedSong;
				const song = Song.deserialize(data);

				this.bus.emitPhasedEvents("song.put", song);
				this.songStore.setLocation({
					type: "googleDrive",
					fileId: location.fileId,
				});
				break;
			}
			default: {
				// Do Noghint
				return;
			}
		}
		this.statusBar.showMessage("保存しました", 2000);
	}
}
