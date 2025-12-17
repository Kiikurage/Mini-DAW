import { ControlType } from "../models/ControlType.ts";

interface VelocityParametrType {
	type: "velocity";
	label: string;
}
interface ControlChangeParametrType {
	type: "controlChange";
	label: string;
	controlType: ControlType;
}
export type ParameterType = VelocityParametrType | ControlChangeParametrType;

export const ParameterType = [
	{ type: "velocity", label: "Velocity" },
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
