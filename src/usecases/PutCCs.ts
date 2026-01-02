import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import type { FileStore } from "../FileStore.ts";
import type { CC, CCId } from "../models/CC.ts";
import type { ChannelId } from "../models/Channel.ts";
import type { ControlType } from "../models/ControlType.ts";
import { Song } from "../models/Song.ts";

export const PutCCsKey = ComponentKey<PutCCs>("PutCCs");

export function PutCCs({
	bus,
	history,
	fileStore,
}: {
	bus: EventBus;
	history: EditHistoryManager;
	fileStore: FileStore;
}) {
	return (
		channelId: ChannelId,
		type: ControlType,
		ccs: Iterable<CC>,
		markCheckpoint: boolean,
	) => {
		const channel = Song.getChannel(fileStore.state.song, channelId);
		if (channel === null) return;

		const ccList = channel.ccLists.get(type);

		const addedCCIds: CCId[] = [];
		const oldCCs: CC[] = [];
		for (const cc of ccs) {
			const oldCC = ccList?.ccs?.get(cc.id);
			if (oldCC === undefined) {
				addedCCIds.push(cc.id);
			} else {
				oldCCs.push(oldCC);
			}
		}

		history.execute({
			do: () => {
				bus.emitPhasedEvents("control.put", {
					channelId,
					type,
					ccs,
				});
			},
			undo: () => {
				bus.emitPhasedEvents("control.remove", {
					channelId,
					type,
					ids: addedCCIds,
				});
				bus.emitPhasedEvents("control.put", {
					channelId,
					type,
					ccs: oldCCs,
				});
			},
		});
		if (markCheckpoint) {
			history.markCheckpoint();
		}
	};
}

export type PutCCs = ReturnType<typeof PutCCs>;
