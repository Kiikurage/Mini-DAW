import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import type { Song } from "../models/Song.ts";

export const SetSongKey = ComponentKey<SetSong>("SetSong");

export function SetSong({ bus }: { bus: EventBus }) {
	return (song: Song) => {
		bus.emitPhasedEvents("song.set", song);
	};
}
export type SetSong = ReturnType<typeof SetSong>;
