import type { CCId } from "../models/CC.ts";
import type { NoteId } from "../models/Note.ts";

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
	noteIds: ReadonlySet<NoteId>;
}

/**
 * コントロールチェンジの特定の位置が選択されている状態
 */
export interface CCSelection {
	type: "control";
	controlType: number;
	ids: ReadonlySet<CCId>;
}

export type EditorSelection = VoidSelection | NoteSelection | CCSelection;

export const EditorSelection = {
	void: VoidSelection,
} as const;
