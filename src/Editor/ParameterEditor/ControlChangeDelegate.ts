import { MouseEventButton, NUM_KEYS } from "../../constants.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { getMarqueeArea } from "../../getMarqueeArea.ts";
import { assertNotNullish } from "../../lib.ts";
import type { ControlChange } from "../../models/ControlChange.ts";
import type { ControlType } from "../../models/ControlType.ts";
import type { Song } from "../../models/Song.ts";
import {
	composeInteractionHandle,
	type PointerEventManagerInteractionHandle,
} from "../../PointerEventManager/PointerEventManagerInteractionHandle.ts";
import type { SongStore } from "../../SongStore.ts";
import type { PutControlChange } from "../../usecases/PutControlChange.ts";
import type { RemoveControlChanges } from "../../usecases/RemoveControlChanges.ts";
import {
	type Editor,
	type EditorState,
	getSelectedControlChangeTicks,
	getSelectedNoteIds,
} from "../Editor.ts";
import type { ControlChangeParametrType } from "../ParameterType.ts";
import { toParameterEditorPosition } from "./features.ts";
import type { ParameterEditor } from "./ParameterEditor.ts";
import {
	ParameterEditorSampleDelegate,
	type ParameterSample,
} from "./ParameterEditorSampleDelegate.ts";

export class ControlChangeDelegate extends ParameterEditorSampleDelegate {
	private readonly controlType: ControlType;

	constructor(
		parameterType: ControlChangeParametrType,
		songStore: SongStore,
		editor: Editor,
		parameterEditor: ParameterEditor,
		private readonly putControlChange: PutControlChange,
		private readonly removeControlChange: RemoveControlChanges,
	) {
		super(parameterType, editor, parameterEditor, songStore);
		this.controlType = parameterType.controlType;
	}

	getAllSamples(): Iterable<ParameterSample> {
		const channel = getActiveChannel(
			this.songStore.state.song,
			this.editor.state,
		);
		if (channel === null) return [];

		return (channel.controlChanges.get(this.controlType)?.toArray() ?? []).map(
			createSample,
		);
	}

	getSelectedSamples(): Iterable<ParameterSample> {
		return getSelectedControlChanges(
			this.songStore.state.song,
			this.editor.state,
			this.controlType,
		).map(createSample);
	}

	override getBackgroundInteractionHandle() {
		return composeInteractionHandle(
			putControlChangeFeature(
				this.editor,
				this.parameterEditor,
				this.putControlChange,
				this.controlType,
			),
			selectByRangeFeature(
				this.editor,
				this.parameterEditor,
				this.songStore,
				this.controlType,
			),
		);
	}

	override getSelectionInteractionHandle() {
		return composeInteractionHandle(
			changeValueFeature(
				this.editor,
				this.parameterEditor,
				this.putControlChange,
				this.controlType,
			),
		);
	}

	override getSampleInteractionHandle(sampleId: number) {
		return composeInteractionHandle(
			toggleSelectionFeature(sampleId, this.editor),
			changeValueFeature(
				this.editor,
				this.parameterEditor,
				this.putControlChange,
				this.controlType,
			),
			removeControlChangeFeature(
				this.editor,
				this.removeControlChange,
				this.controlType,
				sampleId,
			),
		);
	}
}

function putControlChangeFeature(
	editor: Editor,
	parameterEditor: ParameterEditor,
	putControlChange: PutControlChange,
	controlType: ControlType,
): PointerEventManagerInteractionHandle {
	return {
		handlePointerDown(ev) {
			ev.sessionEvents.on("tap", (ev) => {
				const channelId = editor.state.activeChannelId;
				if (channelId === null) return;

				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);

				putControlChange({
					channelId,
					type: controlType,
					changes: [
						{
							tick: position.tick,
							value: position.value,
						},
					],
				});
			});
		},
	};
}

function removeControlChangeFeature(
	editor: Editor,
	removeControlChange: RemoveControlChanges,
	controlType: ControlType,
	sampleId: number,
): PointerEventManagerInteractionHandle {
	return {
		handleDoubleClick() {
			const channelId = editor.state.activeChannelId;
			if (channelId === null) return;

			removeControlChange({
				channelId,
				type: controlType,
				ticks: [sampleId],
			});
		},
	};
}

function createSample(cc: ControlChange) {
	return {
		id: cc.tick,
		tick: cc.tick,
		value: cc.value,
	};
}

function changeValueFeature(
	editor: Editor,
	parameterEditor: ParameterEditor,
	putControlChange: PutControlChange,
	controlType: ControlType,
): PointerEventManagerInteractionHandle {
	return {
		handlePointerDown: (ev) => {
			const channelId = editor.state.activeChannelId;
			if (channelId === null) return;

			const selectedTicks = getSelectedControlChangeTicks(
				editor.state,
				controlType,
			);

			ev.sessionEvents.on("dragStart", (ev) => {
				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);
				putControlChange({
					channelId,
					type: controlType,
					changes: [...selectedTicks].map((tick) => ({
						tick: tick,
						value: position.value,
					})),
				});
			});
			ev.sessionEvents.on("dragMove", (ev) => {
				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);
				putControlChange({
					channelId,
					type: controlType,
					changes: [...selectedTicks].map((tick) => ({
						tick: tick,
						value: position.value,
					})),
				});
			});
			ev.sessionEvents.on("dragEnd", (ev) => {
				const position = toParameterEditorPosition(
					ev.position,
					editor.state,
					parameterEditor.state,
				);
				putControlChange({
					channelId,
					type: controlType,
					changes: [...selectedTicks].map((tick) => ({
						tick: tick,
						value: position.value,
					})),
				});
			});
		},
	};
}

function selectByRangeFeature(
	editor: Editor,
	parameterEditor: ParameterEditor,
	songStore: SongStore,
	controlType: ControlType,
): PointerEventManagerInteractionHandle {
	return {
		handlePointerDown: (ev) => {
			if (ev.button === MouseEventButton.PRIMARY) {
				if (!ev.metaKey) {
					editor.clearSelection();
				}
			}

			const selectedControlChangeTicks = getSelectedControlChangeTicks(
				editor.state,
				controlType,
			);
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

				const ticksInArea: number[] = [];
				if (marqueeArea !== null) {
					const channelId = editor.state.activeChannelId;
					if (channelId !== null) {
						const channel = songStore.state.song.getChannel(channelId);
						assertNotNullish(channel);

						const controlChanges = channel.controlChanges.get(controlType);
						if (controlChanges !== undefined) {
							for (const cc of controlChanges.messages) {
								if (
									marqueeArea.tickFrom < cc.tick &&
									cc.tick < marqueeArea.tickTo
								) {
									ticksInArea.push(cc.tick);
								}
							}
						}
					}
				}
				editor.setSelectedControlChanges(controlType, [
					...selectedControlChangeTicks,
					...ticksInArea,
				]);
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

export function* getSelectedControlChanges(
	song: Song,
	editorState: EditorState,
	controlType: ControlType,
): Generator<ControlChange> {
	const activeChannel = getActiveChannel(song, editorState);
	if (activeChannel === null) return;

	const controlChangeList = activeChannel.controlChanges.get(controlType);
	if (controlChangeList === undefined) return;

	const ticks = getSelectedControlChangeTicks(editorState, controlType);

	for (const cc of controlChangeList.messages) {
		if (ticks.has(cc.tick)) yield cc;
	}
}
