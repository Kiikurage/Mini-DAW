import { MouseEventButton } from "../constants.ts";
import { addListener, isNotNullish } from "../lib.ts";
import { EventEmitter } from "../Stateful/EventEmitter.ts";
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
						const startPosition = [...this.getPointerPositions()].reduce<{
							x: number;
							y: number;
						}>(
							(acc, pos) => {
								acc.x += pos.x / this.pointers.size;
								acc.y += pos.y / this.pointers.size;
								return acc;
							},
							{ x: 0, y: 0 },
						);

						this.gestureState = {
							eventEmitter: new EventEmitter<GestureSequenceEventMap>(),
							startPosition,
						};
						const ev: PEMGestureEvent = {
							distance: { x: 0, y: 0 },
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
					const startPosition = [...this.getPointerPositions()].reduce<{
						x: number;
						y: number;
					}>(
						(acc, pos) => {
							acc.x += pos.x / this.pointers.size;
							acc.y += pos.y / this.pointers.size;
							return acc;
						},
						{ x: 0, y: 0 },
					);

					this.gestureState = {
						eventEmitter: new EventEmitter<GestureSequenceEventMap>(),
						startPosition,
					};
					const ev: PEMGestureEvent = {
						distance: { x: 0, y: 0 },
						sessionEvents: this.gestureState.eventEmitter,
					};
					this.emit("gestureStart", ev);
				}

				const currentCenter = [...this.getPointerPositions()].reduce<{
					x: number;
					y: number;
				}>(
					(acc, pos) => {
						acc.x += pos.x / this.pointers.size;
						acc.y += pos.y / this.pointers.size;
						return acc;
					},
					{ x: 0, y: 0 },
				);

				const ev: PEMGestureEvent = {
					distance: {
						x: currentCenter.x - this.gestureState.startPosition.x,
						y: currentCenter.y - this.gestureState.startPosition.y,
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
			const ev: PEMGestureEvent = {
				distance: { x: 0, y: 0 },
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
	startPosition: PositionSnapshot;
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
	// position: PositionSnapshot;
	// button: MouseEventButton;
	distance: { x: number; y: number };
	sessionEvents: EventEmitter<GestureSequenceEventMap>;
}
