import type { ClipboardManager } from "./ClipboardManager.ts";
import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { EditHistoryManager } from "./EditHistory/EditHistoryManager.ts";
import type { Editor } from "./Editor/Editor.ts";
import type { Player } from "./Player/Player.ts";
import type { DeleteNotes } from "./usecases/DeleteNotes.ts";
import type { LoadFile } from "./usecases/LoadFile.ts";
import type { MoveNotes } from "./usecases/MoveNotes.ts";
import type { SaveFile } from "./usecases/SaveFile.ts";

export class KeyboardHandler {
	static readonly Key = ComponentKey.of(KeyboardHandler);

	constructor(
		private readonly history: EditHistoryManager,
		private readonly clipboard: ClipboardManager,
		private readonly player: Player,
		private readonly editor: Editor,
		private readonly saveFile: SaveFile,
		private readonly loadFile: LoadFile,
		private readonly moveNotes: MoveNotes,
		private readonly deleteNotes: DeleteNotes,
	) {}

	handleKeyDown(ev: KeyboardEvent) {
		if (document.activeElement?.tagName === "INPUT") return null;

		switch (ev.key) {
			case "Delete":
			case "Backspace": {
				const activeChannelId = this.editor.state.activeChannelId;
				if (activeChannelId === null) return;

				const selectedNoteIds = this.editor.state.selectedNoteIds;
				if (selectedNoteIds.size === 0) return false;

				this.deleteNotes(activeChannelId, selectedNoteIds);
				return true;
			}
			case "ArrowLeft": {
				const activeChannelId = this.editor.state.activeChannelId;
				if (activeChannelId === null) return false;

				const selectedNoteIds = this.editor.state.selectedNoteIds;
				if (selectedNoteIds.size === 0) return false;

				this.moveNotes(
					activeChannelId,
					selectedNoteIds,
					0,
					-this.editor.state.quantizeUnitInTick,
				);
				return true;
			}
			case "ArrowUp": {
				const activeChannelId = this.editor.state.activeChannelId;
				if (activeChannelId === null) return false;

				const selectedNoteIds = this.editor.state.selectedNoteIds;
				if (selectedNoteIds.size === 0) return false;

				this.moveNotes(activeChannelId, selectedNoteIds, 1, 0);
				return true;
			}
			case "ArrowRight": {
				const activeChannelId = this.editor.state.activeChannelId;
				if (activeChannelId === null) return false;

				const selectedNoteIds = this.editor.state.selectedNoteIds;
				if (selectedNoteIds.size === 0) return false;

				this.moveNotes(
					activeChannelId,
					selectedNoteIds,
					0,
					this.editor.state.quantizeUnitInTick,
				);
				return true;
			}
			case "ArrowDown": {
				const activeChannelId = this.editor.state.activeChannelId;
				if (activeChannelId === null) return false;

				const selectedNoteIds = this.editor.state.selectedNoteIds;
				if (selectedNoteIds.size === 0) return false;

				this.moveNotes(activeChannelId, selectedNoteIds, -1, 0);
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
					this.editor.selectAllNotes();
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
			case "s": {
				if (ev.ctrlKey || ev.metaKey) {
					this.saveFile();
					return true;
				}
				break;
			}
			case "o": {
				if (ev.ctrlKey || ev.metaKey) {
					this.loadFile();
					return true;
				}
				break;
			}
			case "=": {
				if (ev.ctrlKey || ev.metaKey) {
					this.editor.zoomIn();
					return true;
				}
				break;
			}
			case "-": {
				if (ev.ctrlKey || ev.metaKey) {
					this.editor.zoomOut();
					return true;
				}
			}
		}
		return false;
	}
}
