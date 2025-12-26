import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { GoogleAPIClient } from "../GoogleDriveAPI/GoogleAPIClient.ts";
import { sleep } from "../lib.ts";
import type { SongStore } from "../SongStore.ts";

export const SaveToGoogleDriveKey =
	ComponentKey<SaveToGoogleDrive>("SaveToGoogleDrive");

export function SaveToGoogleDrive({
	songStore,
	googleAPIClient,
}: {
	songStore: SongStore;
	googleAPIClient: GoogleAPIClient;
}) {
	return async ({
		parentId,
		fileName,
	}: {
		parentId: string;
		fileName: string;
	}) => {
		const song = songStore.state;
		const serializedSong = song.serialize();
		const json = JSON.stringify(serializedSong);

		return await googleAPIClient.uploadFile({
			parentId,
			file: new File([json], fileName, {
				type: "application/json",
			}),
		});
	};
}
export type SaveToGoogleDrive = ReturnType<typeof SaveToGoogleDrive>;
