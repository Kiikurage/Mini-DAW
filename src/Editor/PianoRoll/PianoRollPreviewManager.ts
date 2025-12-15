import { getActiveChannel } from "../../getActiveChannel.ts";
import type { InstrumentStore } from "../../InstrumentStore.ts";
import type { Note } from "../../models/Note.ts";
import type { SongStore } from "../../SongStore.ts";
import type { Editor } from "../Editor.ts";

/**
 * ピアノロールのノートプレビュー機能(ノート作成・編集時に音をプレビューする機能)を管理する
 */
export class PianoRollPreviewManager {
	/**
	 * 現在プレビュー中のノート
	 */
	private readonly currentPreviewingNotes = new Set<Note>();

	constructor(
		private readonly instrumentStore: InstrumentStore,
		private readonly songStore: SongStore,
		private readonly editor: Editor,
	) {}

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
}
