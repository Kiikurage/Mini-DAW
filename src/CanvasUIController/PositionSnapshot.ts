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

	/**
	 * 水平スクロール位置 [px]。
	 */
	readonly scrollLeft: number;

	/**
	 * 垂直スクロール位置 [px]。
	 */
	readonly scrollTop: number;

	/**
	 * Canvas Elementの幅 [px]。
	 */
	readonly width: number;

	/**
	 * Canvas Elementの高さ [px]。
	 */
	readonly height: number;

	/**
	 * 拡大率。
	 */
	readonly zoom: number;
}
