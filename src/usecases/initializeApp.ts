import type { AutoSaveService } from "../AutoSaveService.ts";
import { ComponentKey } from "../Dependency/DIContainer.ts";
import { PreInstalledSouindFonts } from "../PreInstalledSouindFonts.ts";
import type { SoundFontStore } from "../SoundFontStore.ts";
import type { Synthesizer } from "../Synthesizer.ts";

export const InitializeAppKey = ComponentKey<InitializeApp>("InitializeApp");

export function InitializeApp({
	soundFontStore,
	synthesizer,
	autoSaveService,
}: {
	soundFontStore: SoundFontStore;
	synthesizer: Synthesizer;
	autoSaveService: AutoSaveService;
}) {
	return () => {
		(async () => {
			const sf = await soundFontStore.load(
				PreInstalledSouindFonts[0]!.soundFontUrl,
			);
			synthesizer.setSoundFont(sf);
		})();

		autoSaveService.enableAutoSave();
	};
}

export type InitializeApp = ReturnType<typeof InitializeApp>;
