import type { ComponentProps } from "react";
import { css, cx } from "../../styled-system/css";
import { styled } from "../../styled-system/jsx";

export function Link(props: ComponentProps<"a">) {
	return (
		<styled.a
			{...props}
			className={cx(
				css({
					display: "inline-flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
					gap: 4,
					color: "var(--color-primary-800)",

					"&:visited": {
						color: "var(--color-primary-400)",
					},
				}),
				props.className,
			)}
		/>
	);
}
