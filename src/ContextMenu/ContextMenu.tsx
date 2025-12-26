import type { ReactNode } from "react";
import { FlexLayout } from "../react/Styles.ts";

function ContextMenuItem({
	children,
	iconBefore,
	onClick,
}: {
	children: ReactNode;
	iconBefore?: ReactNode;
	onClick?: () => void;
}) {
	return (
		<li>
			<button
				type="button"
				css={{
					display: "grid",
					gridTemplate: `"icon content" auto / 16px 1fr`,
					alignItems: "center",
					justifyContent: "flex-start",
					textAlign: "left",
					columnGap: "8px",
					userSelect: "none",
					padding: "4px 8px",
					width: "100%",
					minHeight: "16px",
					background: "none",
					border: "none",
					borderRadius: "4px",
					color: "var(--color-foreground)",
					fontSize: "0.875em",
					lineHeight: "1",

					"&:hover": {
						background: "var(--color-primary-200)",
					},
				}}
				onClick={onClick}
			>
				<div
					css={{
						gridArea: "icon",
						position: "relative",
						width: "16px",
						height: "16px",
						flex: "0 0 auto",

						svg: {
							width: "16px",
							height: "16px",
						},
					}}
				>
					{iconBefore}
				</div>
				<div
					css={{
						gridArea: "content",
					}}
				>
					{children}
				</div>
			</button>
		</li>
	);
}

function ContextMenuSeparator() {
	return (
		<li
			css={[
				FlexLayout.row.center.stretch,
				{
					cursor: "pointer",
					pointerEvents: "none",
					userSelect: "none",
					padding: "4px 4px",
					minHeight: "8px",
				},
			]}
		>
			<hr
				css={{
					flex: "1 1 0",
					border: "none",
					borderBottom: "1px solid var(--color-gray-700)",
					margin: 0,
					padding: 0,
					background: "none",
				}}
			/>
		</li>
	);
}

export const ContextMenu = Object.assign(
	function ContextMenu({
		children,
		clientTop,
		clientLeft,
		onOutsidePointerDown,
	}: {
		children: ReactNode;
		clientTop: number;
		clientLeft: number;
		onOutsidePointerDown: () => void;
	}) {
		return (
			<div
				css={{
					position: "fixed",
					inset: 0,
				}}
				onPointerDown={onOutsidePointerDown}
			>
				<ul
					style={{
						top: clientTop,
						left: clientLeft,
					}}
					css={[
						FlexLayout.column.stretch.start,
						{
							borderRadius: "8px",
							overflow: "clip",
							position: "fixed",
							background: "var(--color-background)",
							color: "var(--color-foreground)",
							boxShadow:
								"rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px",
							listStyle: "none",
							margin: 0,
							padding: "6px 6px",
						},
					]}
					onPointerDown={(ev) => {
						ev.stopPropagation();
						ev.preventDefault();
					}}
				>
					{children}
				</ul>
			</div>
		);
	},
	{
		Item: ContextMenuItem,
		Separator: ContextMenuSeparator,
	},
);
