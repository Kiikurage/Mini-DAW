export const ControlType = {
	PITCH_BEND: 0,
	PAN: 1,
} as const;

export const ControlTypeInitialValues: Record<ControlType, number> = {
	[ControlType.PITCH_BEND]: 64,
	[ControlType.PAN]: 64,
};

export type ControlType = (typeof ControlType)[keyof typeof ControlType];
