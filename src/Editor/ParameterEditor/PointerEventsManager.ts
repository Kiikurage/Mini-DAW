import { type RefObject, useEffect, useEffectEvent, useRef } from "react";
import { assertNotNullish, NoOp, toSet } from "../../lib.ts";

export interface Position {
	readonly x: number;
	readonly y: number;
}

export interface DragSessionContext<
	T extends Element & GlobalEventHandlers = Element & GlobalEventHandlers,
> {
	/**
	 * 監視対象の要素
	 */
	readonly element: T;

	/**
	 * セッション開始時のマウス座標
	 */
	readonly startPosition: Position;

	/**
	 * 現在のマウス座標
	 */
	readonly currentPosition: Position;

	/**
	 * 最新のイベント発生時にAltキーが押されていたかどうか。
	 */
	readonly altKey: boolean;

	/**
	 * 最新のイベント発生時にCtrlキーが押されていたかどうか。
	 */
	readonly ctrlKey: boolean;

	/**
	 * 最新のイベント発生時にMetaキーが押されていたかどうか。
	 */
	readonly metaKey: boolean;

	/**
	 * 最新のイベント発生時にShiftキーが押されていたかどうか。
	 */
	readonly shiftKey: boolean;

	onDragStart(callback: () => void): this;

	onDragMove(callback: () => void): this;

	onDragEnd(callback: () => void): this;

	onMouseUp(callback: () => void): this;

	onTap(callback: () => void): this;

	stopPropagation(): void;
}

class DragSessionContextImpl<T extends Element & GlobalEventHandlers>
	implements DragSessionContext<T>
{
	startPosition: { x: number; y: number } = { x: 0, y: 0 };
	currentPosition: { x: number; y: number } = { x: 0, y: 0 };
	altKey: boolean = false;
	ctrlKey: boolean = false;
	metaKey: boolean = false;
	shiftKey: boolean = false;

	private mouseDownAt: number = 0;
	private status: "idle" | "mousedown" | "dragging" = "idle";
	private readonly onMouseDownCallbacks = new Set<
		(ctx: DragSessionContext<T>) => void
	>();
	private readonly onDragStartCallbacks = new Set<() => void>();
	private readonly onDragMoveCallbacks = new Set<() => void>();
	private readonly onDragEndCallbacks = new Set<() => void>();
	private readonly onMouseUpCallbacks = new Set<() => void>();
	private readonly onTapCallbacks = new Set<() => void>();
	private static DRAG_DISTANCE_THRESHOLD: number = 5; // pixels
	private static DRAG_DURATION_THRESHOLD_IN_MS: number = 200;

	constructor(readonly element: T) {}

	onMouseDown(callback: (ctx: DragSessionContext<T>) => void): this {
		this.onMouseDownCallbacks.add(callback);
		return this;
	}

	onDragStart(callback: () => void): this {
		this.onDragStartCallbacks.add(callback);
		return this;
	}

	onDragMove(callback: () => void): this {
		this.onDragMoveCallbacks.add(callback);
		return this;
	}

	onDragEnd(callback: () => void): this {
		this.onDragEndCallbacks.add(callback);
		return this;
	}

	onMouseUp(callback: () => void): this {
		this.onMouseUpCallbacks.add(callback);
		return this;
	}

	onTap(callback: () => void): this {
		this.onTapCallbacks.add(callback);
		return this;
	}

	stopPropagation: () => void = NoOp;

	readonly handleMouseDown = (ev: MouseEvenLike) => {
		if (this.status !== "idle") return;

		this.status = "mousedown";
		this.mouseDownAt = ev.timeStamp;
		this.startPosition = ev.position;
		this.currentPosition = ev.position;
		this.altKey = ev.altKey;
		this.ctrlKey = ev.ctrlKey;
		this.metaKey = ev.metaKey;
		this.shiftKey = ev.shiftKey;

		this.dispatch(this.onMouseDownCallbacks, ev);
	};

	readonly handleMouseMove = (ev: MouseEvenLike) => {
		if (this.status === "idle") return;

		this.currentPosition = ev.position;
		this.altKey = ev.altKey;
		this.ctrlKey = ev.ctrlKey;
		this.metaKey = ev.metaKey;
		this.shiftKey = ev.shiftKey;

		if (this.status === "mousedown") {
			this.status = "dragging";
			this.dispatch(this.onDragStartCallbacks, ev);
		}
		if (this.status === "dragging") {
			this.dispatch(this.onDragMoveCallbacks, ev);
		}
	};

	readonly handleMouseUp = (ev: MouseEvenLike) => {
		if (this.status === "idle") return;

		this.currentPosition = ev.position;
		this.altKey = ev.altKey;
		this.ctrlKey = ev.ctrlKey;
		this.metaKey = ev.metaKey;
		this.shiftKey = ev.shiftKey;

		if (this.status === "dragging") {
			this.status = "mousedown";
			this.dispatch(this.onDragEndCallbacks, ev);
		}
		if (this.status === "mousedown") {
			this.status = "idle";
			this.dispatch(this.onMouseUpCallbacks, ev);

			const distance = Math.hypot(
				this.currentPosition.x - this.startPosition.x,
				this.currentPosition.y - this.startPosition.y,
			);
			const duration = ev.timeStamp - this.mouseDownAt;
			if (
				distance < DragSessionContextImpl.DRAG_DISTANCE_THRESHOLD &&
				duration < DragSessionContextImpl.DRAG_DURATION_THRESHOLD_IN_MS
			) {
				this.dispatch(this.onTapCallbacks, ev);
			}
		}

		this.onDragStartCallbacks.clear();
		this.onDragMoveCallbacks.clear();
		this.onDragEndCallbacks.clear();
		this.onMouseUpCallbacks.clear();
		this.onTapCallbacks.clear();
	};

	readonly handleMouseCancel = (ev: MouseEvenLike) => {
		if (this.status === "idle") return;

		this.currentPosition = ev.position;
		this.altKey = ev.altKey;
		this.ctrlKey = ev.ctrlKey;
		this.metaKey = ev.metaKey;
		this.shiftKey = ev.shiftKey;

		if (this.status === "dragging") {
			this.status = "mousedown";
			this.dispatch(this.onDragEndCallbacks, ev);
		}
		if (this.status === "mousedown") {
			this.status = "idle";
			this.dispatch(this.onMouseUpCallbacks, ev);
		}

		this.onDragStartCallbacks.clear();
		this.onDragMoveCallbacks.clear();
		this.onDragEndCallbacks.clear();
		this.onMouseUpCallbacks.clear();
		this.onTapCallbacks.clear();
	};

	private dispatch(
		callbacks: Iterable<(ctx: this) => void>,
		ev: MouseEvenLike,
	) {
		this.stopPropagation = ev.stopPropagation;
		for (const fn of callbacks) fn(this);
		this.stopPropagation = NoOp;
	}
}

export interface GestureSessionContext<
	T extends Element & GlobalEventHandlers = Element & GlobalEventHandlers,
> {
	/**
	 * 監視対象の要素
	 */
	readonly element: T;

	/**
	 * ジェスチャ開始時のジェスチャ中心位置
	 */
	readonly startPosition: Position;

	/**
	 * 現在のジェスチャ中心位置
	 */
	readonly currentPosition: Position;

	/**
	 * 最新のイベント発生時にAltキーが押されていたかどうか。
	 */
	readonly altKey: boolean;

	/**
	 * 最新のイベント発生時にCtrlキーが押されていたかどうか。
	 */
	readonly ctrlKey: boolean;

	/**
	 * 最新のイベント発生時にMetaキーが押されていたかどうか。
	 */
	readonly metaKey: boolean;

	/**
	 * 最新のイベント発生時にShiftキーが押されていたかどうか。
	 */
	readonly shiftKey: boolean;

	onGestureMove(callback: () => void): this;

	onGestureEnd(callback: () => void): this;

	stopPropagation(): void;
}

class GestureSessionContextImpl<T extends Element & GlobalEventHandlers>
	implements GestureSessionContext<T>
{
	status: "idle" | "active" | "ended" = "idle";
	startPosition: { x: number; y: number } = { x: 0, y: 0 };
	currentPosition: { x: number; y: number } = { x: 0, y: 0 };
	altKey: boolean = false;
	ctrlKey: boolean = false;
	metaKey: boolean = false;
	shiftKey: boolean = false;

	private stopPropagationProxy: () => void = NoOp;
	private readonly onGestureMoveCallbacks = new Set<() => void>();
	private readonly onGestureEndCallbacks = new Set<() => void>();
	private readonly touches = new Map<number, Position>();

	constructor(
		readonly element: T,
		private readonly onGestureStartCallbacks: Set<
			(ctx: GestureSessionContext<T>) => void
		>,
		private readonly touchIdentifiers: ReadonlySet<number>,
	) {}

	onGestureMove(callback: () => void): this {
		this.onGestureMoveCallbacks.add(callback);
		return this;
	}

	onGestureEnd(callback: () => void): this {
		this.onGestureEndCallbacks.add(callback);
		return this;
	}

	handleGestureUpdate(ev: TouchEvent) {
		let numFoundPointers = 0;
		for (const touch of Array.from(ev.touches)) {
			if (!this.touchIdentifiers.has(touch.identifier)) continue;

			this.touches.set(touch.identifier, {
				x: touch.clientX,
				y: touch.clientY,
			});
			numFoundPointers++;
		}

		if (numFoundPointers < this.touchIdentifiers.size) {
			if (this.status === "active") {
				this.stopPropagationProxy = ev.stopPropagation;
				for (const fn of this.onGestureEndCallbacks) fn();
				this.stopPropagationProxy = NoOp;
			}
			this.status = "ended";
			return;
		}

		if (this.status === "idle") {
			this.status = "active";
			// ジェスチャ開始位置を計算
			const position = { x: 0, y: 0 };
			for (const pos of this.touches.values()) {
				position.x += pos.x;
				position.y += pos.y;
			}
			position.x /= this.touches.size;
			position.y /= this.touches.size;
			this.startPosition = position;
			this.currentPosition = position;

			this.stopPropagationProxy = ev.stopPropagation;
			for (const fn of this.onGestureStartCallbacks) fn(this);
			this.stopPropagationProxy = NoOp;
		}
		if (this.status === "active") {
			// 現在のジェスチャ位置を計算
			const position = { x: 0, y: 0 };
			for (const pos of this.touches.values()) {
				position.x += pos.x;
				position.y += pos.y;
			}
			position.x /= this.touches.size;
			position.y /= this.touches.size;
			this.currentPosition = position;

			this.stopPropagationProxy = ev.stopPropagation;
			for (const fn of this.onGestureMoveCallbacks) fn();
			this.stopPropagationProxy = NoOp;
		}
	}

	stopPropagation() {
		this.stopPropagationProxy();
	}
}

interface MouseEvenLike {
	readonly timeStamp: number;
	readonly position: Position;
	readonly altKey: boolean;
	readonly ctrlKey: boolean;
	readonly metaKey: boolean;
	readonly shiftKey: boolean;
	readonly stopPropagation: () => void;
}

export class PointerEventsManager<
	T extends Element & GlobalEventHandlers = Element & GlobalEventHandlers,
> {
	private mouseSession: DragSessionContextImpl<T> | null = null;
	private readonly touchSessions = new Map<number, DragSessionContextImpl<T>>();
	private readonly onMouseDownCallbacks = new Set<
		(ctx: DragSessionContext<T>) => void
	>();
	private readonly onGestureStartCallbacks = new Set<
		(ctx: GestureSessionContext<T>) => void
	>();
	private gestureSession: GestureSessionContextImpl<T> | null = null;

	constructor(private readonly element: T) {}

	onMouseDown(callback: (ctx: DragSessionContext<T>) => void): this {
		this.onMouseDownCallbacks.add(callback);
		return this;
	}

	onGestureStart(callback: (ctx: GestureSessionContext<T>) => void): this {
		this.onGestureStartCallbacks.add(callback);
		return this;
	}

	setUp() {
		const window = this.element.ownerDocument.defaultView;
		assertNotNullish(window);

		this.element.addEventListener("pointerdown", this.handlePointerDown);
		window.addEventListener("pointermove", this.handlePointerMove);
		window.addEventListener("pointerup", this.handlePointerUp);
		this.element.addEventListener("touchstart", this.handleTouchStart);
		this.element.addEventListener("touchmove", this.handleTouchMove);
		this.element.addEventListener("touchend", this.handleTouchEnd);

		return () => {
			this.element.removeEventListener("pointerdown", this.handlePointerDown);
			window.removeEventListener("pointermove", this.handlePointerMove);
			window.removeEventListener("pointerup", this.handlePointerUp);
			this.element.removeEventListener("touchstart", this.handleTouchStart);
			this.element.removeEventListener("touchmove", this.handleTouchMove);
			this.element.removeEventListener("touchend", this.handleTouchEnd);
		};
	}

	private buildEventLikeFromPointerEvent(ev: PointerEvent): MouseEvenLike {
		return {
			timeStamp: ev.timeStamp,
			position: {
				x: ev.clientX,
				y: ev.clientY,
			},
			altKey: ev.altKey,
			ctrlKey: ev.ctrlKey,
			metaKey: ev.metaKey,
			shiftKey: ev.shiftKey,
			stopPropagation: () => ev.stopPropagation(),
		};
	}

	private buildEventLikeFromTouchEvent(
		ev: TouchEvent,
		touch: Touch,
	): MouseEvenLike {
		return {
			timeStamp: ev.timeStamp,
			position: {
				x: touch.clientX,
				y: touch.clientY,
			},
			altKey: ev.altKey,
			ctrlKey: ev.ctrlKey,
			metaKey: ev.metaKey,
			shiftKey: ev.shiftKey,
			stopPropagation: () => ev.stopPropagation(),
		};
	}

	private readonly handlePointerDown = (ev: PointerEvent) => {
		if (ev.pointerType !== "mouse") return;
		if (this.mouseSession === null) {
			this.mouseSession = new DragSessionContextImpl(this.element);
			for (const fn of this.onMouseDownCallbacks) {
				this.mouseSession.onMouseDown(fn);
			}
		}
		this.mouseSession.handleMouseDown(this.buildEventLikeFromPointerEvent(ev));
	};

	private readonly handlePointerMove = (ev: PointerEvent) => {
		if (ev.pointerType !== "mouse") return;
		if (this.mouseSession === null) return;
		this.mouseSession.handleMouseMove(this.buildEventLikeFromPointerEvent(ev));
	};

	private readonly handlePointerUp = (ev: PointerEvent) => {
		if (ev.pointerType !== "mouse") return;
		if (this.mouseSession === null) return;
		this.mouseSession.handleMouseUp(this.buildEventLikeFromPointerEvent(ev));
	};

	private readonly handleTouchStart = (ev: TouchEvent) => {
		// ジェスチャ中は新しいタッチを無視する
		if (this.gestureSession !== null) return;
		for (const touch of Array.from(ev.changedTouches)) {
			let session = this.touchSessions.get(touch.identifier);
			if (session === undefined) {
				session = new DragSessionContextImpl(this.element);
				for (const fn of this.onMouseDownCallbacks) {
					session.onMouseDown(fn);
				}
				this.touchSessions.set(touch.identifier, session);
			}
			session.handleMouseDown(this.buildEventLikeFromTouchEvent(ev, touch));
		}

		if (this.touchSessions.size >= 2) {
			// 全てのタッチセッションを終了し、ジェスチャセッションを開始する
			for (const session of this.touchSessions.values()) {
				session.handleMouseCancel({
					timeStamp: ev.timeStamp,
					position: session.currentPosition,
					altKey: ev.altKey,
					ctrlKey: ev.ctrlKey,
					metaKey: ev.metaKey,
					shiftKey: ev.shiftKey,
					stopPropagation: () => ev.stopPropagation(),
				});
			}
			this.touchSessions.clear();

			const touches = Array.from(ev.touches);
			const gestureTouches = touches.slice(-2);

			this.gestureSession = new GestureSessionContextImpl(
				this.element,
				this.onGestureStartCallbacks,
				toSet(gestureTouches.map((touch) => touch.identifier)),
			);
		}
	};

	private readonly handleTouchMove = (ev: TouchEvent) => {
		ev.preventDefault();

		if (this.gestureSession !== null) {
			this.gestureSession.handleGestureUpdate(ev);
			return;
		}

		for (const touch of Array.from(ev.changedTouches)) {
			const session = this.touchSessions.get(touch.identifier);
			if (session === undefined) continue;

			session.handleMouseMove(this.buildEventLikeFromTouchEvent(ev, touch));
		}
	};

	private readonly handleTouchEnd = (ev: TouchEvent) => {
		ev.preventDefault();

		if (this.gestureSession !== null) {
			this.gestureSession.handleGestureUpdate(ev);
			if (this.gestureSession.status === "ended") {
				this.gestureSession = null;
			}
			return;
		}

		for (const touch of Array.from(ev.changedTouches)) {
			const session = this.touchSessions.get(touch.identifier);
			if (session === undefined) continue;

			session.handleMouseUp(this.buildEventLikeFromTouchEvent(ev, touch));
			this.touchSessions.delete(touch.identifier);
		}
	};
}

export function usePointerEvents<T extends HTMLElement | SVGElement>(
	initializer: (manager: PointerEventsManager<T>) => void,
): RefObject<T | null> {
	const ref = useRef<T>(null);
	const event = useEffectEvent((manager: PointerEventsManager<T>) => {
		initializer(manager);
	});
	useEffect(() => {
		const element = ref.current;
		if (element === null) return;

		const manager = new PointerEventsManager(element);
		event(manager);
		return manager.setUp();
	}, []);

	return ref;
}
