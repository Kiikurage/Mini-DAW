import type {
	PointerEventManager,
	PointerEventManagerDelegate,
} from "../../CanvasUIController/PointerEventManager.ts";
import type { PointerEventManagerEvent } from "../../CanvasUIController/PointerEventManagerEvent.ts";
import type { PointerEventManagerInteractionHandle } from "../../CanvasUIController/PointerEventManagerInteractionHandle.ts";
import type { PositionSnapshot } from "../../CanvasUIController/PositionSnapshot.ts";
import { computeSelectionArea } from "../../computeSelectionArea.tsx";
import { MouseEventButton, NUM_KEYS } from "../../constants.ts";
import { ComponentKey } from "../../Dependency/DIContainer.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { getSelectedNotes } from "../../getSelectedNotes.ts";
import type { InstrumentStoreState } from "../../InstrumentStore.ts";
import { isNotNullish, minmax, quantize } from "../../lib.ts";
import { Note } from "../../models/Note.ts";
import type { Song } from "../../models/Song.ts";
import type { Player } from "../../Player/Player.ts";
import { Stateful } from "../../Stateful/Stateful.ts";
import type { DeleteNotes } from "../../usecases/DeleteNotes.ts";
import type { SetNotes } from "../../usecases/SetNotes.ts";
import type { Editor } from "../Editor.ts";
import { widthPerTick } from "../ParameterEditor/ParameterEditorViewRenderer.ts";
import {
	HEIGHT_PER_KEY,
	SIDEBAR_WIDTH,
	TIMELINE_HEIGHT,
} from "./PianoRollViewRenderer.ts";

export interface PianoRollState {
	/**
	 * 高さ [px]
	 */
	readonly height: number;

	/**
	 * スクロール位置(垂直) [px]
	 */
	readonly scrollTop: number;

	/**
	 * 現在のカーソル状態
	 */
	readonly cursor: string;

	/**
	 * ポインタがホバーしているノートのID
	 */
	readonly hoveredNoteIds: ReadonlySet<number>;
}

export class PianoRoll
	extends Stateful<PianoRollState>
	implements PointerEventManagerDelegate
{
	static readonly Key = ComponentKey.of(PianoRoll);

	/**
	 * ノートおよび選択範囲に対する当たり判定のマージン [px]
	 */
	static readonly HIT_TEST_MARGIN_PIXEL = 8;

	/**
	 * ノートプレビューのデフォルト継続時間 [ms]
	 */
	static readonly NOTE_PREVIEW_DURATION_IN_MS = 200;

	/**
	 * 現在のポインタ位置
	 */
	private pointerPositions: readonly PositionSnapshot[] = [];

	/**
	 * trueの間、ホバーノートIDの自動更新無効化、カーソル種類の固定などの効果がある
	 */
	private isHoverNoteIdsLocked = false;

	/**
	 * 現在プレビュー中のノート
	 */
	private readonly currentPreviewingNotes = new Set<Note>();

	constructor(
		private readonly instrumentStore: Stateful<InstrumentStoreState>,
		private readonly songStore: Stateful<Song>,
		private readonly setNotes: SetNotes,
		private readonly deleteNotesUseCase: DeleteNotes,
		private readonly player: Player,
		private readonly editor: Editor,
	) {
		super({
			hoveredNoteIds: new Set(),
			cursor: "default",
			height: 0,
			scrollTop: 0,
		});

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

	startPreviewNotes(notes: Iterable<Note>, durationInMS = -1) {
		this.stopPreviewNotes();

		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel === null) return;

		const instrument = this.instrumentStore.state.get(
			activeChannel.instrumentKey,
		);
		if (instrument?.status !== "fulfilled") return;

		const minTickFrom = Math.min(...[...notes].map((note) => note.tickFrom));
		for (const note of notes) {
			if (note.tickFrom !== minTickFrom) continue;

			instrument.value.noteOn({ key: note.key, velocity: note.velocity });
			this.currentPreviewingNotes.add(note);
		}

		if (durationInMS > 0) {
			setTimeout(() => {
				this.stopPreviewNotes();
			}, durationInMS);
		}
	}

	stopPreviewNotes() {
		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel === null) return;

		const instrument = this.instrumentStore.state.get(
			activeChannel.instrumentKey,
		);
		if (instrument?.status !== "fulfilled") return;

		for (const note of this.currentPreviewingNotes) {
			instrument.value.noteOff({ key: note.key });
		}
		this.currentPreviewingNotes.clear();
	}

	setHeight(height: number) {
		this.updateState((state) => {
			if (state.height === height) return state;
			return { ...state, height };
		});
	}

	setScrollTop(scrollTop: number) {
		this.updateState((state) => {
			// DOM APIはスクロール位置として常に整数を返すため、小数点以下の比較を省かないと、更新が無限に発生する
			const oldValue = Math.round(state.scrollTop);
			const newValue = Math.round(
				minmax(
					0,
					NUM_KEYS * HEIGHT_PER_KEY - (state.height - TIMELINE_HEIGHT),
					scrollTop,
				),
			);

			if (oldValue === newValue) return state;

			return { ...state, scrollTop: newValue };
		});
	}

	setHoveredNoteIds(noteIds: ReadonlySet<number>) {
		this.updateState((state) => {
			if (state.hoveredNoteIds === noteIds) return state;
			return { ...state, hoveredNoteIds: noteIds };
		});
	}

	private findNoteByPosition(canvasPosition: PositionSnapshot): Note | null {
		const position = toPianoRollPosition(canvasPosition);
		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel === null) return null;

		for (const note of activeChannel.notes.values()) {
			if (this.noLoopKeys.has(note.key)) {
				const xFrom = note.tickFrom * widthPerTick(this.editor.state.zoom);
				const minX = xFrom - HEIGHT_PER_KEY / 2;
				const maxX = xFrom + HEIGHT_PER_KEY / 2;
				if (
					note.key === position.key &&
					minX <= position.x &&
					position.x < maxX
				) {
					return note;
				}
			} else {
				if (
					note.key === position.key &&
					note.tickFrom <= position.tick &&
					position.tick < note.tickTo
				) {
					return note;
				}
			}
		}
		return null;
	}

	private get noLoopKeys(): ReadonlySet<number> {
		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel === null) return new Set();

		const instrument = this.instrumentStore.state.get(
			activeChannel.instrumentKey,
		);
		if (instrument?.status !== "fulfilled") return new Set();

		return instrument.value.noLoopKeys;
	}

	private updateHoverNoteId() {
		if (this.isHoverNoteIdsLocked) return;

		const prevHoveredNoteIds = this.state.hoveredNoteIds;
		const nextHoveredNoteIds = new Set(
			this.pointerPositions
				.map((position) => this.findNoteByPosition(position))
				.filter(isNotNullish)
				.map((note) => note.id),
		);

		const unhoveredNoteIds = [...prevHoveredNoteIds].filter(
			(id) => !nextHoveredNoteIds.has(id),
		);

		const hoveredNoteIds = [...nextHoveredNoteIds].filter(
			(id) => !prevHoveredNoteIds.has(id),
		);

		if (unhoveredNoteIds.length === 0 && hoveredNoteIds.length === 0) {
			return;
		}

		this.setHoveredNoteIds(new Set(nextHoveredNoteIds));
	}

	private lockHoverNoteIds() {
		this.isHoverNoteIdsLocked = true;
	}

	private unlockHoverNoteIds() {
		this.isHoverNoteIdsLocked = false;
	}

	protected override setState(newState: PianoRollState) {
		const oldState = this.state;
		super.setState(newState);

		if (oldState !== newState) {
			this.updateHoverNoteId();
		}
	}

	// region PointerEventManager Delegate

	findHandle(
		canvasPosition: PositionSnapshot,
	): PointerEventManagerInteractionHandle | null {
		// 1. タイムライン・サイドバー
		if (canvasPosition.x < SIDEBAR_WIDTH) {
			return null;
		}
		if (canvasPosition.y < TIMELINE_HEIGHT) {
			return this.timelineHandle;
		}

		const position = toPianoRollPosition(canvasPosition);

		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel !== null) {
			// 2. 選択中のノート
			for (const note of activeChannel.notes.values()) {
				if (!this.editor.state.selectedNoteIds.has(note.id)) continue;

				const handle = this.findPointerEventsHandleForNote(position, note);
				if (handle !== null) return handle;
			}

			// 3. 未選択のノート
			for (const note of activeChannel.notes.values()) {
				if (this.editor.state.selectedNoteIds.has(note.id)) continue;

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
		if (this.noLoopKeys.has(note.key)) {
			return this.findPointerEventsHandleForNoLoopNote(position, note);
		} else {
			return this.findPointerEventsHandleForLoopNote(position, note);
		}
	}

	private findPointerEventsHandleForLoopNote(
		position: PianoRollPosition,
		note: Note,
	): PointerEventManagerInteractionHandle | null {
		if (note.key !== position.key) return null;

		const xFrom = note.tickFrom * widthPerTick(this.editor.state.zoom);
		const xTo = note.tickTo * widthPerTick(this.editor.state.zoom);

		if (position.x < xFrom - PianoRoll.HIT_TEST_MARGIN_PIXEL) return null;

		if (position.x < xFrom + PianoRoll.HIT_TEST_MARGIN_PIXEL) {
			return this.createNoteStartHandle(note);
		}
		if (position.x < xTo - PianoRoll.HIT_TEST_MARGIN_PIXEL) {
			return this.createNoteBodyHandle(note);
		}
		if (position.x < xTo + PianoRoll.HIT_TEST_MARGIN_PIXEL) {
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

		const minX = xFrom - HEIGHT_PER_KEY / 2 - PianoRoll.HIT_TEST_MARGIN_PIXEL;
		const maxX = xFrom + HEIGHT_PER_KEY / 2 + PianoRoll.HIT_TEST_MARGIN_PIXEL;

		if (minX <= position.x && position.x <= maxX) {
			return this.createNoteBodyHandle(note);
		}

		return null;
	}

	private findPointerEventsHandleForSelectionArea(
		position: PianoRollPosition,
	): PointerEventManagerInteractionHandle | null {
		const selectionArea = computeSelectionArea(
			this.noLoopKeys,
			this.songStore.state,
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

		if (position.x < xFrom - PianoRoll.HIT_TEST_MARGIN_PIXEL) return null;

		if (position.x < xFrom + PianoRoll.HIT_TEST_MARGIN_PIXEL) {
			return this.createSelectionAreaStartHandle();
		}

		if (position.x < xTo - PianoRoll.HIT_TEST_MARGIN_PIXEL) {
			return this.createSelectionAreaBodyHandle();
		}

		if (position.x < xTo + PianoRoll.HIT_TEST_MARGIN_PIXEL) {
			return this.createSelectionAreaEndHandle();
		}

		return null;
	}

	setCursor(cursor: string) {
		if (this.isHoverNoteIdsLocked) return;
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
			scrollTop: this.state.scrollTop,
		};
	}

	getZoomLevel(): number {
		return this.editor.state.zoom;
	}

	onPointerMove(manager: PointerEventManager): void {
		this.pointerPositions = [...manager.pointers.values()].map(
			(p) => p.position,
		);
		this.updateHoverNoteId();
	}

	// endregion

	// region Pointer Interaction Handles

	readonly backgroundHandle: PointerEventManagerInteractionHandle = {
		cursor: "default",
		handlePointerDown: (ev: PointerEventManagerEvent) => {
			const flagMultipleNotesSelectedAtStart =
				this.editor.state.selectedNoteIds.size >= 2;

			if (ev.button === MouseEventButton.PRIMARY) {
				if (!ev.metaKey) {
					this.editor.unselectAllNotes();
				}
			}

			const selectedNoteIds = this.editor.state.selectedNoteIds;
			ev.addDragStartSessionListener((ev) => {
				this.editor.startMarqueeSelection(toPianoRollPosition(ev.position));
			});
			ev.addDragMoveSessionListener((ev) => {
				this.editor.setMarqueeAreaTo(toPianoRollPosition(ev.position));
				this.editor.setSelectedNotes([
					...selectedNoteIds,
					...this.editor.findNotesInMarqueeArea().map((note) => note.id),
				]);
			});
			ev.addDragEndSessionListener(() => {
				this.editor.stopMarqueeSelection();
			});
			ev.addTapSessionListener((ev) => {
				if (ev.button === MouseEventButton.PRIMARY) {
					// ノートが複数選択されていたなら選択解除のためのタップとして扱いノート追加はしない
					if (flagMultipleNotesSelectedAtStart) return;
					if (this.editor.state.activeChannelId === null) return;

					const position = toPianoRollPosition(ev.position);

					const tickFrom =
						Math.floor(position.tick / this.editor.state.quantizeUnitInTick) *
						this.editor.state.quantizeUnitInTick;

					const tickDuration = this.noLoopKeys.has(position.key)
						? 1
						: this.editor.state.newNoteDurationInTick;

					const note = new Note({
						id: Date.now(),
						key: position.key,
						tickFrom,
						tickTo: tickFrom + tickDuration,
						velocity: 100,
					});

					this.startPreviewNotes([note], PianoRoll.NOTE_PREVIEW_DURATION_IN_MS);
					this.setNotes(this.editor.state.activeChannelId, [note]);

					if (ev.metaKey) {
						this.editor.selectNotes([note.id]);
					} else {
						this.editor.setSelectedNotes([note.id]);
					}
				}
			});
		},
	};

	readonly timelineHandle: PointerEventManagerInteractionHandle = {
		cursor: "default",
		handlePointerDown: (ev: PointerEventManagerEvent) => {
			const tick = quantize(
				toPianoRollPosition(ev.position).tick,
				this.editor.state.quantizeUnitInTick,
			);
			this.player.setCurrentTick(tick);

			ev.addDragMoveSessionListener((ev) => {
				this.player.setCurrentTick(toPianoRollPosition(ev.position).tick);
			});
		},
	};

	createSelectionAreaStartHandle(): PointerEventManagerInteractionHandle {
		return {
			cursor: "ew-resize",
			handlePointerDown: (ev: PointerEventManagerEvent) => {
				const channelId = this.editor.state.activeChannelId;
				if (channelId === null) return;

				if (ev.button === MouseEventButton.PRIMARY) {
					if (this.editor.state.selectedNoteIds.size <= 1) {
						this.editor.unselectAllNotes();
					}
				}

				const originalNotes = [
					...getSelectedNotes(this.songStore.state, this.editor.state),
				];
				this.lockHoverNoteIds();

				const tickFrom = toPianoRollPosition(ev.position).tick;

				ev.addDragMoveSessionListener((ev) => {
					const tickTo = toPianoRollPosition(ev.position).tick;
					const tickDiff = tickTo - tickFrom;

					this.setNotes(
						channelId,
						originalNotes.map((note) => {
							return new Note({
								...note,
								tickFrom: quantize(
									minmax(
										0,
										Math.floor(
											(note.tickTo - 1) / this.editor.state.quantizeUnitInTick,
										) * this.editor.state.quantizeUnitInTick,
										note.tickFrom + tickDiff,
									),
									this.editor.state.quantizeUnitInTick,
								),
							});
						}),
					);
				});
				ev.addPointerUpSessionListener(() => {
					this.unlockHoverNoteIds();
				});
			},
		};
	}

	createSelectionAreaBodyHandle(): PointerEventManagerInteractionHandle {
		return {
			cursor: "move",
			handlePointerDown: (ev: PointerEventManagerEvent) => {
				const channelId = this.editor.state.activeChannelId;
				if (channelId === null) return;

				if (ev.button === MouseEventButton.PRIMARY) {
					if (this.editor.state.selectedNoteIds.size <= 1) {
						this.editor.unselectAllNotes();
					}
				}

				const originalNotes = [
					...getSelectedNotes(this.songStore.state, this.editor.state),
				];
				this.startPreviewNotes(originalNotes);
				const startPosition = toPianoRollPosition(ev.position);
				let currentPreviewKey = startPosition.key;

				this.lockHoverNoteIds();
				ev.addDragMoveSessionListener((ev) => {
					const position = toPianoRollPosition(ev.position);
					const keyDiff = position.key - startPosition.key;
					const tickDiff = quantize(
						position.tick - startPosition.tick,
						this.editor.state.quantizeUnitInTick,
					);

					const newNotes = originalNotes.map(
						(note) =>
							new Note({
								...note,
								key: note.key + keyDiff,
								tickFrom: note.tickFrom + tickDiff,
								tickTo: note.tickTo + tickDiff,
							}),
					);

					this.setNotes(channelId, newNotes);

					if (currentPreviewKey !== position.key) {
						this.startPreviewNotes(newNotes);
						currentPreviewKey = position.key;
					}
				});
				ev.addPointerUpSessionListener(() => {
					this.stopPreviewNotes();
					this.unlockHoverNoteIds();
				});
			},
		};
	}

	createSelectionAreaEndHandle(): PointerEventManagerInteractionHandle {
		return {
			cursor: "ew-resize",
			handlePointerDown: (ev: PointerEventManagerEvent) => {
				const channelId = this.editor.state.activeChannelId;
				if (channelId === null) return;

				if (ev.button === MouseEventButton.PRIMARY) {
					if (this.editor.state.selectedNoteIds.size <= 1) {
						this.editor.unselectAllNotes();
					}
				}

				const originalNotes = [
					...getSelectedNotes(this.songStore.state, this.editor.state),
				];
				this.lockHoverNoteIds();
				const startPosition = toPianoRollPosition(ev.position);

				ev.addDragMoveSessionListener((ev) => {
					this.setNotes(
						channelId,
						originalNotes.map((note) => {
							const tickDiff =
								toPianoRollPosition(ev.position).tick - startPosition.tick;

							return new Note({
								...note,
								tickTo: quantize(
									minmax(
										note.tickFrom + this.editor.state.quantizeUnitInTick,
										null,
										note.tickTo + tickDiff,
									),
									this.editor.state.quantizeUnitInTick,
								),
							});
						}),
					);
				});
				ev.addPointerUpSessionListener(() => {
					this.unlockHoverNoteIds();
				});
			},
		};
	}

	createNoteStartHandle(
		targetNote: Note,
	): PointerEventManagerInteractionHandle {
		return {
			cursor: "ew-resize",
			handlePointerDown: (ev: PointerEventManagerEvent) => {
				const channelId = this.editor.state.activeChannelId;
				if (channelId === null) return;

				if (ev.button === MouseEventButton.PRIMARY) {
					const selected = this.editor.state.selectedNoteIds.has(targetNote.id);
					if (selected) {
						if (ev.metaKey) {
							ev.addTapSessionListener(() => {
								this.editor.unselectNotes([targetNote.id]);
							});
						}
					} else {
						this.editor.unselectAllNotes();
						this.editor.selectNotes([targetNote.id]);
					}
				}

				const startPosition = toPianoRollPosition(ev.position);

				const originalNotes = [
					...getSelectedNotes(this.songStore.state, this.editor.state),
				];
				this.lockHoverNoteIds();
				ev.addDragMoveSessionListener((ev) => {
					this.setNotes(
						channelId,
						originalNotes.map((note) => {
							const tickDiff =
								toPianoRollPosition(ev.position).tick - startPosition.tick;
							const tickFrom = quantize(
								minmax(
									0,
									Math.floor(
										(note.tickTo - 1) / this.editor.state.quantizeUnitInTick,
									) * this.editor.state.quantizeUnitInTick,
									note.tickFrom + tickDiff,
								),
								this.editor.state.quantizeUnitInTick,
							);

							if (note.id === targetNote.id) {
								this.editor.setNewNoteDuration(note.tickTo - tickFrom);
							}

							return new Note({ ...note, tickFrom });
						}),
					);
				});
				ev.addPointerUpSessionListener(() => {
					this.unlockHoverNoteIds();
				});
			},
			handleDoubleClick: () => {
				const activeChannelId = this.editor.state.activeChannelId;
				if (activeChannelId === null) return;

				this.deleteNotesUseCase(activeChannelId, [targetNote.id]);
			},
		};
	}

	createNoteBodyHandle(targetNote: Note): PointerEventManagerInteractionHandle {
		return {
			cursor: "move",
			handlePointerDown: (ev: PointerEventManagerEvent) => {
				const channelId = this.editor.state.activeChannelId;
				if (channelId === null) return;

				if (ev.button === MouseEventButton.PRIMARY) {
					const selected = this.editor.state.selectedNoteIds.has(targetNote.id);
					if (selected) {
						if (ev.metaKey) {
							ev.addTapSessionListener(() => {
								this.editor.unselectNotes([targetNote.id]);
							});
						}
					} else {
						this.editor.setSelectedNotes([targetNote.id]);
					}
				}

				const originalNotes = [
					...getSelectedNotes(this.songStore.state, this.editor.state),
				];
				this.startPreviewNotes(originalNotes);

				const startPosition = toPianoRollPosition(ev.position);
				let currentPreviewKey = startPosition.key;

				this.lockHoverNoteIds();
				ev.addDragMoveSessionListener((ev) => {
					const position = toPianoRollPosition(ev.position);
					const tickDiff = quantize(
						position.tick - startPosition.tick,
						this.editor.state.quantizeUnitInTick,
					);
					const keyDiff = position.key - startPosition.key;

					const newNotes = originalNotes.map(
						(note) =>
							new Note({
								...note,
								key: note.key + keyDiff,
								tickFrom: note.tickFrom + tickDiff,
								tickTo: note.tickTo + tickDiff,
							}),
					);
					this.setNotes(channelId, newNotes);

					if (currentPreviewKey !== position.key) {
						this.startPreviewNotes(newNotes);
						currentPreviewKey = position.key;
					}
				});
				ev.addPointerUpSessionListener(() => {
					this.stopPreviewNotes();
					this.unlockHoverNoteIds();
				});
			},
			handleDoubleClick: () => {
				const activeChannelId = this.editor.state.activeChannelId;
				if (activeChannelId === null) return;

				this.deleteNotesUseCase(activeChannelId, [targetNote.id]);
			},
		};
	}

	createNoteEndHandle(targetNote: Note): PointerEventManagerInteractionHandle {
		return {
			cursor: "ew-resize",
			handlePointerDown: (ev: PointerEventManagerEvent) => {
				const channelId = this.editor.state.activeChannelId;
				if (channelId === null) return;

				if (ev.button === MouseEventButton.PRIMARY) {
					const selected = this.editor.state.selectedNoteIds.has(targetNote.id);
					if (selected) {
						if (ev.metaKey) {
							ev.addTapSessionListener(() => {
								this.editor.unselectNotes([targetNote.id]);
							});
						}
					} else {
						this.editor.unselectAllNotes();
						this.editor.selectNotes([targetNote.id]);
					}
				}

				const startPosition = toPianoRollPosition(ev.position);

				const originalNotes = [
					...getSelectedNotes(this.songStore.state, this.editor.state),
				];
				this.lockHoverNoteIds();

				ev.addDragMoveSessionListener((ev) => {
					this.setNotes(
						channelId,
						originalNotes.map((note) => {
							const tickDiff =
								toPianoRollPosition(ev.position).tick - startPosition.tick;
							const tickTo = quantize(
								minmax(
									note.tickFrom + this.editor.state.quantizeUnitInTick,
									null,
									note.tickTo + tickDiff,
								),
								this.editor.state.quantizeUnitInTick,
							);
							if (note.id === targetNote.id) {
								this.editor.setNewNoteDuration(tickTo - note.tickFrom);
							}

							return new Note({ ...note, tickTo });
						}),
					);
				});
				ev.addPointerUpSessionListener(() => {
					this.unlockHoverNoteIds();
				});
			},
			handleDoubleClick: () => {
				const activeChannelId = this.editor.state.activeChannelId;
				if (activeChannelId === null) return;

				this.deleteNotesUseCase(activeChannelId, [targetNote.id]);
			},
		};
	}

	// endregion
}

function toPianoRollPosition(position: PositionSnapshot): PianoRollPosition {
	const x = position.x + position.scrollLeft - SIDEBAR_WIDTH;
	const y = position.y + position.scrollTop - TIMELINE_HEIGHT;
	const key = NUM_KEYS - 1 - Math.floor(y / HEIGHT_PER_KEY);
	const tick = Math.floor(x / widthPerTick(position.zoom));

	return { key, tick, x, y };
}

interface PianoRollPosition {
	readonly key: number;
	readonly tick: number;
	readonly x: number;
	readonly y: number;
}
