import { getActiveChannel } from "../../getActiveChannel.ts";
import type { Note } from "../../models/Note.ts";
import type { SongStore } from "../../SongStore.ts";
import type { SetNoteParameter } from "../../usecases/SetNoteParameter.ts";
import type { Editor } from "../Editor.ts";
import type {
	ParameterEditorSampleDelegate,
	ParameterSample,
} from "./ParameterEditorSampleDelegate.ts";

export class VelocityDelegate implements ParameterEditorSampleDelegate {
	constructor(
		private readonly songStore: SongStore,
		private readonly editor: Editor,
		private readonly setNoteParameter: SetNoteParameter,
	) {}

	getAllSamples(): Iterable<ParameterSample> {
		const channel = getActiveChannel(this.songStore.state, this.editor.state);
		if (channel === null) return [];

		return [...channel.notes.values()].map(createSample);
	}

	getSelectedSamples(): Iterable<ParameterSample> {
		const channel = getActiveChannel(this.songStore.state, this.editor.state);
		if (channel === null) return [];

		return [...channel.notes.values()]
			.filter((note) => this.editor.state.selectedNoteIds.has(note.id))
			.map(createSample);
	}

	update(sampleIds: Iterable<number>, value: number): void {
		const channelId = this.editor.state.activeChannelId;
		if (channelId === null) return;

		this.setNoteParameter(channelId, sampleIds, "velocity", value);
	}
}

function createSample(note: Note) {
	return {
		id: note.id,
		tick: note.tickFrom,
		value: note.velocity,
	};
}
