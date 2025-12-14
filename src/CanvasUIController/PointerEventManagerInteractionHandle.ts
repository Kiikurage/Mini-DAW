import type { PointerEventManagerDoubleClickEvent } from "./PointerEventManagerDoubleClickEvent.ts";
import type { PointerEventManagerEvent } from "./PointerEventManagerEvent.ts";

export interface PointerEventManagerInteractionHandle {
	cursor: string;
	handlePointerDown?: (ev: PointerEventManagerEvent) => void;
	handlePointerUp?: (ev: PointerEventManagerEvent) => void;
	handleDragStart?: (ev: PointerEventManagerEvent) => void;
	handleDragMove?: (ev: PointerEventManagerEvent) => void;
	handleDragEnd?: (ev: PointerEventManagerEvent) => void;
	handleTap?: (ev: PointerEventManagerEvent) => void;
	handleDoubleClick?: (ev: PointerEventManagerDoubleClickEvent) => void;
}
