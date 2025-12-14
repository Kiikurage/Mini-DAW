import { PointerEventManager, type PointerEventManagerDelegate, } from "../../CanvasUIController/PointerEventManager.ts";
import type { PointerEventManagerEvent } from "../../CanvasUIController/PointerEventManagerEvent.ts";
import type { PointerEventManagerInteractionHandle } from "../../CanvasUIController/PointerEventManagerInteractionHandle.ts";
import type { PositionSnapshot } from "../../CanvasUIController/PositionSnapshot.ts";
import { MouseEventButton, NUM_KEYS } from "../../constants.ts";
import { ComponentKey } from "../../Dependency/DIContainer.ts";
import type { EventBus } from "../../EventBus.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { getSelectedNotes } from "../../getSelectedNotes.ts";
import type { InstrumentStoreState } from "../../InstrumentStore.ts";
import { isNotNullish, minmax, quantize } from "../../lib.ts";
import { Note } from "../../models/Note.ts";
import type { Song } from "../../models/Song.ts";
import type { Player } from "../../Player/Player.ts";
import { Stateful } from "../../Stateful/Stateful.ts";
import type { DeleteNotes } from "../../usecases/DeleteNotes.ts";
import type { MoveNotes } from "../../usecases/MoveNotes.ts";
import type { SetNotes } from "../../usecases/SetNotes.ts";
import type { Editor, EditorState } from "../Editor.ts";
import { type PianoRollArea, PianoRollState } from "./PianoRollState.ts";
import { HEIGHT_PER_KEY, SIDEBAR_WIDTH, TIMELINE_HEIGHT, widthPerTick, } from "./PianoRollViewRenderer.ts";

export class PianoRoll
	extends Stateful<PianoRollState>
	implements PointerEventManagerDelegate
{
	static readonly Key = ComponentKey.of(PianoRoll);

	/**
	 * trueの間、ホバーノートIDの自動更新無効化、カーソル種類の固定などの効果がある
	 * @private
	 */
	private isHoverNoteIdsLocked = false;

	/**
	 * ノートおよび選択範囲に対する当たり判定のマージン（ピクセル単位）
	 */
	private static readonly HIT_TEST_MARGIN_PIXEL = 8;

	private static readonly NOTE_PREVIEW_DURATION_IN_MS = 200;

	private readonly canvasUIController = new PointerEventManager(this);

	constructor(
		private readonly instrumentStore: Stateful<InstrumentStoreState>,
		private readonly songStore: Stateful<Song>,
		private readonly setNotes: SetNotes,
		private readonly moveNotesUseCase: MoveNotes,
		private readonly deleteNotesUseCase: DeleteNotes,
		private readonly player: Player,
		private readonly editor: Editor,
		bus: EventBus,
	) {
		super(new PianoRollState());

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

		bus.on("channel.delete.before", (channelId: number) => {
			this.cancelPreviewChannel(channelId);
			this.cancelMuteChannel(channelId);
		});
	}

	// region Setter and Getter

	setHeight(height: number) {
		this.updateState((state) => state.setHeight(height));
	}

	setQuantizeUnit(quantizeUnit: number) {
		this.updateState((state) => state.setQuantizeUnit(quantizeUnit));
	}

	togglePreviewChannel(channelId: number) {
		return this.updateState((state) => state.togglePreviewChannel(channelId));
	}

	cancelPreviewChannel(channelId: number) {
		return this.updateState((state) => state.cancelPreviewChannel(channelId));
	}

	toggleMuteChannel(channelId: number) {
		return this.updateState((state) => state.toggleMuteChannel(channelId));
	}

	cancelMuteChannel(channelId: number) {
		return this.updateState((state) => state.cancelMuteChannel(channelId));
	}

	setScrollTop(scrollTop: number) {
		this.updateState((state) => state.setScrollTop(scrollTop));
	}

	selectAllNotes() {
		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel === null) return;

		this.editor.setSelectedNotes(
			activeChannel.notes.values().map((note) => note.id),
		);
	}

	moveNotes(noteIds: Iterable<number>, keyDiff: number, tickDiff: number) {
		if (this.editor.state.activeChannelId === null) return;

		this.moveNotesUseCase(
			this.editor.state.activeChannelId,
			noteIds,
			keyDiff,
			tickDiff,
		);
	}

	deleteNotes(noteIds: Iterable<number>) {
		if (this.editor.state.activeChannelId === null) return;

		this.deleteNotesUseCase(this.editor.state.activeChannelId, noteIds);
	}

	setNewNoteDurationInTick(newNoteDurationInTick: number) {
		this.updateState((state) =>
			state.setNewNoteDurationTick(newNoteDurationInTick),
		);
	}

	startSelectionWithMarqueeArea(position: { key: number; tick: number }) {
		this.updateState((state) =>
			state.setMarqueeAreaFrom(position).setMarqueeAreaTo(position),
		);
	}

	endSelectionWithMarqueeArea() {
		this.updateState((state) =>
			state.setMarqueeAreaFrom(null).setMarqueeAreaTo(null),
		);
	}

	// endregion

	// region Event Handlers

	readonly handlePointerDown = (ev: PointerEvent) =>
		this.canvasUIController.handlePointerDown(ev);

	readonly handlePointerMove = (ev: PointerEvent) =>
		this.canvasUIController.handlePointerMove(ev);

	readonly handlePointerUp = (ev: PointerEvent) =>
		this.canvasUIController.handlePointerUp(ev);

	readonly handleDoubleClick = (ev: MouseEvent) =>
		this.canvasUIController.handleDoubleClick(ev);

	// endregion

	// region CanvasUIControllerDelegate implementation

	findHandle(
		canvasPosition: PositionSnapshot,
	): PointerEventManagerInteractionHandle | null {
		const area = detectArea(canvasPosition);

		// 1. タイムライン・サイドバー・コーナー
		if (area === "timeline") return this.timelineHandle;
		if (area === "sidebar") return null;

		const position = PianoRollPosition.create(canvasPosition);

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

		if (
			position.x <
			note.getXFrom(this.editor.state.zoom) - PianoRoll.HIT_TEST_MARGIN_PIXEL
		)
			return null;

		if (
			position.x <
			note.getXFrom(this.editor.state.zoom) + PianoRoll.HIT_TEST_MARGIN_PIXEL
		) {
			return this.createNoteStartHandle(note);
		}
		if (
			position.x <
			note.getXTo(this.editor.state.zoom) - PianoRoll.HIT_TEST_MARGIN_PIXEL
		) {
			return this.createNoteBodyHandle(note);
		}
		if (
			position.x <
			note.getXTo(this.editor.state.zoom) + PianoRoll.HIT_TEST_MARGIN_PIXEL
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

		const minX =
			note.getXFrom(this.editor.state.zoom) -
			HEIGHT_PER_KEY / 2 -
			PianoRoll.HIT_TEST_MARGIN_PIXEL;
		const maxX =
			note.getXFrom(this.editor.state.zoom) +
			HEIGHT_PER_KEY / 2 +
			PianoRoll.HIT_TEST_MARGIN_PIXEL;

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

		this.updateState((state) => state.setCursor(cursor));
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

	onPointerMove(): void {
		this.updateHoverNoteId();
	}

	// endregion

	// region Preview Notes

	private readonly currentPreviewingNotes = new Set<Note>();

	/**
	 * ノートをプレビューする
	 * @param notes
	 * @param durationInMS
	 */
	previewNotes(notes: Iterable<Note>, durationInMS = -1) {
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

	// endregion

	// region Pointer Interaction Handles

	private readonly backgroundHandle: PointerEventManagerInteractionHandle = {
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
				this.startSelectionWithMarqueeArea(
					PianoRollPosition.create(ev.position),
				);
			});
			ev.addDragMoveSessionListener((ev) => {
				this.updateState((state) => {
					return state.setMarqueeAreaTo(PianoRollPosition.create(ev.position));
				});
				this.editor.setSelectedNotes([
					...selectedNoteIds,
					...this.getNotesInMarqueeArea().map((note) => note.id),
				]);
			});
			ev.addDragEndSessionListener(() => this.endSelectionWithMarqueeArea());
			ev.addTapSessionListener((ev) => {
				if (ev.button === MouseEventButton.PRIMARY) {
					// ノートが複数選択されていたなら選択解除のためのタップとして扱いノート追加はしない
					if (flagMultipleNotesSelectedAtStart) return;
					if (this.editor.state.activeChannelId === null) return;

					const position = PianoRollPosition.create(ev.position);

					const tickFrom =
						Math.floor(position.tick / this.state.quantizeUnitInTick) *
						this.state.quantizeUnitInTick;

					const tickDuration = this.noLoopKeys.has(position.key)
						? 1
						: this.state.newNoteDurationInTick;

					const note = new Note({
						id: Date.now(),
						key: position.key,
						tickFrom,
						tickTo: tickFrom + tickDuration,
						velocity: 100,
					});

					this.previewNotes([note], PianoRoll.NOTE_PREVIEW_DURATION_IN_MS);
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

	private readonly timelineHandle: PointerEventManagerInteractionHandle = {
		cursor: "default",
		handlePointerDown: (ev: PointerEventManagerEvent) => {
			const tick = quantize(
				PianoRollPosition.create(ev.position).tick,
				this.state.quantizeUnitInTick,
			);
			this.player.setCurrentTick(tick);

			ev.addDragMoveSessionListener((ev) => {
				this.player.setCurrentTick(PianoRollPosition.create(ev.position).tick);
			});
		},
	};

	private createSelectionAreaStartHandle(): PointerEventManagerInteractionHandle {
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

				const originalNotes = [...this.getSelectedNotes()];
				this.lockHoverNoteIds();

				const tickFrom = PianoRollPosition.create(ev.position).tick;

				ev.addDragMoveSessionListener((ev) => {
					const tickTo = PianoRollPosition.create(ev.position).tick;
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
											(note.tickTo - 1) / this.state.quantizeUnitInTick,
										) * this.state.quantizeUnitInTick,
										note.tickFrom + tickDiff,
									),
									this.state.quantizeUnitInTick,
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

	private createSelectionAreaBodyHandle(): PointerEventManagerInteractionHandle {
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

				const originalNotes = [...this.getSelectedNotes()];
				this.previewNotes(originalNotes);
				const startPosition = PianoRollPosition.create(ev.position);
				let currentPreviewKey = startPosition.key;

				this.lockHoverNoteIds();
				ev.addDragMoveSessionListener((ev) => {
					const position = PianoRollPosition.create(ev.position);
					const keyDiff = position.key - startPosition.key;
					const tickDiff = quantize(
						position.tick - startPosition.tick,
						this.state.quantizeUnitInTick,
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
						this.previewNotes(newNotes);
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

	private createSelectionAreaEndHandle(): PointerEventManagerInteractionHandle {
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

				const originalNotes = [...this.getSelectedNotes()];
				this.lockHoverNoteIds();
				const startPosition = PianoRollPosition.create(ev.position);

				ev.addDragMoveSessionListener((ev) => {
					this.setNotes(
						channelId,
						originalNotes.map((note) => {
							const tickDiff =
								PianoRollPosition.create(ev.position).tick - startPosition.tick;

							return new Note({
								...note,
								tickTo: quantize(
									minmax(
										note.tickFrom + this.state.quantizeUnitInTick,
										null,
										note.tickTo + tickDiff,
									),
									this.state.quantizeUnitInTick,
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

	private createNoteStartHandle(
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

				const startPosition = PianoRollPosition.create(ev.position);

				const originalNotes = [...this.getSelectedNotes()];
				this.lockHoverNoteIds();
				ev.addDragMoveSessionListener((ev) => {
					this.setNotes(
						channelId,
						originalNotes.map((note) => {
							const tickDiff =
								PianoRollPosition.create(ev.position).tick - startPosition.tick;
							const tickFrom = quantize(
								minmax(
									0,
									Math.floor(
										(note.tickTo - 1) / this.state.quantizeUnitInTick,
									) * this.state.quantizeUnitInTick,
									note.tickFrom + tickDiff,
								),
								this.state.quantizeUnitInTick,
							);

							if (note.id === targetNote.id) {
								this.setNewNoteDurationInTick(note.tickTo - tickFrom);
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
				this.deleteNotes([targetNote.id]);
			},
		};
	}

	private createNoteBodyHandle(
		targetNote: Note,
	): PointerEventManagerInteractionHandle {
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

				const originalNotes = [...this.getSelectedNotes()];
				this.previewNotes(originalNotes);
				const startPosition = PianoRollPosition.create(ev.position);
				let currentPreviewKey = startPosition.key;

				this.lockHoverNoteIds();
				ev.addDragMoveSessionListener((ev) => {
					const position = PianoRollPosition.create(ev.position);
					const tickDiff = quantize(
						position.tick - startPosition.tick,
						this.state.quantizeUnitInTick,
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
						this.previewNotes(newNotes);
						currentPreviewKey = position.key;
					}
				});
				ev.addPointerUpSessionListener(() => {
					this.stopPreviewNotes();
					this.unlockHoverNoteIds();
				});
			},
			handleDoubleClick: () => {
				this.deleteNotes([targetNote.id]);
			},
		};
	}

	private createNoteEndHandle(
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

				const startPosition = PianoRollPosition.create(ev.position);

				const originalNotes = [...this.getSelectedNotes()];
				this.lockHoverNoteIds();
				ev.addDragMoveSessionListener((ev) => {
					this.setNotes(
						channelId,
						originalNotes.map((note) => {
							const tickDiff =
								PianoRollPosition.create(ev.position).tick - startPosition.tick;
							const tickTo = quantize(
								minmax(
									note.tickFrom + this.state.quantizeUnitInTick,
									null,
									note.tickTo + tickDiff,
								),
								this.state.quantizeUnitInTick,
							);
							if (note.id === targetNote.id) {
								this.setNewNoteDurationInTick(tickTo - note.tickFrom);
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
				this.deleteNotes([targetNote.id]);
			},
		};
	}

	// endregion

	private *getSelectedNotes(): Generator<Note> {
		yield* getSelectedNotes(this.songStore.state, this.editor.state);
	}

	private findNoteByPosition(canvasPosition: PositionSnapshot): Note | null {
		const position = PianoRollPosition.create(canvasPosition);
		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel === null) return null;

		for (const note of activeChannel.notes.values()) {
			if (this.noLoopKeys.has(note.key)) {
				const minX = note.getXFrom(this.editor.state.zoom) - HEIGHT_PER_KEY / 2;
				const maxX = note.getXFrom(this.editor.state.zoom) + HEIGHT_PER_KEY / 2;
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
			[...this.canvasUIController.pointers.values()]
				.map((info) => this.findNoteByPosition(info.position))
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

		this.updateState((state) =>
			state.setHoveredNoteIds(new Set(nextHoveredNoteIds)),
		);
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

	private *getNotesInMarqueeArea() {
		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel === null) return;

		const area = this.state.marqueeArea;
		if (area === null) return;

		for (const note of activeChannel.notes.values()) {
			if (note.key < area.keyFrom) continue;
			if (area.keyTo <= note.key) continue;
			if (area.tickTo <= note.tickFrom) continue;
			if (note.tickTo <= area.tickFrom) continue;
			yield note;
		}
	}
}

function detectArea(
	position: PositionSnapshot,
): "timeline" | "sidebar" | "main" {
	if (position.x < SIDEBAR_WIDTH) return "sidebar";
	if (position.y < TIMELINE_HEIGHT) return "timeline";
	return "main";
}

/**
 * ピアノロール上の位置
 */
interface PianoRollPosition {
	readonly key: number;
	readonly tick: number;

	/**
	 * スクロール量を含むx座標[pixel]
	 */
	readonly x: number;

	/**
	 * スクロール量を含むy座標[pixel]
	 */
	readonly y: number;
}
const PianoRollPosition = {
	create(position: PositionSnapshot): PianoRollPosition {
		const x = position.x + position.scrollLeft - SIDEBAR_WIDTH;
		const y = position.y + position.scrollTop - TIMELINE_HEIGHT;
		const key = NUM_KEYS - 1 - Math.floor(y / HEIGHT_PER_KEY);
		const tick = Math.floor(x / widthPerTick(position.zoom));

		return { key, tick, x, y };
	},
};

/**
 * 選択されているノートを包含する矩形範囲
 */
export function computeSelectionArea(
	noLoopKeys: ReadonlySet<number>,
	song: Song,
	editorState: EditorState,
): null | PianoRollArea {
	const notes = [...getSelectedNotes(song, editorState)];
	if (notes.length === 0) return null;

	const keys = notes.map((note) => note.key);
	const tickFroms = notes.map((note) => note.tickFrom);
	const tickTos = notes.map((note) => {
		if (noLoopKeys.has(note.key)) {
			return note.tickFrom;
		} else {
			return note.tickTo;
		}
	});

	return {
		keyFrom: Math.min(...keys),
		keyTo: Math.max(...keys) + 1,
		tickFrom: Math.min(...tickFroms),
		tickTo: Math.max(...tickTos),
	};
}
