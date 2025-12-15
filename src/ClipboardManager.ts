import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { Editor } from "./Editor/Editor.ts";
import { getSelectedNotes } from "./getSelectedNotes.ts";
import { Note, type SerializedNote } from "./models/Note.ts";
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

		this.copy();
		this.removeNotes(activeChannelId, this.editor.state.selectedNoteIds);
	}

	copy() {
		const selectedNotes = [
			...getSelectedNotes(this.songStore.state, this.editor.state),
		];
		if (selectedNotes.length === 0) return;

		const serializedData = JSON.stringify(
			selectedNotes.map((note) => note.serialize()),
		);

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
			const serializedData = JSON.parse(text) as SerializedNote[];
			let nextNoteId = Date.now();

			const originalNotes = serializedData.map((data) =>
				Note.deserialize(data),
			);
			const pasteTickOffset =
				this.player.state.currentTick -
				Math.min(...originalNotes.map((note) => note.tickFrom));

			notes = originalNotes.map(
				(note) =>
					new Note({
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
		this.editor.setAllSelectedNotes(notes.map((note) => note.id));
	}
}
