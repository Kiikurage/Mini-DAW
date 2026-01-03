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

		const instrumentKey = new InstrumentKey(
			PreInstalledSouindFonts[0]!.name,
			0,
			0,
		);
		let song = Song.create();
		song = Song.putChannel(song, Channel.create(instrumentKey));
		song = Song.putChannel(song, Channel.create(instrumentKey));
		song = Song.putChannel(song, Channel.create(instrumentKey));

		putFile({
			song,
			metadata: null,
		});
	};
}

export type NewFile = ReturnType<typeof NewFile>;
