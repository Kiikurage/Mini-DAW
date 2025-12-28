import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import type { FileStore } from "../FileStore.ts";
import type { ChannelPatch } from "../models/Channel.ts";

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
	return (channelId: number, patch: ChannelPatch) => {
		const channel = fileStore.state.song.getChannel(channelId);
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
