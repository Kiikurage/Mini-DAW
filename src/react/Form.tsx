import styled, { type CSSObject } from "@emotion/styled";
import type { ReactNode } from "react";
import { FlexLayout } from "./Styles.ts";

const FormRow = styled.div([
	FlexLayout.row.center.start.gap(8),
	{
		margin: 0,
	},
]);

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
				FlexLayout.column.stretch.start,
				{
					position: "relative",
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
	styled.form([FlexLayout.column.stretch.start.gap(16)]),
	{
		Row: FormRow,
		Field: FormField,
	},
);
