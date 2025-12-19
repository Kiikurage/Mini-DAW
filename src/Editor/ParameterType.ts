import { ControlType } from "../models/ControlType.ts";

export const VelocityParameterType = {
	type: "velocity",
	label: "Velocity",
} as const;
export type VelocityParametrType = typeof VelocityParameterType;

export interface ControlChangeParametrType {
	type: "controlChange";
	label: string;
	controlType: ControlType;
}
export type ParameterType = VelocityParametrType | ControlChangeParametrType;

export const ParameterType = [
	VelocityParameterType,
	{
		type: "controlChange",
		label: "Pitch Bend",
		controlType: ControlType.PITCH_BEND,
	},
	{
		type: "controlChange",
		label: "Pan",
		controlType: ControlType.PAN,
	},
] as const satisfies ParameterType[];
