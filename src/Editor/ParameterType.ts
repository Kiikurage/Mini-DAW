import { ControlType } from "../models/ControlType.ts";

export const VelocityParameterType = {
	type: "velocity",
	label: "Velocity",
} as const;
export type VelocityParametrType = typeof VelocityParameterType;

export interface CCParametrType {
	type: "cc";
	label: string;
	controlType: ControlType;
}
export type ParameterType = VelocityParametrType | CCParametrType;

export const ParameterType = [
	VelocityParameterType,
	{
		type: "cc",
		label: "Pitch Bend",
		controlType: ControlType.PITCH_BEND,
	},
	{
		type: "cc",
		label: "Pan",
		controlType: ControlType.PAN,
	},
] as const satisfies ParameterType[];
