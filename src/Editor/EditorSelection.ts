/**
 * 何も選択していない状態
 */
const VoidSelection = {
	type: "void",
} as const;
export type VoidSelection = typeof VoidSelection;

/**
 * ノートが選択されている状態
 */
export interface NoteSelection {
	type: "note";
	noteIds: ReadonlySet<number>;
}

/**
 * コントロールチェンジの特定の位置が選択されている状態
 */
export interface ControlChangeSelection {
	type: "control";
	controlType: number;
	ticks: ReadonlySet<number>;
}

export type EditorSelection =
	| VoidSelection
	| NoteSelection
	| ControlChangeSelection;

export const EditorSelection = {
	void: VoidSelection,
} as const;
