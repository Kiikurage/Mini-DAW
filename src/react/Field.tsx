import type { ReactNode } from "react";
import { css, cx } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";

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
			className={cx(
				flex({
					direction: "column",
					alignItems: "stretch",
					justifyContent: "start",
				}),
				css({
					flex: "1 1 auto",
					minWidth: 0,
				}),
			)}
		>
			<label
				className={css({
					margin: "0 0 4px",
					fontSize: "0.875em",
					userSelect: "none",
				})}
				htmlFor={htmlFor}
			>
				{label}
			</label>
			{children}
		</div>
	);
}
