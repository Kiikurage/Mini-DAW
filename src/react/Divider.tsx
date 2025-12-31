import type { ComponentProps, HTMLAttributes } from "react";
import { css, cx } from "../../styled-system/css";
import { styled } from "../../styled-system/jsx";

export function Divider(props: ComponentProps<"hr">) {
	return (
		<styled.hr
			{...props}
			className={cx(
				css({
					display: "block",
					width: "100%",
					border: "none",
					margin: "16px 0",
					borderBottom: "1px inset var(--color-gray-600)",
					opacity: 0.8,
				}),
				props.className,
			)}
		/>
	);
}
