import { MouseEventButton, NUM_KEYS } from "../../constants.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { getMarqueeArea } from "../../getMarqueeArea.ts";
import { assertNotNullish } from "../../lib.ts";
import type { Note } from "../../models/Note.ts";
import type { PointerEventManagerEvent } from "../../PointerEventManager/PointerEventManagerEvent.ts";
import {
	composeInteractionHandle,
	type PointerEventManagerInteractionHandle,
} from "../../PointerEventManager/PointerEventManagerInteractionHandle.ts";
import type { SongStore } from "../../SongStore.ts";
import type { SetNoteParameter } from "../../usecases/SetNoteParameter.ts";
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
		songStore: SongStore,
		editor: Editor,
		parameterEditor: ParameterEditor,
		private readonly setNoteParameter: SetNoteParameter,
	) {
		super(VelocityParameterType, editor, parameterEditor, songStore);
	}

	getAllSamples(): Iterable<ParameterSample> {
		const channel = getActiveChannel(this.songStore.state, this.editor.state);
		if (channel === null) return [];

		return [...channel.notes.values()].map(createSample);
	}

	getSelectedSamples(): Iterable<ParameterSample> {
		const channel = getActiveChannel(this.songStore.state, this.editor.state);
		if (channel === null) return [];

		return [...channel.notes.values()]
			.filter((note) => getSelectedNoteIds(this.editor.state).has(note.id))
			.map(createSample);
	}

	update(sampleIds: Iterable<number>, value: number): void {
		const channelId = this.editor.state.activeChannelId;
		if (channelId === null) return;

		this.setNoteParameter(channelId, sampleIds, "velocity", value);
	}

	override getBackgroundInteractionHandle() {
		return composeInteractionHandle(
			selectByRangeFeature(this.editor, this.parameterEditor, this.songStore),
		);
	}

	override getSelectionInteractionHandle() {
		return composeInteractionHandle(
			changeValueFeature(
				this.editor,
				this.parameterEditor,
				this.setNoteParameter,
			),
		);
	}

	override getSampleInteractionHandle(sampleId: number) {
		return composeInteractionHandle(
			toggleSelectionFeature(sampleId, this.editor),
			changeValueFeature(
				this.editor,
				this.parameterEditor,
				this.setNoteParameter,
			),
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
	setNoteParameter: SetNoteParameter,
): PointerEventManagerInteractionHandle {
	return {
		handlePointerDown: (ev) => {
			const channelId = editor.state.activeChannelId;
			if (channelId === null) return;

			const selectedNoteIds = getSelectedNoteIds(editor.state);

			ev.addDragStartSessionListener((ev: PointerEventManagerEvent) => {
				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);
				setNoteParameter(
					channelId,
					selectedNoteIds,
					"velocity",
					position.value,
				);
			});
			ev.addDragMoveSessionListener((ev: PointerEventManagerEvent) => {
				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);
				setNoteParameter(
					channelId,
					selectedNoteIds,
					"velocity",
					position.value,
				);
			});
			ev.addDragEndSessionListener((ev: PointerEventManagerEvent) => {
				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);
				setNoteParameter(
					channelId,
					selectedNoteIds,
					"velocity",
					position.value,
				);
			});
		},
	};
}

function selectByRangeFeature(
	editor: Editor,
	parameterEditor: ParameterEditor,
	songStore: SongStore,
): PointerEventManagerInteractionHandle {
	return {
		handlePointerDown: (ev: PointerEventManagerEvent) => {
			if (ev.button === MouseEventButton.PRIMARY) {
				if (!ev.metaKey) {
					editor.clearSelection();
				}
			}

			const selectedNoteIds = getSelectedNoteIds(editor.state);
			ev.addDragStartSessionListener((ev) => {
				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);
				editor.startMarqueeSelection({ tick: position.tick, key: 0 });
			});
			ev.addDragMoveSessionListener((ev) => {
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
						const channel = songStore.state.getChannel(channelId);
						assertNotNullish(channel);

						for (const note of channel.notes.values()) {
							if (
								note.tickFrom < marqueeArea.tickTo &&
								note.tickTo > marqueeArea.tickFrom
							) {
								noteIdsInArea.push(note.id);
							}
						}
					}
				}
				editor.setSelectedNotes([...selectedNoteIds, ...noteIdsInArea]);
			});
			ev.addDragEndSessionListener(() => {
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
		handlePointerDown: (ev: PointerEventManagerEvent) => {
			if (ev.button !== MouseEventButton.PRIMARY) return;

			const selected = getSelectedNoteIds(editor.state).has(sampleId);
			if (selected) {
				if (ev.metaKey) {
					ev.addTapSessionListener(() => {
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
