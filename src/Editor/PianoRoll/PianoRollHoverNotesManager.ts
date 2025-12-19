import { getActiveChannel } from "../../getActiveChannel.ts";
import { EmptySet, isNotNullish } from "../../lib.ts";
import type { Channel } from "../../models/Channel.ts";
import type { Song } from "../../models/Song.ts";
import type { PositionSnapshot } from "../../PointerEventManager/PositionSnapshot.ts";
import type { SongStore } from "../../SongStore.ts";
import type {
	SoundFontStore,
	SoundFontStoreState,
} from "../../SoundFontStore.ts";
import { Stateful } from "../../Stateful/Stateful.ts";
import type { Editor, EditorState } from "../Editor.ts";
import { widthPerTick } from "../ParameterEditor/ParameterEditorViewRenderer.ts";
import { toPianoRollPosition } from "./features.ts";
import {
	getNoLoopKeys,
	type PianoRoll,
	type PianoRollState,
} from "./PianoRoll.ts";
import { HEIGHT_PER_KEY } from "./PianoRollViewRenderer.ts";

export interface PianoRollHoverNotesManagerState {
	hoverNoteIds: ReadonlySet<number>;
}

/**
 * ピアノロール上でホバーされているノートを管理する
 */
export class PianoRollHoverNotesManager extends Stateful<PianoRollHoverNotesManagerState> {
	/**
	 * 現在のポインタ位置
	 */
	private pointerPositions: readonly PositionSnapshot[] = [];

	/**
	 * trueの間、ホバーノートIDの自動更新無効化、カーソル種類の固定などの効果がある
	 */
	#isUpdateDisabled = false;

	get isUpdateDisabled() {
		return this.#isUpdateDisabled;
	}

	constructor(
		private readonly editor: Editor,
		private readonly pianoRoll: PianoRoll,
		private readonly songStore: SongStore,
		private readonly soundFontStore: SoundFontStore,
	) {
		super({ hoverNoteIds: EmptySet });

		const update = () => {
			const activeChannel = getActiveChannel(
				this.songStore.state,
				this.editor.state,
			);
			if (activeChannel === null) {
				this.setHoverNoteIds(EmptySet);
				return;
			}

			this.setHoverNoteIds(
				computeHoverNoteIds(
					this.pointerPositions,
					this.editor.state,
					this.pianoRoll.state,
					this.songStore.state,
					this.soundFontStore.state,
					activeChannel,
				),
			);
		};

		this.setPointerPositions = (
			pointerPositions: Iterable<PositionSnapshot>,
		) => {
			this.pointerPositions = [...pointerPositions];
			update();
		};
		editor.addChangeListener(update);
		pianoRoll.addChangeListener(update);
		songStore.addChangeListener(update);
		soundFontStore.addChangeListener(update);
	}

	readonly setPointerPositions: (
		pointerPositions: Iterable<PositionSnapshot>,
	) => void;

	disableUpdate() {
		this.#isUpdateDisabled = true;
	}

	enableUpdate() {
		this.#isUpdateDisabled = false;
	}

	private setHoverNoteIds(nextHoverNoteIds: ReadonlySet<number>) {
		if (this.isUpdateDisabled) return;

		const prevHoverNoteIds = this.state.hoverNoteIds;

		const changed =
			prevHoverNoteIds.size !== nextHoverNoteIds.size ||
			[...prevHoverNoteIds].some((id) => !nextHoverNoteIds.has(id));

		if (!changed) return;

		this.setState({ hoverNoteIds: new Set(nextHoverNoteIds) });
	}
}

function computeHoverNoteIds(
	pointerPositions: readonly PositionSnapshot[],
	editorState: EditorState,
	pianoRollState: PianoRollState,
	song: Song,
	soundFontStoreState: SoundFontStoreState,
	channel: Channel,
) {
	const noLoopKeys = getNoLoopKeys(channel, soundFontStoreState);

	return new Set(
		pointerPositions
			.map((pointerPosition) => {
				const position = toPianoRollPosition(
					pointerPosition,
					editorState,
					pianoRollState,
				);
				const activeChannel = getActiveChannel(song, editorState);
				if (activeChannel === null) return null;

				for (const note of activeChannel.notes.values()) {
					if (noLoopKeys.has(note.key)) {
						const xFrom = note.tickFrom * widthPerTick(editorState.zoom);
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
			})
			.filter(isNotNullish)
			.map((note) => note.id),
	);
}
