import { ComponentKey } from "../Dependency/DIContainer.ts";
import { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Song } from "../models/Song.ts";
import { PreInstalledSouindFonts } from "../PreInstalledSouindFonts.ts";
import type { PutFile } from "./PutFile.ts";

export const NewFileKey = ComponentKey<NewFile>("NewFile");

/**
 * 新しいファイルを作成する。
 */
export function NewFile({ putFile }: { putFile: PutFile }) {
	return (withConfirmation: boolean) => {
		if (withConfirmation) {
			if (
				!confirm("現在の作業内容は保存されません。本当に新規作成しますか？")
			) {
				return;
			}
		}

		putFile({
			song: new Song({
				title: "Untitled",
				bpm: 120,
				channels: [
					new Channel({
						id: 0,
						label: "",
						instrumentKey: new InstrumentKey(
							PreInstalledSouindFonts[0]!.name,
							0,
							0,
						),
						notes: new Map(),
						controlChanges: new Map(),
						color: Channel.COLORS[0],
					}),
					new Channel({
						id: 1,
						label: "",
						instrumentKey: new InstrumentKey(
							PreInstalledSouindFonts[0]!.name,
							0,
							0,
						),
						notes: new Map(),
						controlChanges: new Map(),
						color: Channel.COLORS[1],
					}),
					new Channel({
						id: 2,
						label: "",
						instrumentKey: new InstrumentKey(
							PreInstalledSouindFonts[0]!.name,
							0,
							0,
						),
						notes: new Map(),
						controlChanges: new Map(),
						color: Channel.COLORS[2],
					}),
				],
			}),
			metadata: null,
		});
	};
}

export type NewFile = ReturnType<typeof NewFile>;
