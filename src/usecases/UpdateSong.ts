import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import type { SongPatch } from "../models/Song.ts";

export const UpdateSongKey = ComponentKey<UpdateSong>("UpdateSong");

export function UpdateSong(bus: EventBus) {
	return (patch: SongPatch) => {
		bus.emitPhasedEvents("song.update", patch);
	};
}
export type UpdateSong = ReturnType<typeof UpdateSong>;
