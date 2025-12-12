import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EditHistoryManager } from "../EditHistory/EditHistoryManager.ts";
import type { Editor } from "../Editor/Editor.ts";
import type { EventBus } from "../EventBus.ts";
import type { Channel } from "../models/Channel.ts";

export const AddChannelKey = ComponentKey<AddChannel>("AddChannel");
export function AddChannel({
	history,
	bus,
	editor,
}: {
	history: EditHistoryManager;
	bus: EventBus;
	editor: Editor;
}) {
	return (channel: Channel) => {
		history.execute({
			do: () => {
				bus.emitPhasedEvents("channel.add", channel);
			},
			undo: () => {
				bus.emitPhasedEvents("channel.delete", channel.id);
			},
		});
		history.markCheckpoint();
		editor.setActiveChannel(channel.id);
	};
}
export type AddChannel = ReturnType<typeof AddChannel>;
