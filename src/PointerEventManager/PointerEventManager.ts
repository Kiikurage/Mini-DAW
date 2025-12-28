import { start } from "happy-dom/lib/PropertySymbol";
import { MouseEventButton } from "../constants.ts";
import { EventEmitter } from "../EventEmitter.ts";
import { addListener } from "../lib.ts";
import type { PositionSnapshot } from "./PositionSnapshot.ts";

export class PointerEventManager extends EventEmitter<{
	mouseMove: [ev: PEMMouseEvent];
	pointerDown: [ev: PEMPointerEvent];
	pointerUp: [ev: PEMPointerEvent];
	dragStart: [ev: PEMPointerEvent];
	dragMove: [ev: PEMPointerEvent];
	dragEnd: [ev: PEMPointerEvent];
	tap: [ev: PEMTapEvent];
	doubleTap: [ev: PEMTapEvent];
	gestureStart: [ev: PEMGestureEvent];
	gestureChange: [ev: PEMGestureEvent];
	gestureEnd: [ev: PEMGestureEvent];
}> {
	/**
	 * 2回のタップをダブルタップと見なすための最大間隔（ミリ秒単位）。
	 */
	private static readonly MAX_DURATION_BETWEEN_TAPS_IN_MS = 500;

	/**
	 * 2回のタップをダブルタップと見なすための最大距離（ピクセル単位）。
	 */
	private static readonly MAX_DISTANCE_BETWEEN_TAPS_IN_PIXEL = 20;

	/**
	 * タップと見なす最大の継続時間（ミリ秒単位）。これより長い時間のホールドではtapイベントは発生しない。
	 */
	private static readonly MAX_DURATION_FOR_TAP_IN_MS = 180;

	/**
	 * タップと見なす最大の移動距離（ピクセル単位）。これより大きく移動した場合、tapイベントは発生しない。
	 */
	private static readonly MAX_DISTANCE_FOR_TAP_IN_PIXEL = 8;

	private readonly pointers = new Map<number, PointerState>();

	private gestureState: GestureState | null = null;

	private firstTapForDoubleTap: {
		position: PositionSnapshot;
		at: number;
	} | null = null;

	private element: HTMLElement | null = null;

	private isMouseDown = false;

	getPointerPositions(): Iterable<PositionSnapshot> {
		return [...this.pointers.values()].map((p) => p.position);
	}

	install(element: HTMLElement) {
		const cleanUps = [
			addListener(element, "touchstart", (nativeEv) => {
				nativeEv.preventDefault();
				nativeEv.stopImmediatePropagation();
				this.handleTouchStart(nativeEv);
			}),
			addListener(element, "touchmove", (nativeEv) => {
				nativeEv.stopImmediatePropagation();
				this.handleTouchMove(nativeEv);
			}),
			addListener(element, "touchend", (nativeEv) => {
				nativeEv.stopImmediatePropagation();
				this.handleTouchEnd(nativeEv);
			}),
			addListener(element, "mousedown", (nativeEv) => {
				nativeEv.preventDefault();
				nativeEv.stopImmediatePropagation();
				this.handleMouseDown(nativeEv);
			}),
			addListener(element, "mousemove", (nativeEv) => {
				this.handleLocalMouseMove(nativeEv);
			}),
			addListener(element.ownerDocument, "mousemove", (nativeEv) => {
				this.handleGlobalMouseMove(nativeEv);
			}),
			addListener(element.ownerDocument, "mouseup", (nativeEv) => {
				this.handleMouseUp(nativeEv);
			}),
		];
		this.element = element;

		return () => {
			this.element = null;
			for (const fn of cleanUps) fn();
		};
	}

	private static readonly MOUSE_EVENT_POINTER_ID = -12345678; // Arbitrary negative number to avoid collision with touch pointer IDs

	private readonly handleTouchStart = (nativeEv: TouchEvent) => {
		if (this.element === null) return;
		const bcr = this.element.getBoundingClientRect();

		for (let i = 0; i < nativeEv.changedTouches.length; i++) {
			const touch = nativeEv.changedTouches[i];
			if (touch === undefined) break;

			this.handlePointerDown(
				touch.identifier,
				{
					x: touch.clientX - bcr.left,
					y: touch.clientY - bcr.top,
				},
				MouseEventButton.PRIMARY,
				nativeEv.metaKey,
			);
		}
	};

	private readonly handleTouchMove = (nativeEv: TouchEvent) => {
		if (this.element === null) return;
		const bcr = this.element.getBoundingClientRect();

		for (let i = 0; i < nativeEv.changedTouches.length; i++) {
			const touch = nativeEv.changedTouches[i];
			if (touch === undefined) break;

			this.handlePointerMove(
				touch.identifier,
				{
					x: touch.clientX - bcr.left,
					y: touch.clientY - bcr.top,
				},
				MouseEventButton.PRIMARY,
				nativeEv.metaKey,
			);
		}
	};

	private readonly handleTouchEnd = (nativeEv: TouchEvent) => {
		if (this.element === null) return;
		const bcr = this.element.getBoundingClientRect();

		for (let i = 0; i < nativeEv.changedTouches.length; i++) {
			const touch = nativeEv.changedTouches[i];
			if (touch === undefined) break;

			this.handlePointerUp(
				touch.identifier,
				{
					x: touch.clientX - bcr.left,
					y: touch.clientY - bcr.top,
				},
				MouseEventButton.PRIMARY,
				nativeEv.metaKey,
				false,
			);
		}
	};

	private readonly handleMouseDown = (nativeEv: MouseEvent) => {
		if (this.element === null) return;
		if (this.isMouseDown) return;
		this.isMouseDown = true;

		const bcr = this.element.getBoundingClientRect();
		const position: PositionSnapshot = {
			x: nativeEv.clientX - bcr.left,
			y: nativeEv.clientY - bcr.top,
		};

		this.handlePointerDown(
			PointerEventManager.MOUSE_EVENT_POINTER_ID,
			position,
			nativeEv.button,
			nativeEv.metaKey,
		);
	};

	private readonly handleLocalMouseMove = (nativeEv: MouseEvent) => {
		if (this.element === null) return;
		if (this.isMouseDown) return;

		const bcr = this.element.getBoundingClientRect();
		const position: PositionSnapshot = {
			x: nativeEv.clientX - bcr.left,
			y: nativeEv.clientY - bcr.top,
		};

		this.handlePointerMove(
			PointerEventManager.MOUSE_EVENT_POINTER_ID,
			position,
			nativeEv.button,
			nativeEv.metaKey,
		);
	};

	private readonly handleGlobalMouseMove = (nativeEv: MouseEvent) => {
		if (this.element === null) return;
		if (!this.isMouseDown) return;

		const bcr = this.element.getBoundingClientRect();
		const position: PositionSnapshot = {
			x: nativeEv.clientX - bcr.left,
			y: nativeEv.clientY - bcr.top,
		};

		this.handlePointerMove(
			PointerEventManager.MOUSE_EVENT_POINTER_ID,
			position,
			nativeEv.button,
			nativeEv.metaKey,
		);
	};

	private readonly handleMouseUp = (nativeEv: MouseEvent) => {
		if (this.element === null) return;
		if (!this.isMouseDown) return;
		this.isMouseDown = false;

		const bcr = this.element.getBoundingClientRect();
		const position: PositionSnapshot = {
			x: nativeEv.clientX - bcr.left,
			y: nativeEv.clientY - bcr.top,
		};

		this.handlePointerUp(
			PointerEventManager.MOUSE_EVENT_POINTER_ID,
			position,
			nativeEv.button,
			nativeEv.metaKey,
			true,
		);
	};

	private readonly handlePointerDown = (
		pointerId: number,
		position: PositionSnapshot,
		button: MouseEventButton,
		metaKey: boolean,
	) => {
		let pointerState = this.pointers.get(pointerId);
		if (pointerState === undefined) {
			pointerState = { position, buttonStates: new Map() };
			this.pointers.set(pointerId, pointerState);
		}

		let buttonState = pointerState.buttonStates.get(button);
		if (buttonState !== undefined) {
			console.warn(
				"Pointer down event received, but button is already marked as down.",
				{
					pointerId,
					button,
					buttonState,
				},
			);
		}

		buttonState = {
			button,
			downPosition: position,
			downAt: performance.now(),
			dragState: undefined,
			eventEmitter: new EventEmitter<PointerSequenceEventMap>(),
		};
		pointerState.buttonStates.set(button, buttonState);
		this.emit(
			"pointerDown",
			new PEMPointerEvent(buttonState, position, metaKey),
		);
	};

	private readonly handlePointerMove = (
		pointerId: number,
		position: PositionSnapshot,
		button: MouseEventButton,
		metaKey: boolean,
	) => {
		let pointerState = this.pointers.get(pointerId);
		if (pointerState === undefined) {
			pointerState = { position, buttonStates: new Map() };
			this.pointers.set(pointerId, pointerState);
		}
		pointerState.position = position;

		this.emit("mouseMove", { button, metaKey, position, manager: this });

		for (const button of [MouseEventButton.PRIMARY] as const) {
			const buttonState = pointerState.buttonStates.get(button);
			if (buttonState === undefined) continue;

			let dragState = buttonState.dragState;
			if (dragState === undefined) {
				dragState = { startPosition: position };
				buttonState.dragState = dragState;

				if (this.pointers.size >= 2) {
					if (this.gestureState === null) {
						const startPosition = { x: 0, y: 0 };
						for (const pos of this.getPointerPositions()) {
							startPosition.x += pos.x;
							startPosition.y += pos.y;
						}
						startPosition.x /= this.pointers.size;
						startPosition.y /= this.pointers.size;

						const startRadius = { x: 1, y: 1 };
						for (const pos of this.getPointerPositions()) {
							startRadius.x *= pos.x - startPosition.x;
							startRadius.y *= pos.y - startPosition.y;
						}
						startRadius.x = Math.abs(startRadius.x) ** (1 / this.pointers.size);
						startRadius.y = Math.abs(startRadius.y) ** (1 / this.pointers.size);

						this.gestureState = {
							eventEmitter: new EventEmitter<GestureSequenceEventMap>(),
							startPosition,
							startRadius,
						};
						const ev: PEMGestureEvent = {
							position: startPosition,
							distance: { x: 0, y: 0 },
							scale: { x: 1, y: 1 },
							sessionEvents: this.gestureState.eventEmitter,
						};
						this.emit("gestureStart", ev);
					}
				} else {
					const ev = new PEMPointerEvent(buttonState, position, metaKey);
					this.emit("dragStart", ev);
					buttonState.eventEmitter.emit("dragStart", ev);
				}
			}

			if (this.pointers.size >= 2) {
				if (this.gestureState === null) {
					const startPosition = { x: 0, y: 0 };
					for (const pos of this.getPointerPositions()) {
						startPosition.x += pos.x;
						startPosition.y += pos.y;
					}
					startPosition.x /= this.pointers.size;
					startPosition.y /= this.pointers.size;

					const startRadius = { x: 1, y: 1 };
					for (const pos of this.getPointerPositions()) {
						startRadius.x *= pos.x - startPosition.x;
						startRadius.y *= pos.y - startPosition.y;
					}
					startRadius.x = Math.abs(startRadius.x) ** (1 / this.pointers.size);
					startRadius.y = Math.abs(startRadius.y) ** (1 / this.pointers.size);

					this.gestureState = {
						eventEmitter: new EventEmitter<GestureSequenceEventMap>(),
						startPosition,
						startRadius,
					};
					const ev: PEMGestureEvent = {
						position: startPosition,
						distance: { x: 0, y: 0 },
						scale: { x: 1, y: 1 },
						sessionEvents: this.gestureState.eventEmitter,
					};
					this.emit("gestureStart", ev);
				}

				const center = { x: 0, y: 0 };
				for (const pos of this.getPointerPositions()) {
					center.x += pos.x;
					center.y += pos.y;
				}
				center.x /= this.pointers.size;
				center.y /= this.pointers.size;

				const radius = { x: 1, y: 1 };
				for (const pos of this.getPointerPositions()) {
					radius.x *= pos.x - center.x;
					radius.y *= pos.y - center.y;
				}
				radius.x = Math.abs(radius.x) ** (1 / this.pointers.size);
				radius.y = Math.abs(radius.y) ** (1 / this.pointers.size);

				const ev: PEMGestureEvent = {
					position: center,
					distance: {
						x: center.x - this.gestureState.startPosition.x,
						y: center.y - this.gestureState.startPosition.y,
					},
					scale: {
						x: radius.x / this.gestureState.startRadius.x,
						y: radius.y / this.gestureState.startRadius.y,
					},
					sessionEvents: this.gestureState.eventEmitter,
				};
				this.emit("gestureChange", ev);
				this.gestureState.eventEmitter.emit("gestureChange", ev);
			} else {
				const ev = new PEMPointerEvent(buttonState, position, metaKey);
				this.emit("dragMove", ev);
				buttonState.eventEmitter.emit("dragMove", ev);
			}
		}
	};

	private readonly handlePointerUp = (
		pointerId: number,
		position: PositionSnapshot,
		button: MouseEventButton,
		metaKey: boolean,
		isMouse: boolean,
	) => {
		const pointerState = this.pointers.get(pointerId);
		if (pointerState === undefined) {
			console.warn(
				"Pointer up event received, but pointer state does not exist.",
				{
					pointerId: pointerId,
				},
			);
			return;
		}

		const buttonState = pointerState.buttonStates.get(button);
		if (buttonState === undefined) {
			console.warn(
				"Pointer up event received, but button is not marked as down.",
				{
					pointerId: pointerId,
					button: button,
				},
			);
			return;
		}

		const dragState = buttonState.dragState;
		if (dragState !== undefined) {
			buttonState.dragState = undefined;

			if (this.pointers.size === 1) {
				const ev = new PEMPointerEvent(buttonState, position, metaKey);
				this.emit("dragEnd", ev);
				buttonState.eventEmitter.emit("dragEnd", ev);
			}
		}

		if (this.gestureState !== null) {
			const center = { x: 0, y: 0 };
			for (const pos of this.getPointerPositions()) {
				center.x += pos.x;
				center.y += pos.y;
			}
			center.x /= this.pointers.size;
			center.y /= this.pointers.size;

			const ev: PEMGestureEvent = {
				position: center,
				distance: { x: 0, y: 0 },
				scale: { x: 1, y: 1 },
				sessionEvents: this.gestureState.eventEmitter,
			};
			this.emit("gestureEnd", ev);
			this.gestureState.eventEmitter.emit("gestureEnd", ev);
			this.gestureState = null;
		}

		pointerState.buttonStates.delete(button);
		if (!isMouse) {
			this.pointers.delete(pointerId);
		}

		const ev = new PEMPointerEvent(buttonState, position, metaKey);
		this.emit("pointerUp", ev);
		buttonState.eventEmitter.emit("pointerUp", ev);

		const duration = performance.now() - buttonState.downAt;
		const distance = Math.hypot(
			position.x - buttonState.downPosition.x,
			position.y - buttonState.downPosition.y,
		);

		const isTap =
			duration <= PointerEventManager.MAX_DURATION_FOR_TAP_IN_MS &&
			distance <= PointerEventManager.MAX_DISTANCE_FOR_TAP_IN_PIXEL;

		if (isTap) {
			const ev: PEMTapEvent = { position, button: buttonState.button, metaKey };
			this.emit("tap", ev);
			buttonState.eventEmitter.emit("tap", ev);

			const tapAt = performance.now();
			const isDoubleTap =
				this.firstTapForDoubleTap !== null &&
				tapAt - this.firstTapForDoubleTap.at <=
					PointerEventManager.MAX_DURATION_BETWEEN_TAPS_IN_MS &&
				Math.hypot(
					position.x - this.firstTapForDoubleTap.position.x,
					position.y - this.firstTapForDoubleTap.position.y,
				) <= PointerEventManager.MAX_DISTANCE_BETWEEN_TAPS_IN_PIXEL;

			if (isDoubleTap) {
				this.emit("doubleTap", {
					position,
					button: buttonState.button,
					metaKey,
				});
				this.firstTapForDoubleTap = null;
			} else {
				this.firstTapForDoubleTap = { position, at: tapAt };
			}
		}
	};
}

interface PointerSequenceEventMap {
	dragStart: [ev: PEMPointerEvent];
	dragMove: [ev: PEMPointerEvent];
	dragEnd: [ev: PEMPointerEvent];
	pointerUp: [ev: PEMPointerEvent];
	tap: [ev: PEMTapEvent];
}

interface PointerState {
	position: PositionSnapshot;
	buttonStates: Map<MouseEventButton, ButtonState>;
}

interface ButtonState {
	button: MouseEventButton;
	downPosition: PositionSnapshot;
	downAt: number;
	dragState: DragState | undefined;
	eventEmitter: EventEmitter<PointerSequenceEventMap>;
}

interface DragState {
	startPosition: PositionSnapshot;
}

interface GestureState {
	eventEmitter: EventEmitter<GestureSequenceEventMap>;
	/**
	 * ジェスチャ開始時における、タッチ点の中心(ジェスチャ中心)の位置
	 */
	startPosition: PositionSnapshot;
	/**
	 * ジェスチャ開始時における、ジェスチャ中心から各タッチ点までの距離の相乗平均
	 */
	startRadius: {
		readonly x: number;
		readonly y: number;
	};
}

export interface PEMMouseEvent {
	readonly button: MouseEventButton;
	readonly position: PositionSnapshot;
	readonly metaKey: boolean;
	readonly manager: PointerEventManager;
}

export class PEMPointerEvent {
	constructor(
		private readonly buttonState: ButtonState,
		public readonly position: PositionSnapshot,
		public readonly metaKey: boolean,
	) {}

	get button(): MouseEventButton {
		return this.buttonState.button;
	}

	get sessionEvents(): EventEmitter<PointerSequenceEventMap> {
		return this.buttonState.eventEmitter;
	}
}

export interface PEMTapEvent {
	readonly position: PositionSnapshot;
	readonly button: MouseEventButton;
	readonly metaKey: boolean;
}

interface GestureSequenceEventMap {
	gestureChange: [ev: PEMGestureEvent];
	gestureEnd: [ev: PEMGestureEvent];
}

export interface PEMGestureEvent {
	readonly position: PositionSnapshot;

	/**
	 * ジェスチャの拡大量
	 */
	readonly scale: { readonly x: number; readonly y: number };

	/**
	 * ジェスチャの移動量
	 */
	readonly distance: { readonly x: number; readonly y: number };
	readonly sessionEvents: EventEmitter<GestureSequenceEventMap>;
}
