import type { CanvasUIDoubleClickEvent } from "./CanvasUIDoubleClickEvent.ts";
import type { CanvasUIPointerEvent } from "./CanvasUIPointerEvent.ts";

export interface CanvasUIPointerInteractionHandle {
	cursor: string;
	handlePointerDown?: (ev: CanvasUIPointerEvent) => void;
	handlePointerUp?: (ev: CanvasUIPointerEvent) => void;
	handleDragStart?: (ev: CanvasUIPointerEvent) => void;
	handleDragMove?: (ev: CanvasUIPointerEvent) => void;
	handleDragEnd?: (ev: CanvasUIPointerEvent) => void;
	handleTap?: (ev: CanvasUIPointerEvent) => void;
	handleDoubleClick?: (ev: CanvasUIDoubleClickEvent) => void;
}
