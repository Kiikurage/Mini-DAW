import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import type { FileStore } from "../FileStore.ts";
import type { ChannelId } from "../models/Channel.ts";
import { Song } from "../models/Song.ts";

export const RemoveChannelKey = ComponentKey<RemoveChannel>("RemoveChannel");

export function RemoveChannel({
	history,
	fileStore,
	bus,
}: {
	history: EditHistoryManager;
	fileStore: FileStore;
	bus: EventBus;
}) {
	return (channelId: ChannelId) => {
		const channel = Song.getChannel(fileStore.state.song, channelId);
		if (channel === null) return;

		history.execute({
			do: () => {
				bus.emitPhasedEvents("channel.remove", channelId);
			},
			undo: () => {
				bus.emitPhasedEvents("channel.add", channel);
			},
		});
		history.markCheckpoint();
	};
}
export type RemoveChannel = ReturnType<typeof RemoveChannel>;
