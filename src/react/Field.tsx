import { type ReactNode, useContext } from "react";
import { FlexLayout } from "./Styles.ts";

export function Field({
	label,
	children,
	htmlFor,
}: {
	label: ReactNode;
	children?: ReactNode;
	htmlFor?: string;
}) {
	return (
		<div
			css={[
				FlexLayout.column.stretch.start,
				{
					position: "relative",
					flex: "1 1 0",
				},
			]}
		>
			<label
				css={{ margin: "0 0 4px", fontSize: "0.875em", userSelect: "none" }}
				htmlFor={htmlFor}
			>
				{label}
			</label>
			{children}
		</div>
	);
}
