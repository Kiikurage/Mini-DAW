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
			value={value.toString()}
			onChange={(option) => {
				setUncontrolledValue(Number.parseInt(option.id, 10));
				onChange?.(Number.parseInt(option.id, 10));
			}}
			options={presets.map((preset) => ({
				label: `${preset.bankNumber}: ${preset.name}`,
				id: preset.bankNumber.toString(),
			}))}
		/>
	);
}
