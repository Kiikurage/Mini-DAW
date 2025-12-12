import { type ReactNode, useRef, useState } from "react";
import { Stateful } from "../../Stateful/Stateful.ts";
import { useStateful } from "../../Stateful/useStateful.tsx";
import { Styles } from "../Styles.ts";
import { useResizeObserver } from "../useResizeObserver.ts";

export function PopUp({
	controller,
	children,
}: {
	controller?: PopUpController;
	children?: ReactNode;
}) {
	const baseRef = useRef<HTMLDivElement>(null);
	controller = useState(() => controller ?? new PopUpController())[0];

	const resizeObserverRef = useResizeObserver((entry) => {
		const bcr = entry.target.getBoundingClientRect();
		controller.updateLayout({
			top: bcr.top,
			left: bcr.left,
			windowWidth: window.innerWidth,
			windowHeight: window.innerHeight,
		});
	});
	const state = useStateful(controller);

	if (!state.open) return null;

	return (
		<div
			popover="auto"
			style={{
				top: state.top,
				left: state.left,
				height: state.height,
				minWidth: state.width,
			}}
			css={{
				position: "fixed",
				inset: "unset",
				pointerEvents: "none",
				display: "flex",
				flexDirection: "column",
				background: "transparent",
				border: "none",
				overflow: "visible",
				padding: 0,
			}}
			ref={(e) => {
				baseRef.current = e;
				controller.setBaseElement(e);
				resizeObserverRef(e);
				if (e !== null) e.showPopover();
			}}
		>
			<div
				css={{
					flex: "0 1 auto",
					minHeight: 0,
					pointerEvents: "auto",
					boxShadow: Styles.BOX_SHADOW,
					borderRadius: 4,
				}}
			>
				{children}
			</div>
		</div>
	);
}

export class PopUpState {
	readonly open: boolean;
	readonly top: number;
	readonly left: number;
	readonly height: number;
	readonly width: number;
	readonly focused: boolean;

	constructor(props: {
		open: boolean;
		top: number;
		left: number;
		height: number;
		width: number;
		focused: boolean;
	}) {
		this.open = props.open;
		this.top = props.top;
		this.left = props.left;
		this.height = props.height;
		this.width = props.width;
		this.focused = props.focused;
	}
}

export class PopUpController extends Stateful<PopUpState> {
	private baseElement: HTMLElement | null = null;

	constructor() {
		super(
			new PopUpState({
				focused: false,
				open: false,
				top: -1,
				left: -1,
				height: 0,
				width: 0,
			}),
		);
	}

	open(position: { top: number; left: number; width: number }) {
		this.updateState(
			(state) =>
				new PopUpState({
					...state,
					open: true,
					top: position.top,
					left: position.left,
					height: 0,
					width: position.width,
				}),
		);
	}

	openAround(element: Element) {
		const { left, top, height, width } = element.getBoundingClientRect();
		this.open({ top: top + height + 4, left, width });
	}

	close() {
		this.updateState(
			(state) => new PopUpState({ ...state, open: false, top: -1, left: -1 }),
		);
	}

	setBaseElement(element: HTMLElement | null) {
		this.baseElement = element;
	}

	contains(element: Element | null): boolean {
		return this.baseElement?.contains(element) ?? false;
	}

	updateLayout(dimension: {
		top: number;
		left: number;
		windowWidth: number;
		windowHeight: number;
	}) {
		this.updateState((state) => {
			return {
				...state,
				height: Math.min(dimension.windowHeight - dimension.top - 8),
			};
		});
	}
}
