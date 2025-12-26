import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { Editor } from "./Editor/Editor.ts";
import { getSelectedNotes } from "./getSelectedNotes.ts";
import { Note } from "./models/Note.ts";
import type { Player } from "./Player/Player.ts";
import type { SongStore } from "./SongStore.ts";
import type { RemoveNotes } from "./usecases/RemoveNotes.ts";
import type { SetNotes } from "./usecases/SetNotes.ts";

export class ClipboardManager {
	static readonly Key = ComponentKey.of(ClipboardManager);

	constructor(
		private readonly songStore: SongStore,
		private readonly player: Player,
		private readonly editor: Editor,
		private readonly setNotes: SetNotes,
		private readonly removeNotes: RemoveNotes,
	) {}

	cut() {
		const activeChannelId = this.editor.state.activeChannelId;
		if (activeChannelId === null) return;

		const selection = this.editor.state.selection;
		if (selection.type !== "note") return;

		this.copy();
		this.removeNotes(activeChannelId, selection.noteIds);
	}

	copy() {
		const selectedNotes = [
			...getSelectedNotes(this.songStore.state.song, this.editor.state),
		];
		if (selectedNotes.length === 0) return;

		const serializedData = JSON.stringify(selectedNotes);

		const type = "text/plain";
		const blob = new Blob([serializedData], { type });
		const clipboardItem = new ClipboardItem({ [blob.type]: blob });
		void navigator.clipboard.write([clipboardItem]);
	}

	async paste() {
		const items = await navigator.clipboard.read();
		const blob = await items.at(0)?.getType("text/plain");
		if (blob === undefined) return;

		const text = await blob.text();
		let notes: Note[];
		try {
			const originalNotes = JSON.parse(text) as Note[];
			let nextNoteId = Date.now();

			const pasteTickOffset =
				this.player.state.currentTick -
				Math.min(...originalNotes.map((note) => note.tickFrom));

			notes = originalNotes.map((note) =>
				Note.create({
					...note,
					id: nextNoteId++,
					tickFrom: note.tickFrom + pasteTickOffset,
					tickTo: note.tickTo + pasteTickOffset,
				}),
			);
		} catch (_ignored) {
			return;
		}

		const channelId = this.editor.state.activeChannelId;
		if (channelId === null) return;

		this.setNotes(channelId, notes);
		this.editor.setSelectedNotes(notes.map((note) => note.id));
	}
}
