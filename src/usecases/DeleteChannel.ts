import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import type { SongStore } from "../SongStore.ts";

export const DeleteChannelKey = ComponentKey<DeleteChannel>("DeleteChannel");

export function DeleteChannel({
	history,
	songStore,
	bus,
}: {
	history: EditHistoryManager;
	songStore: SongStore;
	bus: EventBus;
}) {
	return (channelId: number) => {
		const channel = songStore.state.getChannel(channelId);
		if (channel === null) return;

		history.execute({
			do: () => {
				bus.emitPhasedEvents("channel.delete", channelId);
			},
			undo: () => {
				bus.emitPhasedEvents("channel.add", channel);
			},
		});
		history.markCheckpoint();
	};
}
export type DeleteChannel = ReturnType<typeof DeleteChannel>;
