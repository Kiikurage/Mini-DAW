import styled from "@emotion/styled";
import { type ComponentProps, useId } from "react";
import { Field } from "./Field.tsx";
import { UIControlStyleBase } from "./Styles.ts";

export const Input = styled.input([
	UIControlStyleBase,
	{
		minWidth: "128px",
		display: "block",
		flex: "1 1 auto",
		outline: "2px solid transparent",
		outlineOffset: -2,

		"&:hover": {
			background: "var(--color-background-hover-weak)",
		},

		"&:active": {
			background: "var(--color-background-hover)",
		},

		"&:focus": {
			background: "var(--color-background-hover-weak)",
			outline: "2px solid var(--color-primary-500)",
		},
	},
]);

export function InputField({
	label,
	inputProps,
}: {
	label: string;
	inputProps?: ComponentProps<typeof Input>;
}) {
	const fieldId = useId();
	return (
		<Field label={label} htmlFor={fieldId}>
			<Input {...inputProps} id={fieldId} />
		</Field>
	);
}
