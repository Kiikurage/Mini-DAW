import type { MouseEventButton } from "../constants.ts";
import type { PositionSnapshot } from "./PositionSnapshot.ts";

export interface PointerEventManagerEvent {
	readonly position: PositionSnapshot;
	readonly button: MouseEventButton;
	readonly metaKey: boolean;

	addDragStartSessionListener(
		listener: (ev: PointerEventManagerEvent) => void,
	): () => void;

	addDragMoveSessionListener(
		listener: (ev: PointerEventManagerEvent) => void,
	): () => void;

	addDragEndSessionListener(
		listener: (ev: PointerEventManagerEvent) => void,
	): () => void;

	addPointerUpSessionListener(
		listener: (ev: PointerEventManagerEvent) => void,
	): () => void;

	addTapSessionListener(
		listener: (ev: PointerEventManagerEvent) => void,
	): () => void;
}
