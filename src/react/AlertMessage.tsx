import type { CSSObject } from "@emotion/styled";
import type { ReactNode } from "react";
import { MdCancel, MdCheckCircle } from "react-icons/md";
import { FlexLayout } from "./Styles.ts";

const StyleVariant = {
	error: {
		color: "var(--color-error-1000)",
	},
	success: {
		color: "var(--color-success-1000)",
	},
} as const satisfies Record<string, CSSObject>;

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
			css={[
				FlexLayout.row.center.center.gap(16),
				{
					opacity: 0.6,
				},
				StyleVariant[variant],
			]}
		>
			<Icon css={{ width: 24, height: 24 }} />

			<div css={{ flex: "1 1 0" }}>{children}</div>
		</div>
	);
}
