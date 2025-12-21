import type { CSSObject } from "@emotion/styled";

export const BoxShadowStyleBase: CSSObject = {
	boxShadow:
		"rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px",
};

export const ListBoxItemStyleBase: CSSObject = {
	color: "var(--color-foreground)",
	background: "var(--color-background-weak)",
	position: "relative",
	display: "flex",
	flexDirection: "row",
	alignItems: "center",
	justifyContent: "flex-start",
	padding: "4px 16px",
	borderRadius: 4,
	outline: "2px solid transparent",
	outlineOffset: -2,
	cursor: "pointer",
	whiteSpace: "nowrap",
	overflow: "clip",
	textOverflow: "ellipsis",
	userSelect: "none",
	gap: 8,
	minHeight: 30,
	width: "100%",
	boxSizing: "border-box",
	border: "none",
	textAlign: "left",

	"&:hover": {
		background: "var(--color-background-hover-weak)",
	},

	// aria-activedescendantを参照したいが、
	// CSSだけでは解決するのが難しいためJSでdata属性を付与している
	"&[data-focused='true']": {
		outline: "2px solid var(--color-primary-500)",
	},

	"&[aria-selected='true']": {
		background: "var(--color-primary-200)",
	},
};

export const UIControlStyleBase: CSSObject = {
	color: "var(--color-foreground)",
	border: "1px solid var(--color-gray-600)",
	background: "var(--color-background-weak)",
	borderRadius: 4,
	margin: 0,
	minHeight: "32px",
	padding: "8px 8px",
	boxSizing: "border-box",

	"&:focus": {
		outline: "2px solid var(--color-primary-500)",
		outlineOffset: -2,
	},
};

export const ListBoxStyleBase: CSSObject = {
	position: "relative",
	minWidth: 120,
	maxHeight: "100%",
	overflow: "auto",
	boxSizing: "border-box",
	flex: "1 1 auto",
};
