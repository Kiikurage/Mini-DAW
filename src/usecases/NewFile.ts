import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import { Channel } from "../models/Channel.ts";
import { Song } from "../models/Song.ts";
import { PreInstalledSouindFonts } from "../PreInstalledSouindFonts.ts";
import { PreInstalledSoundFontInstrumentKey } from "../SoundFontInstrument.ts";

export const NewFileKey = ComponentKey<NewFile>("NewFile");

export function NewFile({ bus }: { bus: EventBus }) {
	return (withConfirmation: boolean) => {
		if (withConfirmation) {
			if (
				!confirm("現在の作業内容は保存されません。本当に新規作成しますか？")
			) {
				return;
			}
		}

		bus.emitPhasedEvents(
			"song.put",
			new Song({
				title: "Untitled",
				bpm: 120,
				channels: [
					new Channel({
						id: 0,
						label: "",
						instrumentKey: new PreInstalledSoundFontInstrumentKey(
							PreInstalledSouindFonts[0]!.name,
							0,
							0,
						),
						notes: new Map(),
						color: Channel.COLORS[0],
					}),
					new Channel({
						id: 1,
						label: "",
						instrumentKey: new PreInstalledSoundFontInstrumentKey(
							PreInstalledSouindFonts[0]!.name,
							0,
							0,
						),
						notes: new Map(),
						color: Channel.COLORS[1],
					}),
					new Channel({
						id: 2,
						label: "",
						instrumentKey: new PreInstalledSoundFontInstrumentKey(
							PreInstalledSouindFonts[0]!.name,
							0,
							0,
						),
						notes: new Map(),
						color: Channel.COLORS[2],
					}),
				],
			}),
		);
	};
}

export type NewFile = ReturnType<typeof NewFile>;
