import { createRoot } from "react-dom/client";
import { AppView } from "./App/AppView.tsx";
import { DIContainerProvider } from "./Dependency/DIContainerProvider.tsx";
import { configureDeps } from "./deps.tsx";
import { PreInstalledSouindFonts } from "./PreInstalledSouindFonts.ts";
import { SoundFontStore } from "./SoundFontStore.ts";
import type { SoundFontSynthesizer } from "./SoundFontSynthesizer.ts";
import { SynthesizerKey } from "./Synthesizer.ts";

document.addEventListener("DOMContentLoaded", async () => {
	const deps = configureDeps();

	const synthesizer = deps.get(SynthesizerKey) as SoundFontSynthesizer;
	const sf = await deps
		.get(SoundFontStore.Key)
		.load(PreInstalledSouindFonts[0]?.soundFontUrl);
	synthesizer.soundFont = sf;

	const root = document.createElement("div");
	document.body.appendChild(root);

	createRoot(root).render(
		<DIContainerProvider container={deps}>
			<AppView />
		</DIContainerProvider>,
	);
});
