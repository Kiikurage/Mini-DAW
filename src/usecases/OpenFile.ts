import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { Editor } from "../Editor/Editor.ts";
import type { EventBus } from "../EventBus.ts";
import type { FileStore } from "../FileStore.ts";
import type { GoogleAPIClient } from "../GoogleDriveAPI/GoogleAPIClient.ts";
import { neverReachable } from "../lib.ts";
import type { FileLocation } from "../models/FileLocation.ts";
import { type SerializedSong, Song } from "../models/Song.ts";
import type { RecentFileService } from "../RecentFileService.ts";

export const OpenFileKey = ComponentKey<OpenFile>("OpenFile");

export function OpenFile({
	bus,
	editor,
	fileStore,
	googleAPIClient,
	recentFileService,
}: {
	bus: EventBus;
	editor: Editor;
	fileStore: FileStore;
	googleAPIClient: GoogleAPIClient;
	recentFileService: RecentFileService;
}) {
	return async (location: FileLocation) => {
		switch (location.type) {
			case "googleDrive": {
				const file = await googleAPIClient.getFileMetadata(location.fileId);

				const buffer = await googleAPIClient.getFile(location.fileId);
				const body = await new Promise<string>((resolve) => {
					const reader = new FileReader();
					reader.addEventListener("loadend", () => {
						resolve(reader.result as string);
					});
					reader.readAsText(new Blob([buffer]));
				});
				const data = JSON.parse(body) as SerializedSong;
				const song = Song.deserialize(data);

				bus.emitPhasedEvents("song.put", song);
				fileStore.setFileLocation(location);
				recentFileService.upsertEntry({
					songTitle: song.title,
					fileName: file.name,
					location,
				});
				editor.hideWelcomeView();
				break;
			}
			default: {
				neverReachable(location.type);
			}
		}
	};
}

export type OpenFile = ReturnType<typeof OpenFile>;
