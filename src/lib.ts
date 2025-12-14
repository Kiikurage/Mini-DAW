import { TICK_PER_MEASURE } from "./constants.ts";

export function isNotNullish<T>(x: T | null | undefined): x is T {
	return x !== null && x !== undefined;
}

export function assertNotNullish<T>(
	value: T | null | undefined,
	message = "Value is null or undefined",
): asserts value is T {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
}

export function assert(
	condition: boolean,
	message = "Assertion failed",
): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

export function minmax(min: number | null, max: number | null, value: number) {
	value = min === null ? value : Math.max(min, value);
	value = max === null ? value : Math.min(max, value);
	return value;
}

export function quantize(value: number, step: number) {
	return Math.round(value / step) * step;
}

export function formatDuration(durationInTick: number) {
	switch (durationInTick) {
		case TICK_PER_MEASURE:
			return "全音符";
		case TICK_PER_MEASURE / 2:
			return "2分音符";
		case TICK_PER_MEASURE / 4:
			return "4分音符";
		case TICK_PER_MEASURE / 8:
			return "8分音符";
		case TICK_PER_MEASURE / 16:
			return "16分音符";
		case TICK_PER_MEASURE / 32:
			return "32分音符";
		case TICK_PER_MEASURE / 64:
			return "64分音符";
		default:
			return `${durationInTick} tick`;
	}
}

export function addListener<
	E extends HTMLElement,
	K extends keyof HTMLElementEventMap,
>(
	target: E,
	type: K,
	listener: (this: E, ev: HTMLElementEventMap[K]) => void,
): () => void;
export function addListener(
	target: EventTarget,
	type: string,
	listener: EventListenerOrEventListenerObject,
) {
	target.addEventListener(type, listener);
	return () => target.removeEventListener(type, listener);
}
