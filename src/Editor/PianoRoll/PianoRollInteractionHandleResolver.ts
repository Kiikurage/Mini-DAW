import { computeSelectionArea } from "../../computeSelectionArea.tsx";
import { MouseEventButton } from "../../constants.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { minmax, quantize } from "../../lib.ts";
import { Note } from "../../models/Note.ts";
import type { Player } from "../../Player/Player.ts";
import {
	composeInteractionHandle,
	type PointerEventManagerInteractionHandle,
} from "../../PointerEventManager/PointerEventManagerInteractionHandle.ts";
import type { PointerEventManagerInteractionHandleResolver } from "../../PointerEventManager/PointerEventManagerInteractionHandleResolver.ts";
import type { PositionSnapshot } from "../../PointerEventManager/PositionSnapshot.ts";
import type { SongStore } from "../../SongStore.ts";
import type { Synthesizer } from "../../Synthesizer.ts";
import type { RemoveNotes } from "../../usecases/RemoveNotes.ts";
import type { SetNotes } from "../../usecases/SetNotes.ts";
import { type Editor, getSelectedNoteIds } from "../Editor.ts";
import { widthPerTick } from "../ParameterEditor/ParameterEditorViewRenderer.ts";
import {
	moveNotesFeature,
	type PianoRollPosition,
	removeNotesByDoubleClickFeature,
	resizeNoteEndFeature,
	resizeNoteStartFeature,
	setCursorFeature,
	toggleNoteSelectionFeature,
	toPianoRollPosition,
} from "./features.ts";
import type { PianoRoll } from "./PianoRoll.ts";
import { PianoRollPreviewManager } from "./PianoRollPreviewManager.ts";
import {
	HEIGHT_PER_KEY,
	SIDEBAR_WIDTH,
	TIMELINE_HEIGHT,
} from "./PianoRollViewRenderer.ts";

export class PianoRollInteractionHandleResolver
	implements PointerEventManagerInteractionHandleResolver
{
	/**
	 * ノートおよび選択範囲に対する当たり判定のマージン [px]
	 */
	private static readonly HIT_TEST_MARGIN_PIXEL = 8;

	/**
	 * ノートプレビューのデフォルト継続時間 [ms]
	 */
	private static readonly NOTE_PREVIEW_DURATION_IN_MS = 200;

	private readonly updatePointerPositionsFeature: PointerEventManagerInteractionHandle =
		{
			handlePointerMove: (ev) => {
				this.pianoRoll.hoverNotesManager.setPointerPositions(
					ev.manager.getPointerPositions(),
				);
			},
		};

	private readonly backgroundHandle: PointerEventManagerInteractionHandle;
	private readonly timelineHandle: PointerEventManagerInteractionHandle;
	private readonly selectionAreaStartHandle: PointerEventManagerInteractionHandle;
	private readonly selectionAreaBodyHandle: PointerEventManagerInteractionHandle;
	private readonly selectionAreaEndHandle: PointerEventManagerInteractionHandle;
	private readonly previewManager: PianoRollPreviewManager;

	constructor(
		synthesizer: Synthesizer,
		private readonly pianoRoll: PianoRoll,
		private readonly songStore: SongStore,
		private readonly setNotes: SetNotes,
		private readonly removeNotes: RemoveNotes,
		private readonly player: Player,
		private readonly editor: Editor,
	) {
		this.previewManager = new PianoRollPreviewManager(
			this.songStore,
			this.editor,
			synthesizer,
		);

		this.backgroundHandle = composeInteractionHandle(
			this.updatePointerPositionsFeature,
			setCursorFeature({
				cursor: "default",
				pianoRoll: this.pianoRoll,
			}),
			{
				handlePointerDown: (ev) => {
					const flagMultipleNotesSelectedAtStart =
						getSelectedNoteIds(this.editor.state).size >= 2;

					if (ev.button === MouseEventButton.PRIMARY) {
						if (!ev.metaKey) {
							this.editor.clearSelection();
						}
					}

					const selectedNoteIds = getSelectedNoteIds(this.editor.state);
					ev.sessionEvents.on("dragStart", (ev) => {
						this.editor.startMarqueeSelection(
							toPianoRollPosition(
								ev.position,
								this.editor.state,
								this.pianoRoll.state,
							),
						);
					});
					ev.sessionEvents.on("dragMove", (ev) => {
						this.editor.setMarqueeAreaTo(
							toPianoRollPosition(
								ev.position,
								this.editor.state,
								this.pianoRoll.state,
							),
						);
						this.editor.setSelectedNotes([
							...selectedNoteIds,
							...this.editor.findNotesInMarqueeArea().map((note) => note.id),
						]);
					});
					ev.sessionEvents.on("dragEnd", () => {
						this.editor.stopMarqueeSelection();
					});
					ev.sessionEvents.on("tap", (ev) => {
						if (ev.button === MouseEventButton.PRIMARY) {
							// ノートが複数選択されていたなら選択解除のためのタップとして扱いノート追加はしない
							if (flagMultipleNotesSelectedAtStart) return;
							if (this.editor.state.activeChannelId === null) return;

							const position = toPianoRollPosition(
								ev.position,
								this.editor.state,
								this.pianoRoll.state,
							);

							const tickFrom =
								Math.floor(
									position.tick / this.editor.state.quantizeUnitInTick,
								) * this.editor.state.quantizeUnitInTick;

							const tickDuration = this.pianoRoll.loopKeys.has(position.key)
								? this.editor.state.newNoteDurationInTick
								: 1;

							const note = Note.create({
								id: Date.now(),
								key: position.key,
								tickFrom,
								tickTo: tickFrom + tickDuration,
								velocity: 100,
							});

							this.previewManager.startPreviewNotes(
								[note],
								PianoRollInteractionHandleResolver.NOTE_PREVIEW_DURATION_IN_MS,
							);
							this.setNotes(this.editor.state.activeChannelId, [note]);

							if (ev.metaKey) {
								this.editor.putNotesToSelection([note.id]);
							} else {
								this.editor.setSelectedNotes([note.id]);
							}
						}
					});
				},
			},
		);
		this.timelineHandle = composeInteractionHandle(
			this.updatePointerPositionsFeature,
			setCursorFeature({
				cursor: "default",
				pianoRoll: this.pianoRoll,
			}),
			{
				handlePointerDown: (ev) => {
					this.player.setCurrentTick(
						quantize(
							toPianoRollPosition(
								ev.position,
								this.editor.state,
								this.pianoRoll.state,
							).tick,
							this.editor.state.quantizeUnitInTick,
						),
					);

					ev.sessionEvents.on("dragMove", (ev) => {
						this.player.setCurrentTick(
							quantize(
								toPianoRollPosition(
									ev.position,
									this.editor.state,
									this.pianoRoll.state,
								).tick,
								this.editor.state.quantizeUnitInTick,
							),
						);
					});
				},
			},
		);
		this.selectionAreaStartHandle = composeInteractionHandle(
			this.updatePointerPositionsFeature,
			setCursorFeature({
				cursor: "ew-resize",
				pianoRoll: this.pianoRoll,
			}),
			resizeNoteStartFeature({
				editor: this.editor,
				pianoRoll: this.pianoRoll,
				songStore: this.songStore,
				setNotes: this.setNotes,
				noteIdForNewNoteDuration: null,
			}),
		);
		this.selectionAreaBodyHandle = composeInteractionHandle(
			this.updatePointerPositionsFeature,
			setCursorFeature({
				cursor: "move",
				pianoRoll: this.pianoRoll,
			}),
			moveNotesFeature({
				editor: this.editor,
				songStore: this.songStore,
				setNotes: this.setNotes,
				pianoRoll: this.pianoRoll,
				previewManager: this.previewManager,
			}),
		);
		this.selectionAreaEndHandle = composeInteractionHandle(
			this.updatePointerPositionsFeature,
			setCursorFeature({
				cursor: "ew-resize",
				pianoRoll: this.pianoRoll,
			}),
			resizeNoteEndFeature({
				editor: this.editor,
				pianoRoll: this.pianoRoll,
				songStore: this.songStore,
				setNotes: this.setNotes,
				noteIdForNewNoteDuration: null,
			}),
		);

		player.addChangeListener((state) => {
			if (!state.isAutoScrollEnabled) return;

			const playHeadX = state.currentTick * widthPerTick(editor.state.zoom);
			const scrollLeft = minmax(
				playHeadX - this.editor.state.width / 2,
				playHeadX,
				editor.state.scrollLeft,
			);

			this.editor.setScrollLeft(scrollLeft);
		});
	}

	resolveHandle(
		canvasPosition: PositionSnapshot,
	): PointerEventManagerInteractionHandle | null {
		// 1. タイムライン・サイドバー
		if (canvasPosition.x < SIDEBAR_WIDTH) {
			return null;
		}
		if (canvasPosition.y < TIMELINE_HEIGHT) {
			return this.timelineHandle;
		}

		const position = toPianoRollPosition(
			canvasPosition,
			this.editor.state,
			this.pianoRoll.state,
		);

		const activeChannel = getActiveChannel(
			this.songStore.state.song,
			this.editor.state,
		);
		if (activeChannel !== null) {
			// 2. 選択中のノート
			for (const note of activeChannel.notes.values()) {
				if (!getSelectedNoteIds(this.editor.state).has(note.id)) continue;

				const handle = this.findPointerEventsHandleForNote(position, note);
				if (handle !== null) return handle;
			}

			// 3. 未選択のノート
			for (const note of activeChannel.notes.values()) {
				if (getSelectedNoteIds(this.editor.state).has(note.id)) continue;

				const handle = this.findPointerEventsHandleForNote(position, note);
				if (handle !== null) return handle;
			}
		}

		// 4. 選択範囲
		const handle = this.findPointerEventsHandleForSelectionArea(position);
		if (handle !== null) return handle;

		// 5. 背景
		return this.backgroundHandle;
	}

	private findPointerEventsHandleForNote(
		position: PianoRollPosition,
		note: Note,
	): PointerEventManagerInteractionHandle | null {
		if (this.pianoRoll.loopKeys.has(note.key)) {
			return this.findPointerEventsHandleForLoopNote(position, note);
		} else {
			return this.findPointerEventsHandleForNoLoopNote(position, note);
		}
	}

	private findPointerEventsHandleForLoopNote(
		position: PianoRollPosition,
		note: Note,
	): PointerEventManagerInteractionHandle | null {
		if (note.key !== position.key) return null;

		const xFrom = note.tickFrom * widthPerTick(this.editor.state.zoom);
		const xTo = note.tickTo * widthPerTick(this.editor.state.zoom);

		if (
			position.x <
			xFrom - PianoRollInteractionHandleResolver.HIT_TEST_MARGIN_PIXEL
		)
			return null;

		if (
			position.x <
			xFrom + PianoRollInteractionHandleResolver.HIT_TEST_MARGIN_PIXEL
		) {
			return this.createNoteStartHandle(note);
		}
		if (
			position.x <
			xTo - PianoRollInteractionHandleResolver.HIT_TEST_MARGIN_PIXEL
		) {
			return this.createNoteBodyHandle(note);
		}
		if (
			position.x <
			xTo + PianoRollInteractionHandleResolver.HIT_TEST_MARGIN_PIXEL
		) {
			return this.createNoteEndHandle(note);
		}
		return null;
	}

	private findPointerEventsHandleForNoLoopNote(
		position: PianoRollPosition,
		note: Note,
	): PointerEventManagerInteractionHandle | null {
		if (note.key !== position.key) return null;

		const xFrom = note.tickFrom * widthPerTick(this.editor.state.zoom);

		const minX =
			xFrom -
			HEIGHT_PER_KEY / 2 -
			PianoRollInteractionHandleResolver.HIT_TEST_MARGIN_PIXEL;
		const maxX =
			xFrom +
			HEIGHT_PER_KEY / 2 +
			PianoRollInteractionHandleResolver.HIT_TEST_MARGIN_PIXEL;

		if (minX <= position.x && position.x <= maxX) {
			return this.createNoteBodyHandle(note);
		}

		return null;
	}

	private findPointerEventsHandleForSelectionArea(
		position: PianoRollPosition,
	): PointerEventManagerInteractionHandle | null {
		const selectionArea = computeSelectionArea(
			this.pianoRoll.loopKeys,
			this.songStore.state.song,
			this.editor.state,
		);
		if (selectionArea === null) return null;

		if (
			position.key < selectionArea.keyFrom ||
			position.key >= selectionArea.keyTo
		) {
			return null;
		}

		const xFrom = selectionArea.tickFrom * widthPerTick(this.editor.state.zoom);
		const xTo = selectionArea.tickTo * widthPerTick(this.editor.state.zoom);

		if (
			position.x <
			xFrom - PianoRollInteractionHandleResolver.HIT_TEST_MARGIN_PIXEL
		)
			return null;

		if (
			position.x <
			xFrom + PianoRollInteractionHandleResolver.HIT_TEST_MARGIN_PIXEL
		) {
			return this.selectionAreaStartHandle;
		}

		if (
			position.x <
			xTo - PianoRollInteractionHandleResolver.HIT_TEST_MARGIN_PIXEL
		) {
			return this.selectionAreaBodyHandle;
		}

		if (
			position.x <
			xTo + PianoRollInteractionHandleResolver.HIT_TEST_MARGIN_PIXEL
		) {
			return this.selectionAreaEndHandle;
		}

		return null;
	}

	private createNoteStartHandle(targetNote: Note) {
		return composeInteractionHandle(
			this.updatePointerPositionsFeature,
			setCursorFeature({
				cursor: "ew-resize",
				pianoRoll: this.pianoRoll,
			}),
			toggleNoteSelectionFeature(targetNote, this.editor),
			resizeNoteStartFeature({
				editor: this.editor,
				pianoRoll: this.pianoRoll,
				songStore: this.songStore,
				setNotes: this.setNotes,
				noteIdForNewNoteDuration: targetNote.id,
			}),
			removeNotesByDoubleClickFeature(
				targetNote,
				this.editor,
				this.removeNotes,
			),
		);
	}

	private createNoteBodyHandle(targetNote: Note) {
		return composeInteractionHandle(
			this.updatePointerPositionsFeature,
			setCursorFeature({
				cursor: "move",
				pianoRoll: this.pianoRoll,
			}),
			toggleNoteSelectionFeature(targetNote, this.editor),
			moveNotesFeature({
				editor: this.editor,
				songStore: this.songStore,
				setNotes: this.setNotes,
				pianoRoll: this.pianoRoll,
				previewManager: this.previewManager,
			}),
			removeNotesByDoubleClickFeature(
				targetNote,
				this.editor,
				this.removeNotes,
			),
		);
	}

	private createNoteEndHandle(targetNote: Note) {
		return composeInteractionHandle(
			this.updatePointerPositionsFeature,
			setCursorFeature({
				cursor: "ew-resize",
				pianoRoll: this.pianoRoll,
			}),
			toggleNoteSelectionFeature(targetNote, this.editor),
			resizeNoteEndFeature({
				editor: this.editor,
				pianoRoll: this.pianoRoll,
				songStore: this.songStore,
				setNotes: this.setNotes,
				noteIdForNewNoteDuration: targetNote.id,
			}),
			removeNotesByDoubleClickFeature(
				targetNote,
				this.editor,
				this.removeNotes,
			),
		);
	}
}
