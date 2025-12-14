import type { MouseEventButton } from "../constants.ts";
import type { PositionSnapshot } from "./PositionSnapshot.ts";

export interface PointerEventManagerDoubleClickEvent {
	readonly position: PositionSnapshot;
	readonly button: MouseEventButton;
	readonly metaKey: boolean;
}
