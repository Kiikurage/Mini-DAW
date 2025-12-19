import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { assertNotNullish } from "../lib.ts";
import { useResizeObserver } from "../react/useResizeObserver.ts";
import { Stateful } from "../Stateful/Stateful.ts";
import { useStateful } from "../Stateful/useStateful.tsx";
import { vibrateFeedback } from "../vibrate.ts";

const RESIZE_HANDLE_SIZE = 24;

interface Area {
	id: string;
	flex: boolean;
	defaultSize?: number;
	min?: number;
	max?: number;
	element: Element;
}

interface Handle {
	areaId1: string;
	areaId2: string;
	top: number;
	left: number;
	width: number;
	height: number;
}

interface Layout {
	id: string;
	flex: number;
	base: number;
}

interface ComputedLayout {
	id: string;
	position: number;
	size: number;
}

interface State {
	readonly layouts: ReadonlyMap<string, Layout>;
	readonly handles: Handle[];
}

class SplitterController extends Stateful<State> {
	private readonly areas: Area[] = [];
	private containerRect: DOMRect | null = null;

	constructor(public direction: "row" | "column" = "column") {
		super({ layouts: new Map(), handles: [] });
	}

	setContainerRect(rect: DOMRect) {
		this.containerRect = rect;
		this.updateHandles();
	}

	putArea(area: Area) {
		let inserted = false;
		for (const [i, existingArea] of this.areas.entries()) {
			if (
				existingArea.element.compareDocumentPosition(area.element) &
				Node.DOCUMENT_POSITION_PRECEDING
			) {
				this.areas.splice(i, 0, area);
				inserted = true;
				break;
			}
		}
		if (!inserted) {
			this.areas.push(area);
		}

		this.updateState((state) => {
			const layouts = new Map(state.layouts);
			layouts.set(area.id, {
				id: area.id,
				base: area.flex ? 0 : (area.defaultSize ?? 0),
				flex: area.flex ? 1 : 0,
			});
			return { ...state, layouts };
		});

		this.updateHandles();
	}

	removeArea(id: string) {
		const index = this.areas.findIndex((area) => area.id === id);
		if (index === -1) return;
		this.areas.splice(index, 1);

		this.updateState((state) => {
			const layouts = new Map(state.layouts);
			layouts.delete(id);
			return { ...state, layouts };
		});

		this.updateHandles();
	}

	onHandleDragMove(
		handle: Handle,
		diff: {
			initialLayouts: ReadonlyMap<string, Layout>;
			dx: number;
			dy: number;
		},
	) {
		if (this.containerRect === null) return;

		const area1 = this.areas.find((area) => area.id === handle.areaId1);
		if (area1 === undefined) return;

		const area2 = this.areas.find((area) => area.id === handle.areaId2);
		if (area2 === undefined) return;

		const oldLayout1 = diff.initialLayouts.get(area1.id);
		if (oldLayout1 === undefined) return;

		const oldLayout2 = diff.initialLayouts.get(area2.id);
		if (oldLayout2 === undefined) return;

		const layoutsArray = [...diff.initialLayouts.values()];
		const totalBaseSize = layoutsArray.reduce(
			(sum, layout) => sum + layout.base,
			0,
		);
		const totalFlexSize =
			(this.direction === "row"
				? this.containerRect.width
				: this.containerRect.height) - totalBaseSize;
		const totalFlex = layoutsArray.reduce(
			(sum, layout) => sum + layout.flex,
			0,
		);
		const pixelPerFlex = totalFlex > 0 ? totalFlexSize / totalFlex : 0;

		const delta = this.direction === "row" ? diff.dx : diff.dy;

		const newBase1 = area1.flex ? 0 : oldLayout1.base + delta;
		const newBase2 = area2.flex ? 0 : oldLayout2.base - delta;
		const newFlex1 = area1.flex ? oldLayout1.flex + delta / pixelPerFlex : 0;
		const newFlex2 = area2.flex ? oldLayout2.flex - delta / pixelPerFlex : 0;

		const layouts = new Map(diff.initialLayouts);
		layouts.set(area1.id, {
			id: area1.id,
			base: Math.max(0, newBase1),
			flex: Math.max(0, newFlex1),
		});
		layouts.set(area2.id, {
			id: area2.id,
			base: Math.max(0, newBase2),
			flex: Math.max(0, newFlex2),
		});

		const newTotalFlex = [...layouts.values()].reduce(
			(sum, layout) => sum + layout.flex,
			0,
		);
		if (newTotalFlex < 1) {
			// 何故かバグるので1に正規化しておく
			for (const layout of layouts.values()) {
				layout.flex *= 1 / newTotalFlex;
			}
		}
		this.setState({ ...this.state, layouts });
		this.updateHandles();
	}

	private computeLayouts(): ComputedLayout[] {
		const totalBaseSize = [...this.state.layouts.values()].reduce(
			(sum, layout) => sum + layout.base,
			0,
		);
		const totalFlexSize = this.containerRect
			? (this.direction === "row"
					? this.containerRect.width
					: this.containerRect.height) - totalBaseSize
			: 0;
		const totalFlex = [...this.state.layouts.values()].reduce(
			(sum, layout) => sum + layout.flex,
			0,
		);
		const pixelPerFlex = totalFlex > 0 ? totalFlexSize / totalFlex : 0;

		let position = 0;
		const dimensions: { id: string; position: number; size: number }[] = [];
		for (const area of this.areas) {
			const layout = this.state.layouts.get(area.id);
			if (!layout) continue;
			const size = layout.base + layout.flex * pixelPerFlex;
			dimensions.push({ id: area.id, position, size });
			position += size;
		}

		return dimensions;
	}

	private updateHandles() {
		if (this.containerRect === null) return;

		const layouts = this.computeLayouts();

		const handles: Handle[] = [];
		for (let i = 0; i < layouts.length - 1; i++) {
			const layout1 = layouts[i];
			assertNotNullish(layout1);

			const layout2 = layouts[i + 1];
			assertNotNullish(layout2);

			handles.push({
				areaId1: layout1.id,
				areaId2: layout2.id,
				top:
					this.direction === "row"
						? 0
						: layout2.position - RESIZE_HANDLE_SIZE / 2,
				left:
					this.direction === "column"
						? 0
						: layout2.position - RESIZE_HANDLE_SIZE / 2,
				width:
					this.direction === "row"
						? RESIZE_HANDLE_SIZE
						: this.containerRect.width,
				height:
					this.direction === "column"
						? RESIZE_HANDLE_SIZE
						: this.containerRect.height,
			});
		}

		this.setState({ ...this.state, handles });
	}
}

const context = createContext<SplitterController>(null as never);

function SplitterArea({
	children,
	min,
	max,
	defaultSize,
	flex = false,
}: {
	children?: ReactNode;
	flex?: boolean;
	defaultSize?: number;
	min?: number;
	max?: number;
}) {
	const id = useId();
	const elementRef = useRef<HTMLDivElement>(null);
	const controller = useContext(context);
	const layout =
		useStateful(controller, (state) => state.layouts.get(id)) ??
		(flex ? { id, flex: 1, base: 0 } : { id, flex: 0, base: defaultSize ?? 0 });

	useEffect(() => {
		const element = elementRef.current;
		assertNotNullish(element);

		controller.putArea({
			id,
			flex,
			defaultSize,
			min,
			max,
			element,
		});
		return () => {
			controller.removeArea(id);
		};
	}, [id, controller, flex, defaultSize, min, max]);

	return (
		<div
			ref={elementRef}
			style={{
				flex: `${layout.flex} ${layout.flex} ${layout.base}px`,
			}}
			css={{ position: "relative", overflow: "clip" }}
		>
			{children}
		</div>
	);
}

export const Splitter = Object.assign(
	function Splitter({
		direction = "column",
		children,
	}: {
		direction?: "row" | "column";
		children?: ReactNode;
	}) {
		const [isDragging, setDragging] = useState(false);
		const [controller] = useState(() => new SplitterController(direction));
		const resizeObserverRef = useResizeObserver((entry) => {
			controller.setContainerRect(entry.target.getBoundingClientRect());
		});
		const state = useStateful(controller);
		const dragState = useRef({
			isDragging: false,
			startX: 0,
			startY: 0,
			currentX: 0,
			currentY: 0,
			initialLayouts: state.layouts,
		}).current;
		return (
			<context.Provider value={controller}>
				<div
					ref={resizeObserverRef}
					style={{
						flexDirection: direction,
					}}
					css={{
						position: "absolute",
						inset: 0,
						display: "flex",
						overflow: "clip",
					}}
				>
					{children}
					{state.handles.map((handle) => (
						<svg
							key={handle.areaId1}
							style={{
								top: handle.top,
								left: handle.left,
								cursor: direction === "row" ? "col-resize" : "row-resize",
							}}
							width={direction === "row" ? RESIZE_HANDLE_SIZE : "100%"}
							height={direction === "column" ? RESIZE_HANDLE_SIZE : "100%"}
							css={[
								{
									position: "absolute",
									background: "transparent",
									zIndex: 1,
								},
							]}
							onPointerDown={(ev) => {
								if (dragState.isDragging) return;
								vibrateFeedback();
								setDragging(true);
								ev.currentTarget.setPointerCapture(ev.pointerId);
								dragState.isDragging = true;
								dragState.startX = ev.clientX;
								dragState.startY = ev.clientY;
								dragState.initialLayouts = state.layouts;
							}}
							onPointerMove={(ev) => {
								if (!dragState.isDragging) return;
								dragState.currentX = ev.clientX;
								dragState.currentY = ev.clientY;
								controller.onHandleDragMove(handle, {
									initialLayouts: dragState.initialLayouts,
									dx: dragState.currentX - dragState.startX,
									dy: dragState.currentY - dragState.startY,
								});
							}}
							onPointerUp={(ev) => {
								if (!dragState.isDragging) return;
								ev.currentTarget.releasePointerCapture(ev.pointerId);
								dragState.isDragging = false;
								setDragging(false);
							}}
							onPointerCancel={(ev) => {
								ev.currentTarget.releasePointerCapture(ev.pointerId);
								dragState.isDragging = false;
								setDragging(false);
							}}
							viewBox={`0 0 ${handle.width} ${handle.height}`}
						>
							<title>resize handle</title>
							<rect
								x={direction === "row" ? RESIZE_HANDLE_SIZE / 2 - 1 : 0}
								y={direction === "column" ? RESIZE_HANDLE_SIZE / 2 - 1 : 0}
								width={direction === "row" ? 2 : handle.width}
								height={direction === "column" ? 2 : handle.height}
								css={{
									fill: isDragging ? "var(--color-primary-300)" : "none",
								}}
							/>
						</svg>
					))}
				</div>
			</context.Provider>
		);
	},
	{
		Area: SplitterArea,
	},
);
