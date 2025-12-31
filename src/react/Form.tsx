import type { ComponentProps } from "react";
import { css, cx } from "../../styled-system/css";
import { styled } from "../../styled-system/jsx";
import { flex } from "../../styled-system/patterns";

export function FormRow(props: ComponentProps<"div">) {
	return (
		<styled.div
			{...props}
			className={cx(
				flex({
					direction: "row",
					alignItems: "center",
					justifyContent: "start",
					gap: 8,
				}),
				css({
					margin: 0,
				}),
				props.className,
			)}
		/>
	);
}
