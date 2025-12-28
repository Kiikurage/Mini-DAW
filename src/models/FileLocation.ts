export interface GoogleDriveFileLocation {
	type: "googleDrive";
	fileId: string;
}

export type FileLocation = GoogleDriveFileLocation;

export namespace FileLocation {
	export function isEqual(l1: FileLocation, l2: FileLocation): boolean {
		if (l1.type !== l2.type) {
			return false;
		}
		switch (l1.type) {
			case "googleDrive":
				return l1.fileId === (l2 as GoogleDriveFileLocation).fileId;
		}
	}
}
