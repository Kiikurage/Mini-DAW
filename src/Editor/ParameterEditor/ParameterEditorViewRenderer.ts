import { TICK_PER_MEASURE } from "../../constants.ts";

export function widthPerMeasure(zoom: number) {
	return 180 * zoom;
}

export function widthPerTick(zoom: number) {
	return widthPerMeasure(zoom) / TICK_PER_MEASURE;
}

export const SIDEBAR_WIDTH = 32;
