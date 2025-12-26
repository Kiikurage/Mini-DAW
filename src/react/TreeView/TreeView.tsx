import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { FaChevronDown } from "react-icons/fa";
import { useStateful } from "../../Stateful/useStateful.tsx";
import {
	FlexLayout,
	ListBoxItemStyleBase,
	UIControlStyleBase,
} from "../Styles.ts";
import { TreeViewController } from "./TreeViewController.ts";

const context = createContext<TreeViewController>(null as never);

export function TreeView({
	controller: defaultController,
	children,
	onSelect,
}: {
	controller?: TreeViewController;
	children?: ReactNode;
	onSelect?: (id: string) => void;
}) {
	const [controller] = useState(
		() => defaultController ?? new TreeViewController(),
	);
	controller.onSelect = onSelect;

	const isFocusedNothing = useStateful(
		controller,
		(state) => state.focusedItemId === null,
	);

	return (
		<context.Provider value={controller}>
			<div
				css={[
					UIControlStyleBase,
					{
						height: 240,
						width: "100%",
						overflowY: "scroll",
						flex: "1 1 0",
					},
				]}
				role="tree"
				tabIndex={isFocusedNothing ? 0 : -1}
				onKeyDown={(ev) => {
					switch (ev.key) {
						case "ArrowUp": {
							ev.stopPropagation();
							ev.preventDefault();
							controller.focusPrevItem();
							break;
						}
						case "ArrowDown": {
							ev.stopPropagation();
							ev.preventDefault();
							controller.focusNextItem();
							break;
						}
						case "ArrowRight": {
							ev.stopPropagation();
							ev.preventDefault();
							controller.expandFocusedItem();
							break;
						}
						case "ArrowLeft": {
							ev.stopPropagation();
							ev.preventDefault();
							controller.collapseFocusedItem();
							break;
						}
						case "Enter":
						case "Space": {
							controller.selectFocusedItem();
						}
					}
				}}
			>
				{children}
			</div>
		</context.Provider>
	);
}

export namespace TreeView {
	export function Item({
		id,
		depth,
		icon,
		expandable = false,
		parentId,
		children,
		subItem,
	}: {
		id: string;
		depth: number;
		icon?: ReactNode;
		expandable?: boolean;
		parentId: string | null;
		children?: ReactNode;
		subItem?: ReactNode;
	}) {
		const controller = useContext(context);
		const isFocused = useStateful(
			controller,
			(state) => id === state.focusedItemId,
		);
		const isSelected = useStateful(
			controller,
			(state) => id === state.selectedItemId,
		);
		const isExpanded = useStateful(controller, (state) =>
			state.expandedItemIds.has(id),
		);

		const elementRef = useRef<HTMLLIElement | null>(null);
		useEffect(() => {
			const element = elementRef.current;
			if (element === null) return;

			return controller.registerItem({
				id,
				element,
				parentId,
				isParent: expandable,
			});
		}, [controller.registerItem, id, expandable, parentId]);

		useEffect(() => {
			if (!isFocused) return;

			const element = elementRef.current;
			if (element === null) return;

			element.scrollIntoView({ block: "nearest" });
			element.focus();
		}, [isFocused]);

		return (
			<li
				ref={elementRef}
				role="treeitem"
				tabIndex={isFocused ? 0 : -1}
				aria-selected={isSelected}
				aria-expanded={isExpanded}
				css={{
					listStyle: "none",
					outline: "none",
				}}
				onDoubleClick={(ev) => {
					controller.toggleExpand(id);
					ev.stopPropagation();
				}}
				onFocus={(ev) => {
					controller.setFocusedItem(id);
					ev.stopPropagation();
				}}
				onClick={(ev) => {
					ev.stopPropagation();
					ev.preventDefault();
					controller.setSelectedItem(id);
				}}
				onKeyDown={(ev) => {
					switch (ev.key) {
						case "Enter":
						case " ": {
							ev.stopPropagation();
							ev.preventDefault();
							controller.setSelectedItem(id);
							break;
						}
					}
				}}
			>
				<div
					css={[
						ListBoxItemStyleBase,
						{
							paddingLeft: 16 + depth * 44,
							display: "grid",
							gridTemplate: '"chevron icon content" auto / 24px 16px 1fr',

							"&:is(:focus > *)": {
								outline: "2px solid var(--color-primary-500)",
							},

							"&:is([aria-selected='true'] > *)": {
								background: "var(--color-primary-200)",
							},
						},
					]}
				>
					{expandable && (
						<button
							type="button"
							css={[
								FlexLayout.row.center.center,
								{
									gridArea: "chevron",
									background: "none",
									border: "none",
									padding: 0,
									margin: 0,
									color: "inherit",
									width: "24px",
									height: "24px",
									cursor: "pointer",
								},
							]}
							onClick={(ev) => {
								ev.stopPropagation();
								ev.preventDefault();
								controller.toggleExpand(id);
							}}
						>
							<FaChevronDown
								css={{
									transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
									transition: "transform 60ms ease-out",
								}}
							/>
						</button>
					)}
					<div css={{ gridArea: "icon" }}>{icon}</div>
					<div
						css={{
							gridArea: "content",
							flex: "1 1 0",
							minWidth: 0,
							overflow: "clip",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{children}
					</div>
				</div>
				{expandable && isExpanded && subItem}
			</li>
		);
	}
}
