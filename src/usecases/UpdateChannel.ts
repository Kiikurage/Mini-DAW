import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import type { FileStore } from "../FileStore.ts";
import type { ChannelId, ChannelPatch } from "../models/Channel.ts";
import { Song } from "../models/Song.ts";

export const UpdateChannelKey = ComponentKey<UpdateChannel>("UpdateChannel");

export function UpdateChannel({
	history,
	bus,
	fileStore,
}: {
	history: EditHistoryManager;
	bus: EventBus;
	fileStore: FileStore;
}) {
	return (channelId: ChannelId, patch: ChannelPatch) => {
		const channel = Song.getChannel(fileStore.state.song, channelId);
		if (channel === null) return;

		const inversePatch: ChannelPatch = Object.fromEntries(
			Object.keys(patch).map(
				(key) => [key, channel.metadata[key as keyof ChannelPatch]] as const,
			),
		);

		history.execute({
			do: () => {
				bus.emitPhasedEvents("channel.update", channelId, patch);
			},
			undo: () => {
				bus.emitPhasedEvents("channel.update", channelId, inversePatch);
			},
		});
		history.markCheckpoint();
	};
}
export type UpdateChannel = ReturnType<typeof UpdateChannel>;
