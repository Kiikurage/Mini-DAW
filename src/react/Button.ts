import type { CSSObject } from "@emotion/styled";
import styled from "@emotion/styled";

const VariantStyles = {
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
	variant?: keyof typeof VariantStyles;
	size?: keyof typeof SizeStyles;
}>(
	{
		border: "none",
		padding: "0 8px",
		borderRadius: "4px",
		cursor: "pointer",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		gap: "8px",
		outline: "none",

		"&[disabled]": {
			opacity: 0.3,
			pointerEvents: "none",
		},
		"&:focus-visible": {
			outline: "auto",
		},
		"&[aria-pressed='false']": {
			opacity: 0.3,
		},
	},
	({ variant = "normal" }) => VariantStyles[variant],
	({ size = "md" }) => SizeStyles[size],
);
