import { ComponentKey } from "../../Dependency/DIContainer.ts";
import { Stateful } from "../../Stateful/Stateful.ts";
import type { SetNoteParameter } from "../../usecases/SetNoteParameter.ts";
import { ParameterEditorState } from "./ParameterEditorState.ts";

export class ParameterEditor extends Stateful<ParameterEditorState> {
	static readonly Key = ComponentKey.of(ParameterEditor);

	/**
	 * ノートおよび選択範囲に対する当たり判定のマージン（ピクセル単位）
	 */
	static readonly HIT_TEST_MARGIN_PIXEL = 8;

	constructor(private readonly setNoteParameter: SetNoteParameter) {
		super(new ParameterEditorState());
	}

	handleSetNoteParameter(
		channelId: number,
		noteIds: Iterable<number>,
		parameter: string,
		value: number,
	) {
		this.setNoteParameter(channelId, noteIds, parameter, value);
	}

	setCursor(cursor: string) {
		this.updateState((state) => state.setCursor(cursor));
	}

	setHeight(height: number) {
		this.updateState((state) => state.setHeight(height));
	}

	setMarqueeAreaFrom(tick: number) {
		this.updateState((state) => state.setMarqueeAreaFrom(tick));
	}

	setMarqueeAreaTo(tick: number) {
		this.updateState((state) => state.setMarqueeAreaTo(tick));
	}

	clearMarqueeArea() {
		this.updateState((state) => state.clearMarqueeArea());
	}
}
