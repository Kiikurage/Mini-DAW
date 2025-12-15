/**
 * Canvas Element上の位置情報のスナップショットを表すインターフェース。
 */
export interface PositionSnapshot {
	/**
	 * Canvas Element上のx座標 [px]。スクロール量やズームを考慮しない。
	 */
	readonly x: number;

	/**
	 * Canvas Element上のy座標 [px]。スクロール量やズームを考慮しない。
	 */
	readonly y: number;
}
