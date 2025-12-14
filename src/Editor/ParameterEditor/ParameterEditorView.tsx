import { useEffect, useRef } from "react";
import { PointerEventManager, type PointerEventManagerDelegate, } from "../../CanvasUIController/PointerEventManager.ts";
import type { PointerEventManagerEvent } from "../../CanvasUIController/PointerEventManagerEvent.ts";
import type { PointerEventManagerInteractionHandle } from "../../CanvasUIController/PointerEventManagerInteractionHandle.ts";
import type { PositionSnapshot } from "../../CanvasUIController/PositionSnapshot.ts";
import { MouseEventButton } from "../../constants.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { addListener, assertNotNullish, minmax } from "../../lib.ts";
import type { Note } from "../../models/Note.ts";
import type { Song } from "../../models/Song.ts";
import type { Player } from "../../Player/Player.ts";
import { ResizeObserverWrapper } from "../../react/useResizeObserver.ts";
import type { SongStore } from "../../SongStore.ts";
import type { Stateful } from "../../Stateful/Stateful.ts";
import type { Editor } from "../Editor.ts";
import { widthPerTick } from "../PianoRoll/PianoRollViewRenderer.ts";
import { ParameterEditor } from "./ParameterEditor.ts";
import { renderCanvas, SIDEBAR_WIDTH } from "./ParameterEditorRenderer.ts";

export function ParameterEditorView({
	parameterEditor,
	songStore,
	player,
	editor,
}: {
	parameterEditor: ParameterEditor;
	songStore: SongStore;
	player: Player;
	editor: Editor;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas === null) return;

		const pointerEventManager = new PointerEventManager(
			new Delegate(parameterEditor, songStore, editor),
		);

		const render = () => {
			renderCanvas({
				canvas,
				parameterEditorState: parameterEditor.state,
				song: songStore.state,
				playerState: player.state,
				editorState: editor.state,
			});
		};

		const disposables = [
			parameterEditor.addChangeListener((state) => {
				canvas.style.cursor = state.cursor;
			}),
			parameterEditor.addChangeListener(render),
			songStore.addChangeListener(render),
			player.addChangeListener(render),
			editor.addChangeListener(render),
			ResizeObserverWrapper.getInstance().observe(canvas, (entry) => {
				parameterEditor.setHeight(entry.contentRect.height);
			}),
			addListener(canvas, "wheel", (ev) => {
				editor.setScrollLeft(editor.state.scrollLeft + ev.deltaX);
			}),
			addListener(canvas, "pointerdown", pointerEventManager.handlePointerDown),
			addListener(canvas, "pointermove", pointerEventManager.handlePointerMove),
			addListener(canvas, "pointerup", pointerEventManager.handlePointerUp),
			addListener(canvas, "dblclick", pointerEventManager.handleDoubleClick),
		];

		render();

		return () => {
			for (const disposable of disposables) {
				disposable();
			}
		};
	}, [editor, parameterEditor, player, songStore]);

	return (
		<canvas
			ref={canvasRef}
			css={{
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				background: "var(--color-key-background)",
			}}
		/>
	);
}

class Delegate implements PointerEventManagerDelegate {
	constructor(
		private readonly parameterEditor: ParameterEditor,
		private readonly songStore: Stateful<Song>,
		private readonly editor: Editor,
	) {}

	// region CanvasUIControllerDelegate

	findHandle(
		canvasPosition: PositionSnapshot,
	): PointerEventManagerInteractionHandle | null {
		const area = detectArea(canvasPosition);
		if (area === "sidebar") return null;

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
		this.parameterEditor.setCursor(cursor);
	}

	getSize(): { width: number; height: number } {
		return {
			width: this.editor.state.width,
			height: this.parameterEditor.state.height,
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
				const value = minmax(
					0,
					1,
					1 - ev.position.y / this.parameterEditor.state.height,
				);
				const velocity = Math.floor(value * 127);
				this.parameterEditor.handleSetNoteParameter(
					channelId,
					selectedNoteIds,
					"velocity",
					velocity,
				);
			});
			ev.addDragMoveSessionListener((ev: PointerEventManagerEvent) => {
				const value = minmax(
					0,
					1,
					1 - ev.position.y / this.parameterEditor.state.height,
				);
				const velocity = Math.floor(value * 127);
				this.parameterEditor.handleSetNoteParameter(
					channelId,
					selectedNoteIds,
					"velocity",
					velocity,
				);
			});
			ev.addDragEndSessionListener((ev: PointerEventManagerEvent) => {
				const value = minmax(
					0,
					1,
					1 - ev.position.y / this.parameterEditor.state.height,
				);
				const velocity = Math.floor(value * 127);
				this.parameterEditor.handleSetNoteParameter(
					channelId,
					selectedNoteIds,
					"velocity",
					velocity,
				);
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
				this.parameterEditor.setMarqueeAreaFrom(position.tick);
			});
			ev.addDragMoveSessionListener((ev) => {
				const position = toParameterEditorPosition(ev.position);
				this.parameterEditor.setMarqueeAreaTo(position.tick);
				const marqueeArea = this.parameterEditor.state.marqueeArea;

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
				this.parameterEditor.clearMarqueeArea();
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
					this.parameterEditor.handleSetNoteParameter(
						channelId,
						[note.id],
						"velocity",
						position.value * 127,
					);
				});
				ev.addDragMoveSessionListener((ev: PointerEventManagerEvent) => {
					const position = toParameterEditorPosition(ev.position);
					this.parameterEditor.handleSetNoteParameter(
						channelId,
						[note.id],
						"velocity",
						position.value * 127,
					);
				});
				ev.addDragEndSessionListener((ev: PointerEventManagerEvent) => {
					const position = toParameterEditorPosition(ev.position);
					this.parameterEditor.handleSetNoteParameter(
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

/**
 * キャンバス上の座標を、ParameterEditor上の座標に変換する
 * @param position
 */
function toParameterEditorPosition(
	position: PositionSnapshot,
): ParameterEditorPosition {
	const x = position.x + position.scrollLeft - SIDEBAR_WIDTH;
	const y = position.y;
	const tick = Math.floor(x / widthPerTick(position.zoom));
	const value = minmax(0, 1, 1 - y / position.height);

	return { x, y, tick, value };
}

function detectArea(position: PositionSnapshot): "sidebar" | "main" {
	if (position.x < SIDEBAR_WIDTH) return "sidebar";
	return "main";
}

interface ParameterEditorPosition {
	readonly tick: number;
	readonly value: number;
	readonly x: number;
	readonly y: number;
}
