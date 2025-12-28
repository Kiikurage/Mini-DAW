import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { FileStore } from "../FileStore.ts";
import type { GoogleAPIClient } from "../GoogleDriveAPI/GoogleAPIClient.ts";
import type { FileLocation } from "../models/FileLocation.ts";
import type { RecentFileService } from "../RecentFileService.ts";

export const SaveFileKey = ComponentKey<SaveFile>("SaveFile");

export interface DownloadFileArgs {
	type: "download";
}

export interface SaveAsNewFileToGoogleDriveArgs {
	type: "googleDriveAsNewFile";
	parentId: string;
	fileName: string;
}

export interface SaveFileToGoogleDriveArgs {
	type: "googleDrive";
	fileId: string;
}

export type SaveFileArgs =
	| DownloadFileArgs
	| SaveAsNewFileToGoogleDriveArgs
	| SaveFileToGoogleDriveArgs;

export function SaveFile({
	recentFileService,
	fileStore,
	googleAPIClient,
}: {
	recentFileService: RecentFileService;
	fileStore: FileStore;
	googleAPIClient: GoogleAPIClient;
}) {
	const downloadFile = DownloadFile({ fileStore });
	const saveAsNewFileToGoogleDrive = SaveAsNewFileToGoogleDrive({
		fileStore,
		googleAPIClient,
		recentFileService,
	});
	const saveFileToGoogleDrive = SaveFileToGoogleDrive({
		fileStore,
		googleAPIClient,
		recentFileService,
	});

	return async (args: SaveFileArgs) => {
		switch (args.type) {
			case "download": {
				downloadFile();
				break;
			}
			case "googleDriveAsNewFile": {
				saveAsNewFileToGoogleDrive({
					parentId: args.parentId,
					fileName: args.fileName,
				});
				break;
			}
			case "googleDrive": {
				saveFileToGoogleDrive({
					fileId: args.fileId,
				});
				break;
			}
		}
	};
}

export type SaveFile = ReturnType<typeof SaveFile>;

function SaveAsNewFileToGoogleDrive({
	fileStore,
	googleAPIClient,
	recentFileService,
}: {
	fileStore: FileStore;
	googleAPIClient: GoogleAPIClient;
	recentFileService: RecentFileService;
}) {
	return async ({
		parentId,
		fileName,
	}: {
		parentId: string;
		fileName: string;
	}) => {
		const song = fileStore.state.song;
		const serializedSong = song.serialize();
		const json = JSON.stringify(serializedSong);

		const file = await googleAPIClient.postFile({
			parentId,
			file: new File([json], fileName, {
				type: "application/json",
			}),
		});

		const location: FileLocation = {
			type: "googleDrive",
			fileId: file.id,
		};
		recentFileService.upsertEntry({
			songTitle: song.title,
			fileName: file.name,
			location,
		});
		fileStore.setFileLocation(location);
	};
}

function SaveFileToGoogleDrive({
	fileStore,
	googleAPIClient,
	recentFileService,
}: {
	fileStore: FileStore;
	googleAPIClient: GoogleAPIClient;
	recentFileService: RecentFileService;
}) {
	return async ({ fileId }: { fileId: string }) => {
		const song = fileStore.state.song;
		const serializedSong = song.serialize();
		const json = JSON.stringify(serializedSong);

		const file = await googleAPIClient.patchFile({
			fileId,
			file: new File([json], song.title + ".json", {
				type: "application/json",
			}),
		});

		const location: FileLocation = {
			type: "googleDrive",
			fileId: file.id,
		};
		recentFileService.upsertEntry({
			songTitle: song.title,
			fileName: file.name,
			location,
		});
		fileStore.setFileLocation(location);
	};
}

function DownloadFile({ fileStore }: { fileStore: FileStore }) {
	return () => {
		const song = fileStore.state.song;
		const serializedSong = song.serialize();
		const json = JSON.stringify(serializedSong);

		downloadText({
			body: json,
			fileName: `${song.title}.json`,
			mimeType: "application/json",
		});
	};
}

function downloadText({
	body,
	fileName,
	mimeType,
}: {
	body: string;
	fileName: string;
	mimeType: string;
}) {
	const blob = new Blob([body], {
		type: mimeType,
	});
	const file = new File([blob], fileName, {
		type: mimeType,
	});

	const anchor = document.createElement("a");
	anchor.href = URL.createObjectURL(file);
	anchor.download = fileName;
	anchor.click();
}
