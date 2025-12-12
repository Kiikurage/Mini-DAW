import type { Channel } from "./models/Channel.ts";
import type { Song } from "./models/Song.ts";

export function getActiveChannel(
	song: Song,
	pianoRollState: { activeChannelId: number | null },
): Channel | null {
	if (pianoRollState.activeChannelId === null) return null;
	return song.getChannel(pianoRollState.activeChannelId);
}
