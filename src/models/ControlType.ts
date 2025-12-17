export const ControlType = {
	PITCH_BEND: 0,
	PAN: 1,
};

export type ControlType = (typeof ControlType)[keyof typeof ControlType];
