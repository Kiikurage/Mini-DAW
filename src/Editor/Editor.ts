import { TICK_PER_MEASURE } from "../constants.ts";
import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import type { FileStore } from "../FileStore.ts";
import { getActiveChannel } from "../getActiveChannel.ts";
import { getMarqueeArea } from "../getMarqueeArea.ts";
import { EmptySet, minmax, toMutableSet, toSet } from "../lib.ts";
import type { CCId } from "../models/CC.ts";
import type { ChannelId } from "../models/Channel.ts";
import type { ControlType } from "../models/ControlType.ts";
import type { Note, NoteId } from "../models/Note.ts";
import type { Player } from "../Player/Player.ts";
import { Stateful } from "../Stateful/Stateful.ts";
import type { MoveNotes } from "../usecases/MoveNotes.ts";
import type { RemoveCCs } from "../usecases/RemoveCCs.ts";
import type { RemoveNotes } from "../usecases/RemoveNotes.ts";
import { EditorSelection } from "./EditorSelection.ts";
import { widthPerTick } from "./ParameterEditor/ParameterEditorViewRenderer.ts";

/**
 * PianoRollとParameterEditorとで共有される状態。
 * 各サブコンポーネント固有の状態はここではなく、個別にサブコンポーネントのStateで管理する。
 */
export interface EditorState {
	/**
	 * TODO: 削除予定
	 * ウェルカムページを表示しているかどうか
	 */
	readonly showWelcomeView: boolean;

	/**
	 * 新規に挿入されるノートのデフォルトの長さ
	 */
	readonly newNoteDurationInTick: number;

	/**
	 * 参照用に表示するチャンネルID一覧
	 */
	readonly previewChannelIds: ReadonlySet<ChannelId>;

	/**
	 * 編集中のチャンネルID
	 */
	readonly activeChannelId: ChannelId | null;

	/**
	 * ズーム率
	 */
	readonly zoom: number;

	/**
	 * エディタの表示幅 [px]
	 */
	readonly width: number;

	/**
	 * スクロール位置(水平) [px]
	 */
	readonly scrollLeft: number;

	/**
	 * 選択状態
	 */
	readonly selection: EditorSelection;

	/**
	 * 時間方向の最小グリッド単位 [tick]
	 */
	readonly timelineGridUnitInTick: number;

	/**
	 * クオンタイズ単位 [tick]
	 */
	readonly quantizeUnitInTick: number;

	/**
	 * 範囲選択の開始位置(指定されたキーを含む)
	 *
	 * PianoRollState.marqueeArea.fromが返す座標は、選択範囲の裏返りなどを正規化しているため、
	 * この値とは異なる可能性がある。
	 */
	readonly marqueeAreaFrom: null | { key: number; tick: number };

	/**
	 * 範囲選択の終了位置(指定されたキーを含む)
	 *
	 * PianoRollState.marqueeArea.toが返す座標は、選択範囲の裏返りなどを正規化しているため、
	 * この値とは異なる可能性がある。
	 */
	readonly marqueeAreaTo: null | { key: number; tick: number };
}

export function clearSelection(state: EditorState): EditorState {
	if (state.selection.type === "void") return state;

	return { ...state, selection: EditorSelection.void };
}

export function getSelectedCCIds(
	state: EditorState,
	controlType: ControlType,
): ReadonlySet<CCId> {
	if (
		state.selection.type === "control" &&
		state.selection.controlType === controlType
	) {
		return state.selection.ids;
	} else {
		return EmptySet;
	}
}

export function getSelectedNoteIds(state: EditorState): ReadonlySet<NoteId> {
	if (state.selection.type === "note") {
		return state.selection.noteIds;
	} else {
		return EmptySet;
	}
}

export function setSelectedCCs(
	state: EditorState,
	controlType: ControlType,
	ids: Iterable<CCId>,
): EditorState {
	const idSet = toSet(ids);
	if (idSet.size === 0) {
		return {
			...state,
			selection: EditorSelection.void,
		};
	}

	return {
		...state,
		selection: {
			type: "control",
			controlType,
			ids: idSet,
		},
	};
}

export function setAllSelectedNotesWithoutMutationCheck(
	state: EditorState,
	selectedNoteIds: Iterable<NoteId>,
): EditorState {
	const selectedNoteIdSet = toSet(selectedNoteIds);
	if (selectedNoteIdSet.size === 0) {
		return {
			...state,
			selection: EditorSelection.void,
		};
	}

	return {
		...state,
		selection: {
			type: "note",
			noteIds: selectedNoteIdSet,
		},
	};
}

export function setSelectedNotes(
	state: EditorState,
	selectedNoteIds: Iterable<NoteId>,
): EditorState {
	const oldSelectedNoteIds = getSelectedNoteIds(state);
	const newSelectedNoteIds = toSet(selectedNoteIds);
	if (
		newSelectedNoteIds.size === oldSelectedNoteIds.size &&
		[...selectedNoteIds].every((id) => oldSelectedNoteIds.has(id))
	) {
		return state;
	}

	return setAllSelectedNotesWithoutMutationCheck(state, newSelectedNoteIds);
}

export function putNotesToSelection(
	state: EditorState,
	noteIds: Iterable<NoteId>,
): EditorState {
	const selectedNoteIds = toMutableSet(getSelectedNoteIds(state));
	const oldSelectedNoteCount = selectedNoteIds.size;

	for (const noteId of noteIds) {
		selectedNoteIds.add(noteId);
	}
	if (selectedNoteIds.size === oldSelectedNoteCount) return state;

	return setAllSelectedNotesWithoutMutationCheck(state, selectedNoteIds);
}

function removeNotesFromSelection(
	state: EditorState,
	noteIds: Iterable<NoteId>,
): EditorState {
	const selectedNoteIds = toMutableSet(getSelectedNoteIds(state));
	const oldSelectedNoteCount = selectedNoteIds.size;

	for (const noteId of noteIds) {
		selectedNoteIds.delete(noteId);
	}
	if (selectedNoteIds.size === oldSelectedNoteCount) return state;

	return setAllSelectedNotesWithoutMutationCheck(state, selectedNoteIds);
}

function toggleNotesSelection(
	state: EditorState,
	noteIds: Iterable<NoteId>,
): EditorState {
	const selectedNoteIds = toMutableSet(getSelectedNoteIds(state));

	for (const noteId of noteIds) {
		if (selectedNoteIds.has(noteId)) {
			selectedNoteIds.delete(noteId);
		} else {
			selectedNoteIds.add(noteId);
		}
	}

	return setAllSelectedNotesWithoutMutationCheck(state, selectedNoteIds);
}

export class Editor extends Stateful<EditorState> {
	static readonly Key = ComponentKey.of(Editor);

	constructor(
		private readonly fileStore: FileStore,
		player: Player,
		bus: EventBus,
		private readonly removeNotes: RemoveNotes,
		private readonly moveNotes: MoveNotes,
		private readonly removeCCs: RemoveCCs,
	) {
		super({
			showWelcomeView: true,
			newNoteDurationInTick: TICK_PER_MEASURE / 4,
			previewChannelIds: EmptySet,
			activeChannelId: null,
			zoom: 1,
			width: 0,
			scrollLeft: 0,
			selection: EditorSelection.void,
			timelineGridUnitInTick: TICK_PER_MEASURE / 4,
			quantizeUnitInTick: TICK_PER_MEASURE / 16,
			marqueeAreaFrom: null,
			marqueeAreaTo: null,
		});

		player.addChangeListener((state) => {
			if (!state.isPlaying || !state.isAutoScrollEnabled) return;

			const playHeadX = state.currentTick * widthPerTick(this.state.zoom);
			const scrollLeft = minmax(
				playHeadX - this.state.width / 2,
				playHeadX,
				this.state.scrollLeft,
			);

			this.setScrollLeft(scrollLeft);
		});

		bus
			.on("file.put.before", () => {
				this.setActiveChannel(null);
			})
			.on("file.put.after", (file) => {
				this.setState({
					...this.state,
					previewChannelIds: EmptySet,
				});

				const firstChannelId = file.song.metadata.channelIds.at(0);
				if (firstChannelId !== undefined) {
					this.setActiveChannel(firstChannelId);
				}
			})
			.on("channel.remove.before", (channelId: ChannelId) => {
				if (this.state.activeChannelId === channelId) {
					this.setActiveChannel(null);
				}
				this.cancelPreviewChannel(channelId);
			})
			.on("notes.remove.before", (channelId, noteIds) => {
				if (this.state.activeChannelId === channelId) {
					this.removeNotesFromSelection(noteIds);
				}
			});
	}

	showWelcomeView() {
		this.updateState((state) => {
			if (state.showWelcomeView) return state;
			return { ...state, showWelcomeView: true };
		});
	}

	hideWelcomeView() {
		this.updateState((state) => {
			if (!state.showWelcomeView) return state;
			return { ...state, showWelcomeView: false };
		});
	}

	setActiveChannel(activeChannelId: ChannelId | null) {
		this.updateState((state) => {
			if (state.activeChannelId === activeChannelId) return state;
			return { ...state, activeChannelId };
		});
	}

	togglePreviewChannel(channelId: ChannelId) {
		this.updateState((state) => {
			const previewChannelIds = toMutableSet(state.previewChannelIds);
			if (previewChannelIds.has(channelId)) {
				previewChannelIds.delete(channelId);
			} else {
				previewChannelIds.add(channelId);
			}
			return { ...state, previewChannelIds };
		});
	}

	togglePreviewAllChannels() {
		this.updateState((state) => {
			const allChannelIds = toMutableSet(
				this.fileStore.state.song.metadata.channelIds,
			);
			const areAllPreviewed = [...allChannelIds].every((id) =>
				state.previewChannelIds.has(id),
			);
			if (areAllPreviewed) {
				return { ...state, previewChannelIds: EmptySet };
			} else {
				return { ...state, previewChannelIds: allChannelIds };
			}
		});
	}

	cancelPreviewChannel(channelId: ChannelId) {
		this.updateState((state) => {
			if (!state.previewChannelIds.has(channelId)) return state;
			const previewChannelIds = toMutableSet(state.previewChannelIds);
			previewChannelIds.delete(channelId);
			return { ...state, previewChannelIds };
		});
	}

	startMarqueeSelection(position: { key: number; tick: number }) {
		this.updateState((state) => {
			if (
				state.marqueeAreaFrom === position &&
				state.marqueeAreaTo === position
			)
				return state;
			return { ...state, marqueeAreaFrom: position, marqueeAreaTo: position };
		});
	}

	setMarqueeAreaTo(position: null | { key: number; tick: number }) {
		this.updateState((state) => {
			if (state.marqueeAreaTo === position) return state;
			return { ...state, marqueeAreaTo: position };
		});
	}

	*findNotesInMarqueeArea(): Generator<Note> {
		const activeChannel = getActiveChannel(
			this.fileStore.state.song,
			this.state,
		);
		if (activeChannel === null) return;

		const area = getMarqueeArea(
			this.state.marqueeAreaFrom,
			this.state.marqueeAreaTo,
		);
		if (area === null) return;

		for (const note of activeChannel.notes.values()) {
			if (note.key < area.keyFrom) continue;
			if (area.keyTo <= note.key) continue;
			if (area.tickTo <= note.tickFrom) continue;
			if (note.tickTo <= area.tickFrom) continue;
			yield note;
		}
	}

	stopMarqueeSelection() {
		this.updateState((state) => {
			if (state.marqueeAreaFrom === null && state.marqueeAreaTo === null)
				return state;
			return { ...state, marqueeAreaFrom: null, marqueeAreaTo: null };
		});
	}

	setWidth(width: number) {
		this.updateState((state) => {
			if (state.width === width) return state;
			return { ...state, width };
		});
	}

	setScrollLeft(scrollLeft: number) {
		this.updateState((state) => {
			// DOM APIはスクロール位置として常に整数を返すため、小数点以下の比較を省かないと、更新が無限に発生する
			const oldValue = Math.round(state.scrollLeft);
			const newValue = Math.round(minmax(0, null, scrollLeft));

			if (oldValue === newValue) return state;

			return { ...state, scrollLeft: newValue };
		});
	}

	setSelectedCCs(controlType: ControlType, ids: Iterable<CCId>) {
		this.updateState((state) => setSelectedCCs(state, controlType, ids));
	}

	setSelectedNotes(selectedNoteIds: Iterable<NoteId>) {
		this.updateState((state) => setSelectedNotes(state, selectedNoteIds));
	}

	putNotesToSelection(noteIds: readonly NoteId[]) {
		this.updateState((state) => putNotesToSelection(state, noteIds));
	}

	putAllNotesToSelection() {
		const activeChannel = getActiveChannel(
			this.fileStore.state.song,
			this.state,
		);
		if (activeChannel === null) return;

		this.setSelectedNotes(activeChannel.notes.values().map((note) => note.id));
	}

	toggleNotesSelection(noteIds: Iterable<NoteId>) {
		this.updateState((state) => toggleNotesSelection(state, noteIds));
	}

	removeNotesFromSelection(noteIds: Iterable<NoteId>) {
		this.updateState((state) => removeNotesFromSelection(state, noteIds));
	}

	clearSelection() {
		this.updateState((state) => clearSelection(state));
	}

	zoomIn() {
		this.setZoom(this.state.zoom * 1.2);
	}

	zoomOut() {
		this.setZoom(this.state.zoom / 1.2);
	}

	setZoom(zoom: number) {
		this.updateState((state) => {
			const center = Math.max(
				(this.state.scrollLeft + this.state.width / 2) /
					widthPerTick(this.state.zoom),
			);
			const scrollLeft = Math.max(
				0,
				center * widthPerTick(zoom) - this.state.width / 2,
			);

			return { ...state, zoom, scrollLeft };
		});
	}

	setNewNoteDuration(newNoteDurationInTick: number) {
		this.updateState((state) => {
			if (state.newNoteDurationInTick === newNoteDurationInTick) return state;

			return { ...state, newNoteDurationInTick };
		});
	}

	setTimelineGridUnit(timelineGridUnitInTick: number) {
		this.updateState((state) => {
			if (state.timelineGridUnitInTick === timelineGridUnitInTick) return state;
			return { ...state, timelineGridUnitInTick };
		});
	}

	setQuantizeUnit(quantizeUnitInTick: number) {
		this.updateState((state) => {
			if (state.quantizeUnitInTick === quantizeUnitInTick) return state;
			return { ...state, quantizeUnitInTick };
		});
	}

	removeSelectedItems() {
		const activeChannelId = this.state.activeChannelId;
		if (activeChannelId === null) return;

		switch (this.state.selection.type) {
			case "void": {
				return;
			}
			case "note": {
				this.removeNotes(activeChannelId, this.state.selection.noteIds);
				return;
			}
			case "control": {
				this.removeCCs({
					channelId: activeChannelId,
					type: this.state.selection.controlType,
					ids: this.state.selection.ids,
				});
				return;
			}
		}
	}

	moveSelectedItems(offset: { tickOffset: number; keyOffset: number }) {
		const activeChannelId = this.state.activeChannelId;
		if (activeChannelId === null) return;

		switch (this.state.selection.type) {
			case "void": {
				return;
			}
			case "note": {
				if (this.state.selection.noteIds.size === 0) return;

				this.moveNotes(
					activeChannelId,
					this.state.selection.noteIds,
					offset.keyOffset,
					offset.tickOffset,
				);
			}
		}
	}
}
