import { useState } from "react";
import { Select } from "../react/Select/Select.tsx";
import type { SoundFont } from "../SoundFont/SoundFont.ts";

export function PresetSelect({
	value: controlledValue,
	defaultValue,
	soundFont,
	onChange,
}: {
	value?: number;
	defaultValue?: number;
	soundFont: SoundFont;
	onChange?: (presetNumber: number) => void;
}) {
	const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? 0);
	const value = controlledValue ?? uncontrolledValue;

	const presetNames = soundFont.getPresetNames();

	return (
		<Select
			value={value}
			onChange={(value) => {
				setUncontrolledValue(value as number);
				onChange?.(value as number);
			}}
			renderValue={() => {
				const presetName = presetNames.find(
					(preset) => preset.presetNumber === value,
				);
				if (presetName === undefined) return "#N/A";

				return `${presetName.presetNumber}: ${presetName.name}`;
			}}
		>
			{presetNames.map((preset) => (
				<Select.Option key={preset.presetNumber} value={preset.presetNumber}>
					{preset.presetNumber}: {preset.name}
				</Select.Option>
			))}
		</Select>
	);
}
