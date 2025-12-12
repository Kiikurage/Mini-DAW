import { CanvasUIController, type CanvasUIControllerDelegate, } from "../../CanvasUIController/CanvasUIController.ts";
import type { CanvasUIPointerEvent } from "../../CanvasUIController/CanvasUIPointerEvent.ts";
import type { CanvasUIPointerInteractionHandle } from "../../CanvasUIController/CanvasUIPointerInteractionHandle.ts";
import type { CanvasUIPosition } from "../../CanvasUIController/CanvasUIPosition.ts";
import { MouseEventButton } from "../../constants.ts";
import { ComponentKey } from "../../Dependency/DIContainer.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { assertNotNullish, minmax } from "../../lib.ts";
import type { Note } from "../../models/Note.ts";
import type { Song } from "../../models/Song.ts";
import { Stateful } from "../../Stateful/Stateful.ts";
import type { SetNoteParameter } from "../../usecases/SetNoteParameter.ts";
import type { Editor } from "../Editor.ts";
import { SIDEBAR_WIDTH, widthPerTick, } from "../PianoRoll/PianoRollViewRenderer.ts";
import { ParameterEditorState } from "./ParameterEditorState.ts";

export class ParameterEditor
	extends Stateful<ParameterEditorState>
	implements CanvasUIControllerDelegate
{
	static readonly Key = ComponentKey.of(ParameterEditor);

	/**
	 * trueの間、ホバーノートIDの自動更新無効化、カーソル種類の固定などの効果がある
	 * @private
	 */
	private isHoverNoteIdsLocked = false;

	/**
	 * ノートおよび選択範囲に対する当たり判定のマージン（ピクセル単位）
	 */
	private static readonly HIT_TEST_MARGIN_PIXEL = 8;

	private readonly canvasUIController = new CanvasUIController(this);

	constructor(
		private readonly songStore: Stateful<Song>,
		private readonly setNoteParameter: SetNoteParameter,
		private readonly editor: Editor,
	) {
		super(new ParameterEditorState());
	}

	// region Pointer Event Handlers

	readonly handlePointerDown = (ev: PointerEvent) =>
		this.canvasUIController.handlePointerDown(ev);

	readonly handlePointerMove = (ev: PointerEvent) =>
		this.canvasUIController.handlePointerMove(ev);

	readonly handlePointerUp = (ev: PointerEvent) =>
		this.canvasUIController.handlePointerUp(ev);

	readonly handleDoubleClick = (ev: MouseEvent) =>
		this.canvasUIController.handleDoubleClick(ev);

	// endregion

	// region CanvasUIControllerDelegate

	/**
	 * 座標から、ドラッグハンドルを探す。ハンドルが複数重なっている場合には優先すべきハンドルを解決して返す。
	 * @private
	 */
	findHandle(
		canvasPosition: CanvasUIPosition,
	): CanvasUIPointerInteractionHandle | null {
		const area = detectArea(canvasPosition);
		if (area === "sidebar") return null;

		const position = this.toParameterEditorPosition(canvasPosition);

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
		if (this.isHoverNoteIdsLocked) return;

		this.updateState((state) => state.setCursor(cursor));
	}

	setScrollPosition(scrollLeft: number): void {
		this.editor.setScrollLeft(scrollLeft);
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

	onPointerMove?(): void {
		// throw new Error("Method not implemented.");
	}

	// endregion

	setSize(width: number, height: number) {
		this.updateState((state) => state.setSize(width, height));
	}

	// region Pointer Interaction Handles

	private readonly selectionHandle: CanvasUIPointerInteractionHandle = {
		cursor: "ns-resize",
		handlePointerDown: (ev) => {
			const channelId = this.editor.state.activeChannelId;
			if (channelId === null) return;

			const selectedNoteIds = [...this.editor.state.selectedNoteIds];

			ev.addDragStartSessionListener((ev: CanvasUIPointerEvent) => {
				const value = minmax(0, 1, 1 - ev.position.y / this.state.height);
				const velocity = Math.floor(value * 127);
				this.setNoteParameter(channelId, selectedNoteIds, "velocity", velocity);
			});
			ev.addDragMoveSessionListener((ev: CanvasUIPointerEvent) => {
				const value = minmax(0, 1, 1 - ev.position.y / this.state.height);
				const velocity = Math.floor(value * 127);
				this.setNoteParameter(channelId, selectedNoteIds, "velocity", velocity);
			});
			ev.addDragEndSessionListener((ev: CanvasUIPointerEvent) => {
				const value = minmax(0, 1, 1 - ev.position.y / this.state.height);
				const velocity = Math.floor(value * 127);
				this.setNoteParameter(channelId, selectedNoteIds, "velocity", velocity);
			});
		},
	};

	private readonly backgroundHandle: CanvasUIPointerInteractionHandle = {
		cursor: "default",
		handlePointerDown: (ev: CanvasUIPointerEvent) => {
			if (ev.button === MouseEventButton.PRIMARY) {
				if (!ev.metaKey) {
					this.editor.unselectAllNotes();
				}
			}

			const selectedNoteIds = this.editor.state.selectedNoteIds;
			ev.addDragStartSessionListener((ev) => {
				const position = this.toParameterEditorPosition(ev.position);
				this.updateState((state) => state.setMarqueeAreaFrom(position.tick));
			});
			ev.addDragMoveSessionListener((ev) => {
				this.updateState((state) => {
					const position = this.toParameterEditorPosition(ev.position);
					state = state.setMarqueeAreaTo(position.tick);

					const noteIdsInArea: number[] = [];
					const area = state.marqueeArea;
					if (area !== null) {
						const channelId = this.editor.state.activeChannelId;
						if (channelId !== null) {
							const channel = this.songStore.state.getChannel(channelId);
							assertNotNullish(channel);

							for (const note of channel.notes.values()) {
								if (
									note.tickFrom < area.tickTo &&
									note.tickTo > area.tickFrom
								) {
									noteIdsInArea.push(note.id);
								}
							}
						}
					}

					this.editor.setSelectedNotes([...selectedNoteIds, ...noteIdsInArea]);

					return state;
				});
			});
			ev.addDragEndSessionListener(() => {
				this.updateState((state) => state.clearMarqueeArea());
			});
		},
	};

	private createNoteHandle(note: Note): CanvasUIPointerInteractionHandle {
		return {
			cursor: "ns-resize",
			handlePointerDown: (ev) => {
				const channelId = this.editor.state.activeChannelId;
				if (channelId === null) return;

				ev.addDragStartSessionListener((ev: CanvasUIPointerEvent) => {
					const position = this.toParameterEditorPosition(ev.position);
					this.setNoteParameter(
						channelId,
						[note.id],
						"velocity",
						position.value * 127,
					);
				});
				ev.addDragMoveSessionListener((ev: CanvasUIPointerEvent) => {
					const position = this.toParameterEditorPosition(ev.position);
					this.setNoteParameter(
						channelId,
						[note.id],
						"velocity",
						position.value * 127,
					);
				});
				ev.addDragEndSessionListener((ev: CanvasUIPointerEvent) => {
					const position = this.toParameterEditorPosition(ev.position);
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

	toParameterEditorPosition(
		position: CanvasUIPosition,
	): ParameterEditorPosition {
		const x = position.x + position.scrollLeft - SIDEBAR_WIDTH;
		const y = position.y;
		const tick = Math.floor(x / widthPerTick(position.zoom));
		const value = minmax(0, 1, 1 - y / this.state.height);

		return { x, y, tick, value };
	}
}

function detectArea(position: CanvasUIPosition): "sidebar" | "main" {
	if (position.x < SIDEBAR_WIDTH) return "sidebar";
	return "main";
}
interface ParameterEditorPosition {
	readonly tick: number;
	readonly value: number;
	readonly x: number;
	readonly y: number;
}
