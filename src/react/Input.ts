import styled from "@emotion/styled";

export const Input = styled.input({
	background: "var(--color-background-hover)",
	border: "1px solid var(--color-gray-800)",
	color: "var(--color-foreground)",
	padding: "0 8px",
	borderRadius: "4px",
	minWidth: "128px",
	minHeight: "32px",
	display: "block",
	flex: "1 1 auto",

	"&:hover": {
		background: "var(--color-background-hover)",
	},

	"&:active": {
		background: "var(--color-background-active)",
	},

	"&:focus": {
		background: "var(--color-background-focus)",
	},
});
