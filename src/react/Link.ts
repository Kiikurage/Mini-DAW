import styled from "@emotion/styled";

export const Link = styled.a({
	display: "inline-flex",
	flexDirection: "row",
	alignItems: "center",
	justifyContent: "center",
	gap: 4,
	color: "var(--color-primary-800)",

	"&:visited": {
		color: "var(--color-primary-400)",
	},
});
