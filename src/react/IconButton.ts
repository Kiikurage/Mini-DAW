import type { CSSObject } from "@emotion/styled";
import styled from "@emotion/styled";
import { Button } from "./Button.ts";

const SizeVariants = {
	sm: {
		"> svg": {
			fontSize: "20px",
		},
	},
	md: {
		"> svg": {
			fontSize: "28px",
		},
	},
	lg: {
		"> svg": {
			fontSize: "36px",
		},
	},
} as const satisfies Record<string, CSSObject>;

export const IconButton = styled(Button)(
	({ size = "md" }: { size?: keyof typeof SizeVariants }) => ({
		padding: "2px 2px",

		...SizeVariants[size],
	}),
);
