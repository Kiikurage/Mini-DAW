import type { PointerEventManagerInteractionHandle } from "./PointerEventManagerInteractionHandle.ts";
import type { PositionSnapshot } from "./PositionSnapshot.ts";

export interface PointerEventManagerInteractionHandleResolver {
	/**
	 * 座標から、ドラッグハンドルを探す。ハンドルが複数重なっている場合には優先すべきハンドルを解決して返す。
	 */
	resolveHandle(
		position: PositionSnapshot,
	): PointerEventManagerInteractionHandle | null;
}
