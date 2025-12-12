import { ComponentKey } from "../Dependency/DIContainer.ts";
import { type SerializedSong, Song } from "../models/Song.ts";
import type { StatusBar } from "../StatusBar/StatusBar.tsx";
import type { SetSong } from "./SetSong.ts";

export const LoadFileKey = ComponentKey<LoadFile>("LoadFile");

export function LoadFile({
	statusBar,
	setSong,
}: {
	statusBar: StatusBar;
	setSong: SetSong;
}) {
	return async () => {
		openFileSelectDialog({
			accept: ".json,application/json",
			onOpen: async (file) => {
				// Read file as text by FileReader

				try {
					const body = await new Promise<string>((resolve) => {
						const reader = new FileReader();
						reader.addEventListener("loadend", () => {
							resolve(reader.result as string);
						});
						reader.readAsText(file);
					});
					const data = JSON.parse(body) as SerializedSong;
					const song = Song.deserialize(data);

					setSong(song);
				} catch (e) {
					console.error(e);
					if (e instanceof Error) {
						statusBar.showMessage(e.message);
					}
				}
			},
		});
	};
}

export type LoadFile = ReturnType<typeof LoadFile>;

/**
 * Open file select dialog
 * @param onOpen callback when file is selected
 * @param accept accepted file types
 */
function openFileSelectDialog({
	onOpen,
	accept,
}: {
	onOpen: (file: File) => void;
	accept: string;
}) {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = accept;
	input.addEventListener("change", (ev) => {
		const file = input.files?.[0];
		if (file === undefined) return;
		onOpen(file);
	});
	input.click();
}
