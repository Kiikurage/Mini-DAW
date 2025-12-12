import { ComponentKey } from "../Dependency/DIContainer.ts";

interface HistoryEntry {
	command: EditCommand;
	isCheckPoint: boolean;
}

export class EditHistoryManager {
	static readonly Key = ComponentKey.of(EditHistoryManager);

	private readonly undoStack: HistoryEntry[] = [];
	private readonly redoStack: HistoryEntry[] = [];

	/**
	 * コマンドを実行して履歴に追加する
	 * @param command
	 */
	execute(command: EditCommand): void {
		command.do();
		this.undoStack.push({ command, isCheckPoint: false });
		this.redoStack.length = 0; // Clear redo stack
	}

	/**
	 * 現在の履歴地点をundo可能なcheckpointとしてマークする
	 */
	markCheckpoint(): void {
		const lastCommand = this.undoStack.at(-1);
		if (lastCommand) {
			lastCommand.isCheckPoint = true;
		}
	}

	/**
	 *  元に戻す
	 */
	undo(): void {
		this.markCheckpoint();

		do {
			const lastCommand = this.undoStack.pop();
			if (lastCommand === undefined) break;

			lastCommand.command.undo();
			this.redoStack.push(lastCommand);
		} while (!this.undoStack.at(-1)?.isCheckPoint);
	}

	/**
	 * やり直す
	 */
	redo(): void {
		this.markCheckpoint();

		do {
			const nextCommand = this.redoStack.pop();
			if (nextCommand === undefined) break;

			nextCommand.command.do();
			this.undoStack.push(nextCommand);
		} while (!this.undoStack.at(-1)?.isCheckPoint);
	}
}

export interface EditCommand {
	/**
	 * 実行する
	 */
	do(): void;

	/**
	 * 元に戻す
	 */
	undo(): void;
}
