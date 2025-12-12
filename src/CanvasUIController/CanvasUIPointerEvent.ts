import type { MouseEventButton } from "../constants.ts";
import type { CanvasUIPosition } from "./CanvasUIPosition.ts";

export interface CanvasUIPointerEvent {
	readonly position: CanvasUIPosition;
	readonly button: MouseEventButton;
	readonly metaKey: boolean;

	addDragStartSessionListener(
		listener: (ev: CanvasUIPointerEvent) => void,
	): () => void;

	addDragMoveSessionListener(
		listener: (ev: CanvasUIPointerEvent) => void,
	): () => void;

	addDragEndSessionListener(
		listener: (ev: CanvasUIPointerEvent) => void,
	): () => void;

	addPointerUpSessionListener(
		listener: (ev: CanvasUIPointerEvent) => void,
	): () => void;

	addTapSessionListener(
		listener: (ev: CanvasUIPointerEvent) => void,
	): () => void;
}
