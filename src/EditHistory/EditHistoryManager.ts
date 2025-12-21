import { ComponentKey } from "../Dependency/DIContainer.ts";
import { Stateful } from "../Stateful/Stateful.ts";

interface HistoryEntry {
	command: EditCommand;
	isCheckPoint: boolean;
}

export class EditHistoryManagerState {
	private readonly undoStack: readonly HistoryEntry[];
	private readonly redoStack: readonly HistoryEntry[];

	constructor(
		props: {
			undoStack: readonly HistoryEntry[];
			redoStack: readonly HistoryEntry[];
		} = { undoStack: [], redoStack: [] },
	) {
		this.undoStack = props.undoStack;
		this.redoStack = props.redoStack;
	}

	get canUndo(): boolean {
		return this.undoStack.length > 0;
	}

	get canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	addUndoEntry(entry: HistoryEntry) {
		return new EditHistoryManagerState({
			...this,
			undoStack: [...this.undoStack, entry],
			redoStack: [],
		});
	}

	markCheckpoint() {
		const undoStack = [...this.undoStack];
		const lastEntry = undoStack[undoStack.length - 1];
		if (lastEntry === undefined) return this;

		undoStack[undoStack.length - 1] = {
			...lastEntry,
			isCheckPoint: true,
		};

		return new EditHistoryManagerState({
			...this,
			undoStack,
		});
	}

	undo(): [EditHistoryManagerState, EditCommand[]] {
		this.markCheckpoint();
		const commands = [];
		const undoStack = [...this.undoStack];
		const redoStack = [...this.redoStack];

		do {
			const lastCommand = undoStack.pop();
			if (lastCommand === undefined) break;

			commands.push(lastCommand.command);
			redoStack.push(lastCommand);
		} while (!undoStack.at(-1)?.isCheckPoint);

		return [
			new EditHistoryManagerState({
				...this,
				undoStack,
				redoStack,
			}),
			commands,
		];
	}

	redo(): [EditHistoryManagerState, EditCommand[]] {
		this.markCheckpoint();
		const commands = [];
		const undoStack = [...this.undoStack];
		const redoStack = [...this.redoStack];

		do {
			const nextCommand = redoStack.pop();
			if (nextCommand === undefined) break;
			commands.push(nextCommand.command);
			undoStack.push(nextCommand);
		} while (!undoStack.at(-1)?.isCheckPoint);

		return [
			new EditHistoryManagerState({
				...this,
				undoStack,
				redoStack,
			}),
			commands,
		];
	}
}

export class EditHistoryManager extends Stateful<EditHistoryManagerState> {
	static readonly Key = ComponentKey.of(EditHistoryManager);

	constructor() {
		super(new EditHistoryManagerState());
	}

	/**
	 * コマンドを実行して履歴に追加する
	 * @param command
	 */
	execute(command: EditCommand): void {
		command.do();
		this.updateState((state) =>
			state.addUndoEntry({ command, isCheckPoint: false }),
		);
	}

	/**
	 * 現在の履歴地点をundo可能なcheckpointとしてマークする
	 */
	markCheckpoint(): void {
		this.updateState((state) => state.markCheckpoint());
	}

	/**
	 *  元に戻す
	 */
	undo(): void {
		this.markCheckpoint();

		const [state, commands] = this.state.undo();
		for (const command of commands) {
			command.undo();
		}
		this.setState(state);
	}

	/**
	 * やり直す
	 */
	redo(): void {
		this.markCheckpoint();

		const [state, commands] = this.state.redo();
		for (const command of commands) {
			command.do();
		}
		this.setState(state);
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
