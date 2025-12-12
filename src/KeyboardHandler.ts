import type { ClipboardManager } from "./ClipboardManager.ts";
import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { EditHistoryManager } from "./EditHistory/EditHistoryManager.ts";
import type { Editor } from "./Editor/Editor.ts";
import type { PianoRoll } from "./Editor/PianoRoll/PianoRoll.ts";
import type { Player } from "./Player/Player.ts";

export class KeyboardHandler {
	static readonly Key = ComponentKey.of(KeyboardHandler);

	constructor(
		private readonly pianoRoll: PianoRoll,
		private readonly history: EditHistoryManager,
		private readonly clipboard: ClipboardManager,
		private readonly player: Player,
		private readonly editor: Editor,
	) {}

	handleKeyDown(ev: KeyboardEvent) {
		if (document.activeElement?.tagName === "INPUT") return null;

		switch (ev.key) {
			case "Delete":
			case "Backspace": {
				if (this.editor.state.selectedNoteIds.size === 0) return false;
				this.pianoRoll.deleteNotes(this.editor.state.selectedNoteIds);
				return true;
			}
			case "ArrowLeft": {
				if (this.editor.state.selectedNoteIds.size === 0) return false;

				this.pianoRoll.moveNotes(this.editor.state.selectedNoteIds, 0, -240);
				return true;
			}
			case "ArrowUp": {
				if (this.editor.state.selectedNoteIds.size === 0) return false;

				this.pianoRoll.moveNotes(this.editor.state.selectedNoteIds, 1, 0);
				return true;
			}
			case "ArrowRight": {
				if (this.editor.state.selectedNoteIds.size === 0) return false;

				this.pianoRoll.moveNotes(this.editor.state.selectedNoteIds, 0, 240);
				return true;
			}
			case "ArrowDown": {
				if (this.editor.state.selectedNoteIds.size === 0) return false;

				this.pianoRoll.moveNotes(this.editor.state.selectedNoteIds, -1, 0);
				return true;
			}
			case "Escape": {
				if (this.editor.state.selectedNoteIds.size === 0) return false;
				this.editor.unselectAllNotes();
				return true;
			}
			case " ": {
				this.player.togglePlay();
				return true;
			}
			case "a": {
				if (ev.ctrlKey || ev.metaKey) {
					this.pianoRoll.selectAllNotes();
					return true;
				}
				break;
			}
			case "c": {
				if (ev.ctrlKey || ev.metaKey) {
					this.clipboard.copy();
					return true;
				}
				break;
			}
			case "z": {
				if (ev.ctrlKey || ev.metaKey) {
					if (ev.shiftKey) {
						this.history.redo();
						return true;
					} else {
						this.history.undo();
						return true;
					}
				}
				return false;
			}
			case "x": {
				if (ev.ctrlKey || ev.metaKey) {
					this.clipboard.cut();
					return true;
				}
				break;
			}
			case "v": {
				if (ev.ctrlKey || ev.metaKey) {
					this.clipboard.paste();
					return true;
				}
				break;
			}
			case "+": {
				if (ev.shiftKey) {
					this.editor.zoomIn();
					return true;
				}
				break;
			}
			case "_": {
				if (ev.shiftKey) {
					this.editor.zoomOut();
					return true;
				}
			}
		}
		return false;
	}
}
