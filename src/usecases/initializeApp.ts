import { createRoot } from "react-dom/client";
import { AppView } from "../App/AppView.tsx";
import { ComponentKey } from "../Dependency/DIContainer.ts";
import { DIContainerProvider } from "../Dependency/DIContainerProvider.tsx";
import type { Editor } from "../Editor/Editor.ts";
import { PreInstalledSouindFonts } from "../PreInstalledSouindFonts.ts";
import type { SongStore } from "../SongStore.ts";
import type { SoundFontStore } from "../SoundFontStore.ts";
import type { SoundFontSynthesizer } from "../SoundFontSynthesizer.ts";
import type { Synthesizer } from "../Synthesizer.ts";
import type { NewFile } from "./NewFile.ts";

export const InitializeAppKey = ComponentKey<InitializeApp>("InitializeApp");

export function InitializeApp({
	newFile,
	songStore,
	editor,
	soundFontStore,
	synthesizer,
}: {
	newFile: NewFile;
	songStore: SongStore;
	editor: Editor;
	soundFontStore: SoundFontStore;
	synthesizer: Synthesizer;
}) {
	return () => {
		(async () => {
			const sf = await soundFontStore.load(
				PreInstalledSouindFonts[0]!.soundFontUrl,
			);
			(synthesizer as SoundFontSynthesizer).soundFont = sf;
		})();

		newFile(false);
		editor.setActiveChannel(songStore.state.channels[0]?.id ?? null);
	};
}

export type InitializeApp = ReturnType<typeof InitializeApp>;
