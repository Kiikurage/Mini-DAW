import styled from "@emotion/styled";
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
}: {
	label: string;
	children: ReactNode;
	flex?: boolean;
}) {
	return (
		<div
			css={[
				{
					position: "relative",
					display: "block",
					maxWidth: "100%",
				},
				flex && {
					flex: "1 1 0",
					minWidth: 0,
				},
			]}
		>
			<div css={{ margin: "0 0 4px", fontSize: "0.875em", userSelect: "none" }}>
				{label}
			</div>
			<div>{children}</div>
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
