import { css, cx } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";

// Panda-compatible style bases
export const BoxShadowStyleBase = css({
	boxShadow:
		"rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px",
});

export const ListBoxItemStyleBase = cx(
	flex({ direction: "row", align: "center", justify: "start", gap: 8 }),
	css({
		color: "var(--color-foreground)",
		position: "relative",
		padding: "8px 16px",
		borderRadius: 4,
		outline: "2px solid transparent",
		outlineOffset: -2,
		cursor: "pointer",
		whiteSpace: "nowrap",
		overflow: "clip",
		textOverflow: "ellipsis",
		userSelect: "none",
		minHeight: 30,
		width: "100%",
		boxSizing: "border-box",
		border: "none",
		textAlign: "left",

		"&:hover": {
			background: "var(--color-background-hover-weak)",
		},

		"&:focus": {
			outline: "2px solid var(--color-primary-500)",
		},

		"&[aria-selected='true']": {
			background: "var(--color-primary-200)",
		},
	}),
);

export const UIControlStyleBase = css({
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
});
