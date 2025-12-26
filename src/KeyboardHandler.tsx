import { SaveDialog } from "./AutoSaveConfigDialog/SaveDialog.tsx";
import type { ClipboardManager } from "./ClipboardManager.ts";
import { ComponentKey } from "./Dependency/DIContainer.ts";
import type { EditHistoryManager } from "./EditHistory/EditHistoryManager.ts";
import type { Editor } from "./Editor/Editor.ts";
import type { Player } from "./Player/Player.ts";
import type { OverlayPortal } from "./react/OverlayPortal.ts";
import type { LoadFile } from "./usecases/LoadFile.ts";
import type { SaveFile } from "./usecases/SaveFile.ts";

export class KeyboardHandler {
	static readonly Key = ComponentKey.of(KeyboardHandler);

	constructor(
		private readonly history: EditHistoryManager,
		private readonly clipboard: ClipboardManager,
		private readonly player: Player,
		private readonly editor: Editor,
		private readonly overlayPortal: OverlayPortal,
		private readonly saveFile: SaveFile,
		private readonly loadFile: LoadFile,
	) {}

	/**
	 * Captureフェーズでのkeydownイベントハンドラ
	 * ブラウザのデフォルト動作を防ぎたい場合はこちらで処理する
	 * @param ev
	 */
	handleKeyDownCapture(ev: KeyboardEvent) {
		if (document.activeElement?.tagName === "INPUT") return null;

		switch (ev.key) {
			case "s": {
				if (ev.ctrlKey || ev.metaKey) {
					this.overlayPortal.show(({ close }) => (
						<SaveDialog onClose={close} />
					));
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

	handleKeyDown(ev: KeyboardEvent) {
		if (document.activeElement?.tagName === "INPUT") return null;

		switch (ev.key) {
			case "Delete":
			case "Backspace": {
				this.editor.removeSelectedItems();
				return true;
			}
			case "ArrowLeft": {
				this.editor.moveSelectedItems({
					tickOffset: -this.editor.state.quantizeUnitInTick,
					keyOffset: 0,
				});
				return true;
			}
			case "ArrowUp": {
				this.editor.moveSelectedItems({
					tickOffset: 0,
					keyOffset: 1,
				});
				return true;
			}
			case "ArrowRight": {
				this.editor.moveSelectedItems({
					tickOffset: this.editor.state.quantizeUnitInTick,
					keyOffset: 0,
				});
				return true;
			}
			case "ArrowDown": {
				this.editor.moveSelectedItems({
					tickOffset: 0,
					keyOffset: -1,
				});
				return true;
			}
			case "Escape": {
				this.editor.clearSelection();
				return true;
			}
			case " ": {
				this.player.togglePlay();
				return true;
			}
			case "a": {
				if (ev.ctrlKey || ev.metaKey) {
					this.editor.putAllNotesToSelection();
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
		}
		return false;
	}
}
