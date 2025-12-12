import type { MouseEventButton } from "../constants.ts";
import type { CanvasUIPosition } from "./CanvasUIPosition.ts";

export interface CanvasUIDoubleClickEvent {
	readonly position: CanvasUIPosition;
	readonly button: MouseEventButton;
	readonly metaKey: boolean;
}
