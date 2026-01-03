import { Stateful } from "../../Stateful/Stateful.ts";
import { type ParameterType, VelocityParameterType } from "../ParameterType.ts";

export interface ParameterEditorState {
	/**
	 * 幅 [px]
	 */
	readonly width: number;

	/**
	 * 高さ [px]
	 */
	readonly height: number;

	/**
	 * 現在のカーソル状態
	 */
	readonly cursor: string;

	/**
	 * 現在表示しているパラメータの種類
	 */
	readonly parameterType: ParameterType;

	/**
	 * 現在のツールモード
	 */
	readonly toolMode: "select" | "draw";
}

export class ParameterEditor extends Stateful<ParameterEditorState> {
	static readonly ToolMode = {
		Select: "select",
		Draw: "draw",
	} as const;

	constructor() {
		super({
			width: 0,
			height: 0,
			cursor: "default",
			parameterType: VelocityParameterType,
			toolMode: ParameterEditor.ToolMode.Select,
		});
	}

	setToolMode(toolMode: ParameterEditor.ToolMode) {
		this.updateState((state) => {
			if (state.toolMode === toolMode) return state;
			return { ...state, toolMode };
		});
	}

	setWidth(width: number) {
		this.updateState((state) => {
			if (state.width === width) return state;
			return { ...state, width };
		});
	}

	setHeight(height: number) {
		this.updateState((state) => {
			if (state.height === height) return state;
			return { ...state, height };
		});
	}

	setParameterType(parameterType: ParameterType) {
		this.updateState((state) => {
			if (state.parameterType === parameterType) return state;
			return { ...state, parameterType };
		});
	}
}

export namespace ParameterEditor {
	export type ToolMode =
		(typeof ParameterEditor.ToolMode)[keyof typeof ParameterEditor.ToolMode];
}
