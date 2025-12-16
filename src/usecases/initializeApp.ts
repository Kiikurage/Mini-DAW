import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { Editor } from "../Editor/Editor.ts";
import type { SongStore } from "../SongStore.ts";
import type { NewFile } from "./NewFile.ts";

export const InitializeAppKey = ComponentKey<InitializeApp>("InitializeApp");

export function InitializeApp({
	newFile,
	songStore,
	editor,
}: {
	newFile: NewFile;
	songStore: SongStore;
	editor: Editor;
}) {
	return () => {
		newFile(false);
		editor.setActiveChannel(songStore.state.channels[0]?.id);
	};
}

export type InitializeApp = ReturnType<typeof InitializeApp>;
