import { useEffect, useState } from "react";
import type { Editor, EditorState } from "./Editor/Editor.ts";
import type { FileStore } from "./FileStore.ts";
import type { Channel } from "./models/Channel.ts";
import { Song } from "./models/Song.ts";
import { useStateful } from "./Stateful/useStateful.tsx";

export function getActiveChannel(
	song: Song,
	editorState: EditorState,
): Channel | null {
	if (editorState.activeChannelId === null) return null;
	return Song.getChannel(song, editorState.activeChannelId);
}

export function useActiveChannel(
	fileStore: FileStore,
	editor: Editor,
): Channel | null {
	const activeChannelId = useStateful(editor, (state) => state.activeChannelId);
	const song = useStateful(fileStore, (state) => state.song);

	if (activeChannelId === null) return null;

	return Song.getChannel(song, activeChannelId);
}

export function useActiveChannelMetadata(
	fileStore: FileStore,
	editor: Editor,
): Channel["metadata"] | null {
	const [activeChannelMetadata, setActiveChannelMetadata] = useState<
		Channel["metadata"] | null
	>(null);
	const activeChannelId = useStateful(editor, (state) => state.activeChannelId);
	useEffect(() => {
		if (activeChannelId === null) {
			setActiveChannelMetadata(null);
			return;
		}

		return fileStore.subscribeChannel(
			activeChannelId,
			setActiveChannelMetadata,
		);
	}, [activeChannelId]);

	return activeChannelMetadata;
}
