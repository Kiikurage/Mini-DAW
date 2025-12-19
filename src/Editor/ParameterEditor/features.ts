import { minmax } from "../../lib.ts";
import type { PositionSnapshot } from "../../PointerEventManager/PositionSnapshot.ts";
import type { EditorState } from "../Editor.ts";
import type { ParameterEditorState } from "./ParameterEditor.ts";
import { SIDEBAR_WIDTH, widthPerTick } from "./ParameterEditorViewRenderer.ts";

export function toParameterEditorPosition(
	position: PositionSnapshot,
	editorState: EditorState,
	parameterEditorState: ParameterEditorState,
): ParameterEditorPosition {
	const x = position.x + editorState.scrollLeft - SIDEBAR_WIDTH;
	const y = position.y;
	const tick = Math.floor(x / widthPerTick(editorState.zoom));
	const value = minmax(0, 1, 1 - y / parameterEditorState.height) * 127;

	return { x, y, tick, value };
}

export interface ParameterEditorPosition {
	readonly tick: number;
	readonly value: number;
	readonly x: number;
	readonly y: number;
}
