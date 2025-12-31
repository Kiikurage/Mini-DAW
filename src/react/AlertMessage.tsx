import type { ReactNode } from "react";
import { MdCancel, MdCheckCircle } from "react-icons/md";
import { css, cx, type Styles } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";

const StyleVariant = {
	error: {
		color: "var(--color-error-1000)",
	},
	success: {
		color: "var(--color-success-1000)",
	},
} as const satisfies Record<string, Styles>;

const IconVariant = {
	error: MdCancel,
	success: MdCheckCircle,
} as const;

export function AlertMessage({
	variant,
	children,
}: {
	variant: "error" | "success";
	children?: ReactNode;
}) {
	const Icon = IconVariant[variant];

	return (
		<div
			className={cx(
				flex({
					direction: "row",
					alignItems: "center",
					justifyContent: "center",
				}),
				css(
					{
						gap: 16,
						opacity: 0.6,
					},
					StyleVariant[variant],
				),
			)}
		>
			<Icon
				className={css({
					width: 24,
					height: 24,
				})}
			/>

			<div className={css({ flex: "1 1 0" })}>{children}</div>
		</div>
	);
}
