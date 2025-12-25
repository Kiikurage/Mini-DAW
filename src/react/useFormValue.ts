import { type Dispatch, type SetStateAction, useState } from "react";

export function useFormValue<T>(
	value: T | undefined,
	defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
	const [uncontrolledValue, setUncontrolledValue] = useState(
		value ?? defaultValue,
	);
	return [value ?? uncontrolledValue, setUncontrolledValue] as const;
}
