import { TICK_PER_MEASURE } from "./constants.ts";

export function isNullish(x: unknown): x is null | undefined {
	return x === null || x === undefined;
}

export function isNotNullish<T>(x: T | null | undefined): x is T {
	return !isNullish(x);
}

export function assertNotNullish<T>(
	value: T | null | undefined,
	message = "Value is null or undefined",
): asserts value is T {
	if (isNullish(value)) {
		throw new Error(message);
	}
}

export function getNonNull<T>(
	value: T | null | undefined,
	message = "Value is null or undefined",
): T {
	assertNotNullish(value, message);
	return value;
}

export function sleep(ms: number) {
	return new Promise<void>((r) => setTimeout(r, ms));
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

export function addListener<K extends keyof WindowEventMap>(
	target: Window,
	type: K,
	listener: (this: Window, ev: WindowEventMap[K]) => void,
	options?: AddEventListenerOptions,
): () => void;
export function addListener<K extends keyof DocumentEventMap>(
	target: Document,
	type: K,
	listener: (this: Document, ev: DocumentEventMap[K]) => void,
	options?: AddEventListenerOptions,
): () => void;
export function addListener<
	E extends SVGElement,
	K extends keyof SVGElementEventMap,
>(
	target: E,
	type: K,
	listener: (this: E, ev: SVGElementEventMap[K]) => void,
	options?: AddEventListenerOptions,
): () => void;
export function addListener<
	E extends HTMLElement,
	K extends keyof HTMLElementEventMap,
>(
	target: E,
	type: K,
	listener: (this: E, ev: HTMLElementEventMap[K]) => void,
	options?: AddEventListenerOptions,
): () => void;
export function addListener(
	target: EventTarget,
	type: string,
	listener: EventListenerOrEventListenerObject,
	options?: AddEventListenerOptions,
) {
	target.addEventListener(type, listener, options);
	return () => target.removeEventListener(type, listener, options);
}

export const EmptyArray: readonly never[] = [];
export const EmptySet: ReadonlySet<never> = new Set<never>();
export const EmptyMap: ReadonlyMap<never, never> = new Map<never, never>();
export const NoOp: (...args: never[]) => void = () => {};

export function toSet<T>(iterable: Iterable<T>): ReadonlySet<T> {
	if (iterable instanceof Set) {
		return iterable;
	} else {
		return new Set(iterable);
	}
}

export function toMutableSet<T>(iterable: Iterable<T>): Set<T> {
	return new Set(iterable);
}

export function toMutableMap<K, V>(map: ReadonlyMap<K, V>): Map<K, V> {
	return new Map(map);
}

export function toMutableArray<T>(array: readonly T[]): T[] {
	return array.slice();
}

export function formatTimestamp(timestamp: number): string {
	return formatDate(new Date(timestamp));
}

export function formatDate(date: Date): string {
	const YYYY = date.getFullYear();
	const MM = String(date.getMonth() + 1).padStart(2, "0");
	const DD = String(date.getDate()).padStart(2, "0");
	const hh = String(date.getHours()).padStart(2, "0");
	const mm = String(date.getMinutes()).padStart(2, "0");

	return `${YYYY}/${MM}/${DD} ${hh}:${mm}`;
}

export function neverReachable(x: never): never {
	throw new Error(`This code should never be reachable. (${x})`);
}

export function randomId(length: number): string {
	return "x"
		.repeat(length)
		.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
}

/**
 * ブランド付き型のブランドシンボル
 *
 * @example
 *
 * type NoteKey = number & { [Brand]: 'NoteKey' };
 */
const Brand = Symbol("Brand");

export type Branded<T, B extends string> = T & { [Brand]: B };
