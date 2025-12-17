export interface ParameterEditorSampleDelegate {
	getAllSamples(): Iterable<ParameterSample>;

	getSelectedSamples(): Iterable<ParameterSample>;

	/**
	 * サンプルを更新する
	 * @param sampleIds 更新対象のサンプルIDのリスト
	 * @param value 新しい値 [0, 127]
	 */
	update(sampleIds: Iterable<number>, value: number): void;

	/**
	 * ParameterEditorがタップされたときの処理。
	 * サンプル点や選択範囲がタップされたときは呼ばれない
	 */
	handleTap?(position: { tick: number; value: number }): void;
}

export interface ParameterSample {
	/**
	 * サンプルID
	 */
	id: number;

	/**
	 * ティック位置
	 */
	tick: number;

	/**
	 * 値[0, 127]
	 */
	value: number;
}
