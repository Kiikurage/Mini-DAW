import type { PointerEventManagerDelegate } from "../../CanvasUIController/PointerEventManager.ts";
import type { PointerEventManagerEvent } from "../../CanvasUIController/PointerEventManagerEvent.ts";
import type { PointerEventManagerInteractionHandle } from "../../CanvasUIController/PointerEventManagerInteractionHandle.ts";
import type { PositionSnapshot } from "../../CanvasUIController/PositionSnapshot.ts";
import { MouseEventButton, NUM_KEYS } from "../../constants.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { getMarqueeArea } from "../../getMarqueeArea.ts";
import { assertNotNullish, minmax } from "../../lib.ts";
import type { Note } from "../../models/Note.ts";
import type { Song } from "../../models/Song.ts";
import { Stateful } from "../../Stateful/Stateful.ts";
import type { SetNoteParameter } from "../../usecases/SetNoteParameter.ts";
import type { Editor } from "../Editor.ts";
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
	implements PointerEventManagerDelegate
{
	/**
	 * ノートおよび選択範囲に対する当たり判定のマージン[px]
	 */
	static readonly HIT_TEST_MARGIN_PIXEL = 8;

	constructor(
		private readonly setNoteParameter: SetNoteParameter,
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

	findHandle(
		canvasPosition: PositionSnapshot,
	): PointerEventManagerInteractionHandle | null {
		if (canvasPosition.x < SIDEBAR_WIDTH) {
			return null;
		}

		const position = toParameterEditorPosition(canvasPosition);

		const selectedNoteIds = this.editor.state.selectedNoteIds;

		const activeChannelId = this.editor.state.activeChannelId;
		if (activeChannelId === null) return this.backgroundHandle;

		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel !== null) {
			// 1. 選択中のノート
			for (const note of activeChannel.notes.values()) {
				if (!selectedNoteIds.has(note.id)) continue;
				const x = note.tickFrom * widthPerTick(this.editor.state.zoom);

				if (
					x - ParameterEditor.HIT_TEST_MARGIN_PIXEL <= position.x &&
					position.x < x + ParameterEditor.HIT_TEST_MARGIN_PIXEL
				) {
					return this.selectionHandle;
				}
			}

			// 2. その他のノート
			for (const note of activeChannel.notes.values()) {
				if (selectedNoteIds.has(note.id)) continue;
				const x = note.tickFrom * widthPerTick(this.editor.state.zoom);

				if (
					x - ParameterEditor.HIT_TEST_MARGIN_PIXEL <= position.x &&
					position.x < x + ParameterEditor.HIT_TEST_MARGIN_PIXEL
				) {
					return this.createNoteHandle(note);
				}
			}
		}

		// 2. 背景
		return this.backgroundHandle;
	}

	setCursor(cursor: string) {
		this.updateState((state) => {
			if (state.cursor === cursor) return state;
			return { ...state, cursor };
		});
	}

	getSize(): { width: number; height: number } {
		return {
			width: this.editor.state.width,
			height: this.state.height,
		};
	}

	getScrollPosition(): { scrollLeft: number; scrollTop: number } {
		return {
			scrollLeft: this.editor.state.scrollLeft,
			scrollTop: 0,
		};
	}

	getZoomLevel(): number {
		return this.editor.state.zoom;
	}

	// endregion

	// region Pointer Interaction Handles

	private readonly selectionHandle: PointerEventManagerInteractionHandle = {
		cursor: "ns-resize",
		handlePointerDown: (ev) => {
			const channelId = this.editor.state.activeChannelId;
			if (channelId === null) return;

			const selectedNoteIds = [...this.editor.state.selectedNoteIds];

			ev.addDragStartSessionListener((ev: PointerEventManagerEvent) => {
				const value = minmax(0, 1, 1 - ev.position.y / this.state.height);
				const velocity = Math.floor(value * 127);
				this.setNoteParameter(channelId, selectedNoteIds, "velocity", velocity);
			});
			ev.addDragMoveSessionListener((ev: PointerEventManagerEvent) => {
				const value = minmax(0, 1, 1 - ev.position.y / this.state.height);
				const velocity = Math.floor(value * 127);
				this.setNoteParameter(channelId, selectedNoteIds, "velocity", velocity);
			});
			ev.addDragEndSessionListener((ev: PointerEventManagerEvent) => {
				const value = minmax(0, 1, 1 - ev.position.y / this.state.height);
				const velocity = Math.floor(value * 127);
				this.setNoteParameter(channelId, selectedNoteIds, "velocity", velocity);
			});
		},
	};

	private readonly backgroundHandle: PointerEventManagerInteractionHandle = {
		cursor: "default",
		handlePointerDown: (ev: PointerEventManagerEvent) => {
			if (ev.button === MouseEventButton.PRIMARY) {
				if (!ev.metaKey) {
					this.editor.unselectAllNotes();
				}
			}

			const selectedNoteIds = this.editor.state.selectedNoteIds;
			ev.addDragStartSessionListener((ev) => {
				const position = toParameterEditorPosition(ev.position);
				this.editor.startMarqueeSelection({
					tick: position.tick,
					key: 0,
				});
			});
			ev.addDragMoveSessionListener((ev) => {
				const position = toParameterEditorPosition(ev.position);
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
				this.editor.setSelectedNotes([...selectedNoteIds, ...noteIdsInArea]);
			});
			ev.addDragEndSessionListener(() => {
				this.editor.stopMarqueeSelection();
			});
		},
	};

	private createNoteHandle(note: Note): PointerEventManagerInteractionHandle {
		return {
			cursor: "ns-resize",
			handlePointerDown: (ev) => {
				const channelId = this.editor.state.activeChannelId;
				if (channelId === null) return;

				ev.addDragStartSessionListener((ev: PointerEventManagerEvent) => {
					const position = toParameterEditorPosition(ev.position);
					this.setNoteParameter(
						channelId,
						[note.id],
						"velocity",
						position.value * 127,
					);
				});
				ev.addDragMoveSessionListener((ev: PointerEventManagerEvent) => {
					const position = toParameterEditorPosition(ev.position);
					this.setNoteParameter(
						channelId,
						[note.id],
						"velocity",
						position.value * 127,
					);
				});
				ev.addDragEndSessionListener((ev: PointerEventManagerEvent) => {
					const position = toParameterEditorPosition(ev.position);
					this.setNoteParameter(
						channelId,
						[note.id],
						"velocity",
						position.value * 127,
					);
				});
			},
		};
	}

	// endregion
}

function toParameterEditorPosition(
	position: PositionSnapshot,
): ParameterEditorPosition {
	const x = position.x + position.scrollLeft - SIDEBAR_WIDTH;
	const y = position.y;
	const tick = Math.floor(x / widthPerTick(position.zoom));
	const value = minmax(0, 1, 1 - y / position.height);

	return { x, y, tick, value };
}

interface ParameterEditorPosition {
	readonly tick: number;
	readonly value: number;
	readonly x: number;
	readonly y: number;
}
