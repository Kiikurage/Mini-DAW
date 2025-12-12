import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { SongStore } from "../SongStore.ts";

export const SaveFileKey = ComponentKey<SaveFile>("SaveFile");

export function SaveFile({ songStore }: { songStore: SongStore }) {
	return () => {
		const song = songStore.state;
		const serializedSong = song.serialize();
		const json = JSON.stringify(serializedSong);

		downloadText({
			body: json,
			fileName: `${song.title}.json`,
			mimeType: "application/json",
		});
	};
}
export type SaveFile = ReturnType<typeof SaveFile>;

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
