import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import type { ChannelPatch } from "../models/Channel.ts";
import type { SongStore } from "../SongStore.ts";

export const UpdateChannelKey = ComponentKey<UpdateChannel>("UpdateChannel");

export function UpdateChannel({
	history,
	bus,
	songStore,
}: {
	history: EditHistoryManager;
	bus: EventBus;
	songStore: SongStore;
}) {
	return (channelId: number, patch: ChannelPatch) => {
		const channel = songStore.state.getChannel(channelId);
		if (channel === null) return;

		const inversePatch: ChannelPatch = Object.fromEntries(
			Object.keys(patch).map(
				(key) => [key, channel[key as keyof ChannelPatch]] as const,
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
