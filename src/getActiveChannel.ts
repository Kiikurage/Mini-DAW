import type { EditorState } from "./Editor/Editor.ts";
import type { Channel } from "./models/Channel.ts";
import type { Song } from "./models/Song.ts";

export function getActiveChannel(
	song: Song,
	editorState: EditorState,
): Channel | null {
	if (editorState.activeChannelId === null) return null;
	return song.getChannel(editorState.activeChannelId);
}
