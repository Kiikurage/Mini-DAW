import styled, { type CSSObject } from "@emotion/styled";
import type { ReactNode } from "react";

const FormRow = styled.div({
	display: "flex",
	flexDirection: "row",
	gap: "8px",
	alignItems: "center",
	justifyContent: "flex-start",
	margin: 0,
});

function FormField({
	label,
	children,
	flex,
	css,
}: {
	label: string;
	children: ReactNode;
	flex?: boolean;
	css?: CSSObject;
}) {
	return (
		<div
			css={[
				{
					position: "relative",
					display: "flex",
					flexDirection: "column",
					alignItems: "stretch",
					justifyContent: "flex-start",
					maxWidth: "100%",
				},
				flex && {
					flex: "1 1 0",
					minWidth: 0,
				},
				css,
			]}
		>
			<div css={{ margin: "0 0 4px", fontSize: "0.875em", userSelect: "none" }}>
				{label}
			</div>
			{children}
		</div>
	);
}

export const Form = Object.assign(
	styled.form({
		display: "flex",
		flexDirection: "column",
		alignItems: "stretch",
		justifyContent: "flex-start",
		gap: "16px",
	}),
	{
		Row: FormRow,
		Field: FormField,
	},
);
