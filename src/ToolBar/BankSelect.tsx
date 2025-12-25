import { useState } from "react";
import { EmptyMap } from "../lib.ts";
import { Select } from "../react/Select/Select.tsx";
import type { SoundFont } from "../SoundFont/SoundFont.ts";

export function BankSelect({
	presetNumber,
	soundFont,
	value: controlledValue,
	defaultValue,
	onChange,
}: {
	presetNumber: number;
	soundFont: SoundFont;
	value?: number;
	defaultValue?: number;
	onChange?: (presetNumber: number) => void;
}) {
	const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? 0);
	const value = controlledValue ?? uncontrolledValue;

	const bankMap =
		soundFont
			.getPresetNames()
			.find((preset) => preset.presetNumber === presetNumber)?.bankMap ??
		EmptyMap;

	const presets = [...bankMap.values()].sort(
		(a, b) => a.bankNumber - b.bankNumber,
	);

	return (
		<Select
			value={value}
			onChange={(value) => {
				setUncontrolledValue(value as number);
				onChange?.(value as number);
			}}
			renderValue={(value) => {
				const preset = bankMap.get(value as number);
				if (preset === undefined) return "#N/A";

				return `${preset.bankNumber}: ${preset.name}`;
			}}
		>
			{presets.map((preset) => (
				<Select.Option key={preset.bankNumber} value={preset.bankNumber}>
					{preset.bankNumber}: {preset.name}
				</Select.Option>
			))}
		</Select>
	);
}
