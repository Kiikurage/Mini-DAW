export class ParameterEditorState {
	/**
	 * 高さ [px]
	 */
	readonly height: number;

	/**
	 * 現在のカーソル状態
	 */
	readonly cursor: string;

	/**
	 * 範囲選択マーキーの開始位置 [tick]
	 */
	readonly marqueeAreaFrom: number | null = null;

	/**
	 * 範囲選択マーキーの終了位置 [tick]
	 */
	readonly marqueeAreaTo: number | null = null;

	constructor(
		props: {
			height: number;
			cursor: string;
			marqueeAreaFrom: number | null;
			marqueeAreaTo: number | null;
		} = {
			height: 0,
			cursor: "default",
			marqueeAreaFrom: null,
			marqueeAreaTo: null,
		},
	) {
		this.height = props.height;
		this.cursor = props.cursor;
		this.marqueeAreaFrom = props.marqueeAreaFrom;
		this.marqueeAreaTo = props.marqueeAreaTo;
	}

	get marqueeArea() {
		if (this.marqueeAreaFrom === null || this.marqueeAreaTo === null) {
			return null;
		}

		return {
			tickFrom: Math.min(this.marqueeAreaFrom, this.marqueeAreaTo),
			tickTo: Math.max(this.marqueeAreaFrom, this.marqueeAreaTo),
		};
	}

	setHeight(height: number) {
		if (this.height === height) return this;
		return new ParameterEditorState({ ...this, height });
	}

	setMarqueeAreaFrom(marqueeAreaFrom: number) {
		if (this.marqueeAreaFrom === marqueeAreaFrom) return this;

		return new ParameterEditorState({ ...this, marqueeAreaFrom });
	}

	setMarqueeAreaTo(marqueeAreaTo: number) {
		if (this.marqueeAreaTo === marqueeAreaTo) return this;

		return new ParameterEditorState({ ...this, marqueeAreaTo });
	}

	clearMarqueeArea() {
		if (this.marqueeAreaFrom === null && this.marqueeAreaTo === null)
			return this;

		return new ParameterEditorState({
			...this,
			marqueeAreaFrom: null,
			marqueeAreaTo: null,
		});
	}

	setCursor(cursor: string) {
		if (this.cursor === cursor) return this;
		return new ParameterEditorState({ ...this, cursor });
	}
}
