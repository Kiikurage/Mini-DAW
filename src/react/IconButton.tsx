import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { css, cx } from "../../styled-system/css";
import { Button } from "./Button.tsx";

const SizeVariants = {
	sm: css({
		"&> svg": {
			fontSize: "20px",
		},
	}),
	md: css({
		"&> svg": {
			fontSize: "28px",
		},
	}),
	lg: css({
		"&> svg": {
			fontSize: "36px",
		},
	}),
} as const satisfies Record<string, string>;

export function IconButton({
	size = "md",
	...props
}: {
	size?: keyof typeof SizeVariants;
} & ComponentProps<typeof Button>) {
	return (
		<Button
			{...props}
			className={cx(
				css({
					padding: "2px 2px",
				}),
				SizeVariants[size],
			)}
		/>
	);
}
