import { MouseEventButton, NUM_KEYS } from "../../constants.ts";
import type { FileStore } from "../../FileStore.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { getMarqueeArea } from "../../getMarqueeArea.ts";
import { assertNotNullish } from "../../lib.ts";
import type { Note } from "../../models/Note.ts";
import {
	composeInteractionHandle,
	type PointerEventManagerInteractionHandle,
} from "../../PointerEventManager/PointerEventManagerInteractionHandle.ts";
import type { UpdateNotes } from "../../usecases/UpdateNotes.ts";
import { type Editor, getSelectedNoteIds } from "../Editor.ts";
import { VelocityParameterType } from "../ParameterType.ts";
import { toParameterEditorPosition } from "./features.ts";
import type { ParameterEditor } from "./ParameterEditor.ts";
import {
	ParameterEditorSampleDelegate,
	type ParameterSample,
} from "./ParameterEditorSampleDelegate.ts";

export class VelocityDelegate extends ParameterEditorSampleDelegate {
	constructor(
		fileStore: FileStore,
		editor: Editor,
		parameterEditor: ParameterEditor,
		private readonly updateNotes: UpdateNotes,
	) {
		super(VelocityParameterType, editor, parameterEditor, fileStore);
	}

	getAllSamples(): Iterable<ParameterSample> {
		const channel = getActiveChannel(
			this.fileStore.state.song,
			this.editor.state,
		);
		if (channel === null) return [];

		return [...channel.notes.values()].map(createSample);
	}

	getSelectedSamples(): Iterable<ParameterSample> {
		const channel = getActiveChannel(
			this.fileStore.state.song,
			this.editor.state,
		);
		if (channel === null) return [];

		return [...channel.notes.values()]
			.filter((note) => getSelectedNoteIds(this.editor.state).has(note.id))
			.map(createSample);
	}

	update(sampleIds: Iterable<number>, value: number): void {
		const channelId = this.editor.state.activeChannelId;
		if (channelId === null) return;

		this.updateNotes(
			channelId,
			[...sampleIds].map((id) => ({ id, velocity: value })),
		);
	}

	override getBackgroundInteractionHandle() {
		return composeInteractionHandle(
			selectByRangeFeature(this.editor, this.parameterEditor, this.fileStore),
		);
	}

	override getSelectionInteractionHandle() {
		return composeInteractionHandle(
			changeValueFeature(this.editor, this.parameterEditor, this.updateNotes),
		);
	}

	override getSampleInteractionHandle(sampleId: number) {
		return composeInteractionHandle(
			toggleSelectionFeature(sampleId, this.editor),
			changeValueFeature(this.editor, this.parameterEditor, this.updateNotes),
		);
	}
}

function createSample(note: Note) {
	return {
		id: note.id,
		tick: note.tickFrom,
		value: note.velocity,
	};
}

function changeValueFeature(
	editor: Editor,
	parameterEditor: ParameterEditor,
	updateNotes: UpdateNotes,
): PointerEventManagerInteractionHandle {
	return {
		handlePointerDown: (ev) => {
			const channelId = editor.state.activeChannelId;
			if (channelId === null) return;

			const selectedNoteIds = getSelectedNoteIds(editor.state);

			ev.sessionEvents.on("dragStart", (ev) => {
				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);
				updateNotes(
					channelId,
					[...selectedNoteIds].map((id) => ({ id, velocity: position.value })),
				);
			});
			ev.sessionEvents.on("dragMove", (ev) => {
				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);
				updateNotes(
					channelId,
					[...selectedNoteIds].map((id) => ({ id, velocity: position.value })),
				);
			});
			ev.sessionEvents.on("dragEnd", (ev) => {
				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);
				updateNotes(
					channelId,
					[...selectedNoteIds].map((id) => ({ id, velocity: position.value })),
				);
			});
		},
	};
}

function selectByRangeFeature(
	editor: Editor,
	parameterEditor: ParameterEditor,
	fileStore: FileStore,
): PointerEventManagerInteractionHandle {
	return {
		handlePointerDown: (ev) => {
			if (ev.button === MouseEventButton.PRIMARY) {
				if (!ev.metaKey) {
					editor.clearSelection();
				}
			}

			const selectedNoteIds = getSelectedNoteIds(editor.state);
			ev.sessionEvents.on("dragStart", (ev) => {
				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);
				editor.startMarqueeSelection({ tick: position.tick, key: 0 });
			});
			ev.sessionEvents.on("dragMove", (ev) => {
				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);
				editor.setMarqueeAreaTo({ tick: position.tick, key: NUM_KEYS });
				const marqueeArea = getMarqueeArea(
					editor.state.marqueeAreaFrom,
					editor.state.marqueeAreaTo,
				);

				const noteIdsInArea: number[] = [];
				if (marqueeArea !== null) {
					const channelId = editor.state.activeChannelId;
					if (channelId !== null) {
						const channel = fileStore.state.song.getChannel(channelId);
						assertNotNullish(channel);

						for (const note of channel.notes.values()) {
							if (
								marqueeArea.tickFrom <= note.tickFrom &&
								note.tickFrom < marqueeArea.tickTo
							) {
								noteIdsInArea.push(note.id);
							}
						}
					}
				}
				editor.setSelectedNotes([...selectedNoteIds, ...noteIdsInArea]);
			});
			ev.sessionEvents.on("dragEnd", () => {
				editor.stopMarqueeSelection();
			});
		},
	};
}

function toggleSelectionFeature(
	sampleId: number,
	editor: Editor,
): PointerEventManagerInteractionHandle {
	return {
		handlePointerDown: (ev) => {
			if (ev.button !== MouseEventButton.PRIMARY) return;

			const selected = getSelectedNoteIds(editor.state).has(sampleId);
			if (selected) {
				if (ev.metaKey) {
					ev.sessionEvents.on("tap", () => {
						editor.removeNotesFromSelection([sampleId]);
					});
				}
			} else {
				editor.clearSelection();
				editor.putNotesToSelection([sampleId]);
			}
		},
	};
}
