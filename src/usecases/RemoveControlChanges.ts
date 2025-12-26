import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { EventBus } from "../EventBus.ts";
import { isNotNullish, toSet } from "../lib.ts";
import type { ControlChange } from "../models/ControlChange.ts";
import type { ControlType } from "../models/ControlType.ts";
import type { Note } from "../models/Note.ts";
import type { SongStore } from "../SongStore.ts";

export const RemoveControlChangesKey = ComponentKey<RemoveControlChanges>(
	"RemoveControlChanges",
);

export function RemoveControlChanges({
	bus,
	history,
	songStore,
}: {
	bus: EventBus;
	history: EditHistoryManager;
	songStore: SongStore;
}) {
	return (args: {
		channelId: number;
		type: ControlType;
		ticks: Iterable<number>;
	}) => {
		const channel = songStore.state.song.getChannel(args.channelId);
		if (channel === null) return;

		const changeList = channel.controlChanges.get(args.type);
		if (changeList === undefined) return;

		const tickSet = toSet(args.ticks);
		const changes = changeList.messages.filter((change) =>
			tickSet.has(change.tick),
		);

		history.execute({
			do: () => {
				bus.emitPhasedEvents("control.remove", args);
			},
			undo: () => {
				bus.emitPhasedEvents("control.put", {
					channelId: args.channelId,
					type: args.type,
					changes,
				});
			},
		});
		history.markCheckpoint();
	};
}

export type RemoveControlChanges = ReturnType<typeof RemoveControlChanges>;
