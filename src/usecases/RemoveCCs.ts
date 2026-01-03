import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import type { FileStore } from "../FileStore.ts";
import { toSet } from "../lib.ts";
import type { CCId } from "../models/CC.ts";
import type { ChannelId } from "../models/Channel.ts";
import type { ControlType } from "../models/ControlType.ts";
import { Song } from "../models/Song.ts";

export const RemoveCCsKey = ComponentKey<RemoveCCs>("RemoveCCs");

export function RemoveCCs({
	bus,
	history,
	fileStore,
}: {
	bus: EventBus;
	history: EditHistoryManager;
	fileStore: FileStore;
}) {
	return (args: {
		channelId: ChannelId;
		type: ControlType;
		ids: Iterable<CCId>;
		markCheckpoint: boolean;
	}) => {
		const channel = Song.getChannel(fileStore.state.song, args.channelId);
		if (channel === null) return;

		const list = channel.ccLists.get(args.type);
		if (list === undefined) return;

		const idSet = toSet(args.ids);
		const ccs = [...(list?.ccs?.values() ?? [])];
		const removedCCs = ccs.filter((change) => idSet.has(change.id));

		history.execute({
			do: () => {
				bus.emitPhasedEvents("control.remove", args);
			},
			undo: () => {
				bus.emitPhasedEvents("control.put", {
					channelId: args.channelId,
					type: args.type,
					ccs: removedCCs,
				});
			},
		});
		if (args.markCheckpoint) {
			history.markCheckpoint();
		}
	};
}

export type RemoveCCs = ReturnType<typeof RemoveCCs>;
