/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import type { ReactNode } from "react";
import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { OverlayPortal } from "../react/OverlayPortal.ts";
import { ContextMenu } from "./ContextMenu.tsx";

export interface ContextMenuActionItem {
	readonly type: "action";
	readonly label: string;
	readonly iconBefore?: ReactNode;
	readonly subMenuItems?: readonly ContextMenuItem[];
	readonly onClick?: () => void;
}

export interface ContextMenuSeparatorItem {
	readonly type: "separator";
}

export type ContextMenuItem = ContextMenuActionItem | ContextMenuSeparatorItem;

export class ContextMenuManager {
	static readonly Key = ComponentKey.of(ContextMenuManager);

	private closeHandle: (() => void) | null = null;

	constructor(private readonly overlayPortal: OverlayPortal) {}

	open({
		items,
		clientTop,
		clientLeft,
		onClose,
	}: {
		items: readonly ContextMenuItem[];
		clientTop: number;
		clientLeft: number;
		onClose?: () => void;
	}): void {
		this.close();

		const closeHandle = this.overlayPortal.show(() => (
			<ContextMenu
				clientLeft={clientLeft}
				clientTop={clientTop}
				onOutsidePointerDown={() => this.close()}
			>
				{items.map((item, index) => {
					switch (item.type) {
						case "action":
							return (
								<ContextMenu.Item
									key={index}
									iconBefore={item.iconBefore}
									onClick={() => {
										item.onClick?.();
										this.close();
									}}
								>
									{item.label}
								</ContextMenu.Item>
							);
						case "separator":
							return <ContextMenu.Separator key={index} />;
					}
					return null;
				})}
			</ContextMenu>
		));

		this.closeHandle = () => {
			closeHandle();
			onClose?.();
		};
	}

	close(): void {
		this.closeHandle?.();
		this.closeHandle = null;
	}
}
