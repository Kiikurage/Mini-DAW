import { getActiveChannel } from "../../getActiveChannel.ts";
import type { ControlChange } from "../../models/ControlChange.ts";
import type { ControlType } from "../../models/ControlType.ts";
import type { SongStore } from "../../SongStore.ts";
import type { PutControlChange } from "../../usecases/PutControlChange.ts";
import type { Editor } from "../Editor.ts";
import type {
	ParameterEditorSampleDelegate,
	ParameterSample,
} from "./ParameterEditorSampleDelegate.ts";

export class ControlChangeDelegate implements ParameterEditorSampleDelegate {
	constructor(
		private readonly songStore: SongStore,
		private readonly editor: Editor,
		private readonly putControlChange: PutControlChange,
		private readonly controlType: ControlType,
	) {}

	getAllSamples(): Iterable<ParameterSample> {
		const channel = getActiveChannel(this.songStore.state, this.editor.state);
		if (channel === null) return [];

		return (channel.controlChanges.get(this.controlType)?.toArray() ?? []).map(
			createSample,
		);
	}

	getSelectedSamples(): Iterable<ParameterSample> {
		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel === null) return [];

		// TODO
		return [];
	}

	update(sampleIds: Iterable<number>, value: number): void {
		const channelId = this.editor.state.activeChannelId;
		if (channelId === null) return;

		this.putControlChange({
			channelId,
			type: this.controlType,
			ticks: sampleIds,
			value,
		});
	}

	handleTap(position: { tick: number; value: number }): void {
		const channelId = this.editor.state.activeChannelId;
		if (channelId === null) return;

		this.putControlChange({
			channelId,
			type: this.controlType,
			ticks: [position.tick],
			value: position.value,
		});
	}
}

function createSample(cc: ControlChange) {
	return {
		id: cc.tick,
		tick: cc.tick,
		value: cc.value,
	};
}
