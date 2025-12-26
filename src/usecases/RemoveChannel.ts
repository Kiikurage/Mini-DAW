import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import type { SongStore } from "../SongStore.ts";

export const RemoveChannelKey = ComponentKey<RemoveChannel>("RemoveChannel");

export function RemoveChannel({
	history,
	songStore,
	bus,
}: {
	history: EditHistoryManager;
	songStore: SongStore;
	bus: EventBus;
}) {
	return (channelId: number) => {
		const channel = songStore.state.song.getChannel(channelId);
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
