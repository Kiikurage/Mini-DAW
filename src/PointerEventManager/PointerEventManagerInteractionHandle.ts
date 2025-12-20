import type {
	PEMMouseEvent,
	PEMPointerEvent,
	PEMTapEvent,
} from "./PointerEventManager.ts";

/**
 * インタラクション可能なHandle
 */
export interface PointerEventManagerInteractionHandle {
	handlePointerMove?: (ev: PEMMouseEvent) => void;
	handlePointerDown?: (ev: PEMPointerEvent) => void;
	handleDoubleClick?: (ev: PEMTapEvent) => void;
}

/**
 * InteractionHandleを合成する。Handleは指定された順番に呼び出される。
 * @param handles 合成するInteractionHandle
 */
export function composeInteractionHandle(
	...handles: readonly PointerEventManagerInteractionHandle[]
): PointerEventManagerInteractionHandle {
	return {
		handlePointerMove: (ev: PEMMouseEvent) => {
			for (const handle of handles) {
				handle.handlePointerMove?.(ev);
			}
		},
		handlePointerDown: (ev: PEMPointerEvent) => {
			for (const handle of handles) {
				handle.handlePointerDown?.(ev);
			}
		},
		handleDoubleClick: (ev: PEMTapEvent) => {
			for (const handle of handles) {
				handle.handleDoubleClick?.(ev);
			}
		},
	};
}
