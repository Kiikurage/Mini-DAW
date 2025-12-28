export const KEY_PER_OCTAVE = 12;
export const NUM_KEYS = 128;
export const TICK_PER_MEASURE = 1920;
export const TICK_PER_BEAT = TICK_PER_MEASURE / 4;

export const MouseEventButton = {
	PRIMARY: 0,
	MIDDLE: 1,
	AUXILIARY: 2,
} as const;
export type MouseEventButton =
	| (typeof MouseEventButton)[keyof typeof MouseEventButton]
	| number;
