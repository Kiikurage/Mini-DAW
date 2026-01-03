import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { GoogleAPIClient } from "../GoogleDriveAPI/GoogleAPIClient.ts";
import { unreachable } from "../lib.ts";
import type { FileLocation } from "../models/FileLocation.ts";
import type { MDFile } from "../models/MDFile.ts";
import { type SerializedSong, Song } from "../models/Song.ts";

export const OpenFileKey = ComponentKey<OpenFile>("OpenFile");

/**
 * オンライン上のファイルを取得する。ファイルは戻り値として返されるのみで、
 * アプリケーション上へは展開されない。
 */
export function OpenFile({
	googleAPIClient,
}: {
	googleAPIClient: GoogleAPIClient;
}) {
	return async (location: FileLocation): Promise<MDFile> => {
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

				return {
					song,
					metadata: {
						name: file.name,
						location,
					},
				};
			}
			default: {
				unreachable(location.type);
			}
		}
	};
}

export type OpenFile = ReturnType<typeof OpenFile>;
