import { useState } from "react";
import { Select } from "../react/Select/Select.tsx";
import type { IndexedPresetHeader, SoundFont } from "../SoundFont/SoundFont.ts";

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
		soundFont.getPresetNames().find((preset) => preset.number === presetNumber)
			?.bankMap ?? new Map<number, IndexedPresetHeader>();

	const presets = [...bankMap.values()].sort(
		(a, b) => a.phdr.bank - b.phdr.bank,
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

				return `${preset.phdr.bank}: ${preset.phdr.name}`;
			}}
		>
			{presets.map((preset) => (
				<Select.Option key={preset.phdr.bank} value={preset.phdr.bank}>
					{preset.phdr.bank}: {preset.phdr.name}
				</Select.Option>
			))}
		</Select>
	);
}
