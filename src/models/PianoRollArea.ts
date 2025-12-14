export interface PianoRollArea {
	keyFrom: number;

	/**
	 * 選択範囲のキー上限(指定されたキーを含まない)
	 */
	keyTo: number;

	tickFrom: number;
	tickTo: number;
}
