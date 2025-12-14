import type { PointerEventManagerDoubleClickEvent } from "./PointerEventManagerDoubleClickEvent.ts";
import type { PointerEventManagerEvent } from "./PointerEventManagerEvent.ts";

export interface PointerEventManagerInteractionHandle {
	cursor: string;
	handlePointerDown?: (ev: PointerEventManagerEvent) => void;
	handleDoubleClick?: (ev: PointerEventManagerDoubleClickEvent) => void;
}
