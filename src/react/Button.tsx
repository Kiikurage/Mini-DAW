import type { ComponentProps } from "react";
import { css, cx } from "../../styled-system/css";
import { styled } from "../../styled-system/jsx";
import { flex } from "../../styled-system/patterns";

const ButtonVariantStyles = {
	normal: css({
		background: "none",
		color: "var(--color-foreground)",
		border: "1px solid var(--color-gray-600)",
		transition: "background 100ms ease",
		"&:hover": {
			background: "var(--color-background-hover)",
			transition: "background 0s",
		},
		"&:active": {
			background: "var(--color-background-active)",
			transition: "background 0s",
		},
		"&[aria-pressed='true']": {
			color: "var(--color-background-active)",
			transition: "background 0s",
		},
	}),
	normalInline: css({
		background: "none",
		color: "var(--color-foreground)",
		transition: "background 100ms ease",
		"&:hover:not([aria-pressed='true'])": {
			background: "var(--color-background-hover)",
			transition: "background 0s",
		},
		"&:active:not([aria-pressed='true'])": {
			background: "var(--color-background-active)",
			transition: "background 0s",
		},
		"&[aria-pressed='true']": {
			background: "var(--color-gray-800)",
			transition: "background 0s",
		},
	}),
	primary: css({
		background: "var(--color-primary-background)",
		border: "1px solid var(--color-primary-600)",
		color: "var(--color-primary-foreground)",
		transition: "background 100ms ease",
		"&:hover": {
			background: "var(--color-primary-background-hover)",
			transition: "background 0s",
		},
		"&:active, &[aria-pressed='true']": {
			background: "var(--color-primary-background-active)",
			transition: "background 0s",
		},
	}),
	primaryInline: css({
		background: "none",
		color: "var(--color-primary-foreground)",
		transition: "background 100ms ease",
		"&:hover": {
			background: "var(--color-primary-background-hover)",
			transition: "background 0s",
		},
		"&:active": {
			background: "var(--color-primary-background-active)",
			transition: "background 0s",
		},
		"&[aria-pressed='true']": {
			color: "var(--color-primary-background-active)",
			transition: "background 0s",
		},
	}),
	error: css({
		background: "var(--color-error-background)",
		color: "var(--color-error-foreground)",
		transition: "background 100ms ease",
		"&:hover": {
			background: "var(--color-error-background-hover)",
			transition: "background 0s",
		},
		"&:active, &[aria-pressed='true']": {
			background: "var(--color-error-background-active)",
			transition: "background 0s",
		},
	}),
	errorInline: css({
		background: "none",
		color: "var(--color-error-foreground)",
		transition: "background 100ms ease",
		"&:hover": {
			background: "var(--color-error-background-hover)",
			transition: "background 0s",
		},
		"&:active": {
			background: "var(--color-error-background-active)",
			transition: "background 0s",
		},
		"&[aria-pressed='true']": {
			color: "var(--color-error-background-active)",
			transition: "background 0s",
		},
	}),
} as const satisfies Record<string, string>;

const SizeStyles = {
	sm: css({
		minWidth: "24px",
		minHeight: "24px",
	}),
	md: css({
		minWidth: "32px",
		minHeight: "32px",
	}),
	lg: css({
		minWidth: "40px",
		minHeight: "40px",
	}),
} as const satisfies Record<string, string>;

export function Button({
	variant = "normal",
	size = "md",
	...props
}: {
	variant?: keyof typeof ButtonVariantStyles;
	size?: keyof typeof SizeStyles;
} & ComponentProps<"button">) {
	return (
		<styled.button
			{...props}
			className={cx(
				ButtonVariantStyles[variant],
				SizeStyles[size],
				flex({
					direction: "row",
					alignItems: "center",
					justifyContent: "center",
					gap: 8,
				}),
				css({
					border: "none",
					padding: "0 8px",
					borderRadius: "4px",
					cursor: "pointer",
					outline: "none",

					"&[disabled]": {
						opacity: 0.3,
						pointerEvents: "none",
					},
					"&:focus-visible": {
						outline: "2px solid var(--color-primary-500)",
					},
				}),
				props.className,
			)}
		/>
	);
}
