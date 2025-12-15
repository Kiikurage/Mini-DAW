import type { PointerEventManagerDoubleClickEvent } from "./PointerEventManagerDoubleClickEvent.ts";
import type { PointerEventManagerEvent } from "./PointerEventManagerEvent.ts";
import type { PointerEventManagerPointerMoveEvent } from "./PointerEventManagerPointerMoveEvent.ts";

/**
 * インタラクション可能なHandle
 */
export interface PointerEventManagerInteractionHandle {
	handlePointerMove?: (ev: PointerEventManagerPointerMoveEvent) => void;
	handlePointerDown?: (ev: PointerEventManagerEvent) => void;
	handleDoubleClick?: (ev: PointerEventManagerDoubleClickEvent) => void;
}

/**
 * InteractionHandleを合成する。Handleは指定された順番に呼び出される。
 * @param handles 合成するInteractionHandle
 */
export function composeInteractionHandle(
	...handles: readonly PointerEventManagerInteractionHandle[]
): PointerEventManagerInteractionHandle {
	return {
		handlePointerMove: (ev: PointerEventManagerPointerMoveEvent) => {
			for (const handle of handles) {
				handle.handlePointerMove?.(ev);
			}
		},
		handlePointerDown: (ev: PointerEventManagerEvent) => {
			for (const handle of handles) {
				handle.handlePointerDown?.(ev);
			}
		},
		handleDoubleClick: (ev: PointerEventManagerDoubleClickEvent) => {
			for (const handle of handles) {
				handle.handleDoubleClick?.(ev);
			}
		},
	};
}
