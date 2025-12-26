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
			value={value.toString()}
			onChange={(option) => {
				setUncontrolledValue(Number.parseInt(option.id, 10));
				onChange?.(Number.parseInt(option.id, 10));
			}}
			options={presetNames.map((preset) => ({
				label: `${preset.presetNumber}: ${preset.name}`,
				id: preset.presetNumber.toString(),
			}))}
		/>
	);
}
