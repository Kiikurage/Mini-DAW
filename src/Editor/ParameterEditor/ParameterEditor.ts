import { MouseEventButton, NUM_KEYS } from "../../constants.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { getMarqueeArea } from "../../getMarqueeArea.ts";
import { assertNotNullish, minmax } from "../../lib.ts";
import type { Song } from "../../models/Song.ts";
import type { PointerEventManagerInteractionHandleResolver } from "../../PointerEventManager/PointerEventManager.ts";
import type { PointerEventManagerEvent } from "../../PointerEventManager/PointerEventManagerEvent.ts";
import type { PointerEventManagerInteractionHandle } from "../../PointerEventManager/PointerEventManagerInteractionHandle.ts";
import type { PositionSnapshot } from "../../PointerEventManager/PositionSnapshot.ts";
import { Stateful } from "../../Stateful/Stateful.ts";
import type { SetNoteParameter } from "../../usecases/SetNoteParameter.ts";
import type { Editor, EditorState } from "../Editor.ts";
import type { ParameterSample } from "./ParameterEditorSampleDelegate.ts";
import { SIDEBAR_WIDTH, widthPerTick } from "./ParameterEditorViewRenderer.ts";

export interface ParameterEditorState {
	/**
	 * 高さ [px]
	 */
	readonly height: number;

	/**
	 * 現在のカーソル状態
	 */
	readonly cursor: string;
}

export class ParameterEditor
	extends Stateful<ParameterEditorState>
	implements PointerEventManagerInteractionHandleResolver
{
	/**
	 * ノートおよび選択範囲に対する当たり判定のマージン[px]
	 */
	static readonly HIT_TEST_MARGIN_PIXEL = 8;

	constructor(
		private readonly songStore: Stateful<Song>,
		private readonly editor: Editor,
	) {
		super({ height: 0, cursor: "default" });
	}

	setHeight(height: number) {
		this.updateState((state) => {
			if (state.height === height) return state;
			return { ...state, height };
		});
	}

	// region CanvasUIControllerDelegate

	resolveHandle(
		canvasPosition: PositionSnapshot,
	): PointerEventManagerInteractionHandle | null {
		if (canvasPosition.x < SIDEBAR_WIDTH) {
			return null;
		}

		const position = toParameterEditorPosition(
			canvasPosition,
			this.editor.state,
			this.state,
		);

		const delegate = this.editor.getParameterSampleDelegate();
		const samples = [...delegate.getAllSamples()];
		const selectedSamples = [...delegate.getSelectedSamples()];
		const selectedSampleIds = new Set<number>(
			selectedSamples.map((sample) => sample.id),
		);

		const activeChannelId = this.editor.state.activeChannelId;
		if (activeChannelId === null) return this.backgroundHandle;

		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel !== null) {
			// 1. 選択中のノート
			for (const sample of samples) {
				if (!selectedSampleIds.has(sample.id)) continue;
				const x = sample.tick * widthPerTick(this.editor.state.zoom);

				if (
					x - ParameterEditor.HIT_TEST_MARGIN_PIXEL <= position.x &&
					position.x < x + ParameterEditor.HIT_TEST_MARGIN_PIXEL
				) {
					return this.selectionHandle;
				}
			}

			// 2. その他のサンプル
			for (const sample of samples) {
				if (selectedSampleIds.has(sample.id)) continue;
				const x = sample.tick * widthPerTick(this.editor.state.zoom);

				if (
					x - ParameterEditor.HIT_TEST_MARGIN_PIXEL <= position.x &&
					position.x < x + ParameterEditor.HIT_TEST_MARGIN_PIXEL
				) {
					return this.createSampleHandle(sample);
				}
			}
		}

		// 2. 背景
		return this.backgroundHandle;
	}

	// endregion

	// region Pointer Interaction Handles

	private readonly selectionHandle: PointerEventManagerInteractionHandle = {
		// cursor: "ns-resize",
		handlePointerDown: (ev) => {
			const channelId = this.editor.state.activeChannelId;
			if (channelId === null) return;

			const selectedNoteIds = [...this.editor.state.selectedNoteIds];

			ev.addDragStartSessionListener((ev: PointerEventManagerEvent) => {
				const position = toParameterEditorPosition(
					ev.position,
					this.editor.state,
					this.state,
				);
				this.editor
					.getParameterSampleDelegate()
					.update(selectedNoteIds, position.value);
			});
			ev.addDragMoveSessionListener((ev: PointerEventManagerEvent) => {
				const position = toParameterEditorPosition(
					ev.position,
					this.editor.state,
					this.state,
				);
				this.editor
					.getParameterSampleDelegate()
					.update(selectedNoteIds, position.value);
			});
			ev.addDragEndSessionListener((ev: PointerEventManagerEvent) => {
				const position = toParameterEditorPosition(
					ev.position,
					this.editor.state,
					this.state,
				);
				this.editor
					.getParameterSampleDelegate()
					.update(selectedNoteIds, position.value);
			});
		},
	};

	private readonly backgroundHandle: PointerEventManagerInteractionHandle = {
		// cursor: "default",
		handlePointerDown: (ev: PointerEventManagerEvent) => {
			if (ev.button === MouseEventButton.PRIMARY) {
				if (!ev.metaKey) {
					this.editor.clearSelectedNotes();
				}
			}

			const selectedNoteIds = this.editor.state.selectedNoteIds;
			ev.addDragStartSessionListener((ev) => {
				const position = toParameterEditorPosition(
					ev.position,
					this.editor.state,
					this.state,
				);
				this.editor.startMarqueeSelection({ tick: position.tick, key: 0 });
			});
			ev.addDragMoveSessionListener((ev) => {
				const position = toParameterEditorPosition(
					ev.position,
					this.editor.state,
					this.state,
				);
				this.editor.setMarqueeAreaTo({ tick: position.tick, key: NUM_KEYS });
				const marqueeArea = getMarqueeArea(
					this.editor.state.marqueeAreaFrom,
					this.editor.state.marqueeAreaTo,
				);

				const noteIdsInArea: number[] = [];
				if (marqueeArea !== null) {
					const channelId = this.editor.state.activeChannelId;
					if (channelId !== null) {
						const channel = this.songStore.state.getChannel(channelId);
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
				this.editor.setAllSelectedNotes([...selectedNoteIds, ...noteIdsInArea]);
			});
			ev.addDragEndSessionListener(() => {
				this.editor.stopMarqueeSelection();
			});

			ev.addTapSessionListener((ev) => {
				const delegate = this.editor.getParameterSampleDelegate();
				const position = toParameterEditorPosition(
					ev.position,
					this.editor.state,
					this.state,
				);

				delegate.handleTap?.(position);
			});
		},
	};

	private createSampleHandle(
		sample: ParameterSample,
	): PointerEventManagerInteractionHandle {
		return {
			// cursor: "ns-resize",
			handlePointerDown: (ev) => {
				ev.addDragStartSessionListener((ev: PointerEventManagerEvent) => {
					const channelId = this.editor.state.activeChannelId;
					if (channelId === null) return;

					const position = toParameterEditorPosition(
						ev.position,
						this.editor.state,
						this.state,
					);
					this.editor
						.getParameterSampleDelegate()
						.update([sample.id], position.value);
				});
				ev.addDragMoveSessionListener((ev: PointerEventManagerEvent) => {
					const channelId = this.editor.state.activeChannelId;
					if (channelId === null) return;

					const position = toParameterEditorPosition(
						ev.position,
						this.editor.state,
						this.state,
					);
					this.editor
						.getParameterSampleDelegate()
						.update([sample.id], position.value);
				});
				ev.addDragEndSessionListener((ev: PointerEventManagerEvent) => {
					const channelId = this.editor.state.activeChannelId;
					if (channelId === null) return;

					const position = toParameterEditorPosition(
						ev.position,
						this.editor.state,
						this.state,
					);
					this.editor
						.getParameterSampleDelegate()
						.update([sample.id], position.value);
				});
			},
		};
	}

	// endregion
}

function toParameterEditorPosition(
	position: PositionSnapshot,
	editorState: EditorState,
	parameterEditorState: ParameterEditorState,
): ParameterEditorPosition {
	const x = position.x + editorState.scrollLeft - SIDEBAR_WIDTH;
	const y = position.y;
	const tick = Math.floor(x / widthPerTick(editorState.zoom));
	const value = minmax(0, 1, 1 - y / parameterEditorState.height) * 127;

	return { x, y, tick, value };
}

interface ParameterEditorPosition {
	readonly tick: number;
	readonly value: number;
	readonly x: number;
	readonly y: number;
}
