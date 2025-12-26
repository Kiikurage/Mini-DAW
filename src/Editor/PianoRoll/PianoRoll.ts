import { NUM_KEYS } from "../../constants.ts";
import { ComponentKey } from "../../Dependency/DIContainer.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { EmptySet, minmax } from "../../lib.ts";
import type { Channel } from "../../models/Channel.ts";
import { PromiseState } from "../../PromiseState.ts";
import type { SongStore } from "../../SongStore.ts";
import type {
	SoundFontStore,
	SoundFontStoreState,
} from "../../SoundFontStore.ts";
import { Stateful } from "../../Stateful/Stateful.ts";
import type { Editor } from "../Editor.ts";
import { PianoRollHoverNotesManager } from "./PianoRollHoverNotesManager.ts";
import { HEIGHT_PER_KEY, TIMELINE_HEIGHT } from "./PianoRollViewRenderer.ts";

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
}

export class PianoRoll extends Stateful<PianoRollState> {
	static readonly Key = ComponentKey.of(PianoRoll);

	readonly hoverNotesManager: PianoRollHoverNotesManager;

	constructor(
		private readonly soundFontStore: SoundFontStore,
		private readonly songStore: SongStore,
		private readonly editor: Editor,
	) {
		super({
			cursor: "default",
			height: 0,
			scrollTop: 0,
		});

		this.hoverNotesManager = new PianoRollHoverNotesManager(
			this.editor,
			this,
			this.songStore,
			this.soundFontStore,
		);
	}

	setHeight(height: number) {
		this.updateState((state) => {
			if (state.height === height) return state;
			return {
				...state,
				height,
				scrollTop: minmax(
					0,
					NUM_KEYS * HEIGHT_PER_KEY - (height - TIMELINE_HEIGHT),
					state.scrollTop,
				),
			};
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

	setCursor(cursor: string) {
		if (this.hoverNotesManager.isUpdateDisabled) return;
		this.updateState((state) => {
			if (state.cursor === cursor) return state;
			return { ...state, cursor };
		});
	}

	get loopKeys(): ReadonlySet<number> {
		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel === null) return EmptySet;

		return getLoopKeys(activeChannel, this.soundFontStore.state);
	}
}

export function getLoopKeys(
	channel: Channel,
	soundFontStoreState: SoundFontStoreState,
): ReadonlySet<number> {
	const soundFontPromise = soundFontStoreState.get(channel.instrumentKey.url);
	if (soundFontPromise === undefined) return EmptySet;
	if (!PromiseState.isFulfilled(soundFontPromise?.state)) return EmptySet;

	const soundFont = soundFontPromise.state;
	const preset = soundFont.getPreset(
		channel.instrumentKey.presetNumber,
		channel.instrumentKey.bankNumber,
	);
	if (preset === null) return EmptySet;

	return preset.loopKeys;
}
