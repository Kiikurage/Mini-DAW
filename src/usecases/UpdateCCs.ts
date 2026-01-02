import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { FileStore } from "../FileStore.ts";
import { CC, CCList, type CCPatch } from "../models/CC.ts";
import type { ChannelId } from "../models/Channel.ts";
import type { ControlType } from "../models/ControlType.ts";
import { Song } from "../models/Song.ts";
import type { PutCCs } from "./PutCCs.ts";

export const UpdateCCsKey = ComponentKey<UpdateCCs>("UpdateCCs");

export function UpdateCCs({
	fileStore,
	putCCs,
}: {
	fileStore: FileStore;
	putCCs: PutCCs;
}) {
	return (
		channelId: ChannelId,
		type: ControlType,
		patches: Iterable<CCPatch>,
		markCheckpoint: boolean,
	) => {
		const channel = Song.getChannel(fileStore.state.song, channelId);
		if (channel === null) return;

		const ccs = channel.ccLists.get(type);
		if (ccs === undefined) return;

		const newCCs: CC[] = [];
		for (const patch of patches) {
			const oldCC = CCList.get(ccs, patch.id);
			if (oldCC === null) continue;

			newCCs.push(CC.applyPatch(oldCC, patch));
		}

		putCCs(channelId, type, newCCs, markCheckpoint);
	};
}

export type UpdateCCs = ReturnType<typeof UpdateCCs>;
