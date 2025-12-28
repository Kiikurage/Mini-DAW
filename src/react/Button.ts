import type { CSSObject } from "@emotion/styled";
import styled from "@emotion/styled";
import { FlexLayout } from "./Styles.ts";

export const ButtonVariantStyles = {
	normal: {
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
	},
	normalInline: {
		background: "none",
		color: "var(--color-foreground)",
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
	},
	primary: {
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
	},
	primaryInline: {
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
	},
	error: {
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
	},
	errorInline: {
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
	},
} as const satisfies Record<string, CSSObject>;

const SizeStyles = {
	sm: {
		minWidth: "24px",
		minHeight: "24px",
	},
	md: {
		minWidth: "32px",
		minHeight: "32px",
	},
	lg: {
		minWidth: "40px",
		minHeight: "40px",
	},
} as const satisfies Record<string, CSSObject>;

export const Button = styled.button<{
	variant?: keyof typeof ButtonVariantStyles;
	size?: keyof typeof SizeStyles;
}>(
	FlexLayout.row.center.center.gap(8),
	{
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
		"&[aria-pressed='false']": {
			opacity: 0.3,
		},
	},
	({ variant = "normal" }) => ButtonVariantStyles[variant],
	({ size = "md" }) => SizeStyles[size],
);
