import { MouseEventButton, MouseEventButtonMask } from "../constants.ts";
import { assertNotNullish } from "../lib.ts";
import type { PointerEventManagerDoubleClickEvent } from "./PointerEventManagerDoubleClickEvent.ts";
import type { PointerEventManagerEvent } from "./PointerEventManagerEvent.ts";
import type { PointerEventManagerInteractionHandle } from "./PointerEventManagerInteractionHandle.ts";
import type { PositionSnapshot } from "./PositionSnapshot.ts";

/**
 * Canvasに独自に描画するUIの基底クラス
 */
export class PointerEventManager {
	/**
	 * タップと見なす最大の継続時間（ミリ秒単位）。これより長い時間のホールドではtapイベントは発生しない。
	 */
	private static readonly MAX_DURATION_FOR_TAP_IN_MS = 180;

	/**
	 * タップと見なす最大の移動距離（ピクセル単位）。これより大きく移動した場合、tapイベントは発生しない。
	 */
	private static readonly MAX_DISTANCE_FOR_TAP_IN_PIXEL = 8;

	readonly pointers = new Map<number, PointerState>();

	constructor(private readonly delegate: PointerEventManagerDelegate) {}

	readonly handlePointerDown = (nativeEvent: PointerEvent) => {
		const position = this.resolvePosition(nativeEvent);

		let state = this.pointers.get(nativeEvent.pointerId);
		if (state === undefined) {
			state = { position, sessions: new Map() };
			this.pointers.set(nativeEvent.pointerId, state);
		}

		const session: PointerSession = {
			button: nativeEvent.button,
			dragging: "ready",
			startPosition: position,
			readyAt: nativeEvent.timeStamp,
			dragStartListeners: new Set(),
			dragMoveListeners: new Set(),
			dragEndListeners: new Set(),
			pointerUpListeners: new Set(),
			tapListeners: new Set(),
		};
		state.sessions.set(nativeEvent.button, session);

		const ev = new PointerEventManagerEventImpl(position, nativeEvent, session);
		this.delegate.findHandle(position)?.handlePointerDown?.(ev);
	};

	readonly handlePointerMove = (nativeEvent: PointerEvent) => {
		const position = this.resolvePosition(nativeEvent);

		let state = this.pointers.get(nativeEvent.pointerId);
		if (state === undefined) {
			state = { position, sessions: new Map() };
			this.pointers.set(nativeEvent.pointerId, state);
		}
		state.position = position;

		this.delegate.onPointerMove?.();

		const handle = this.delegate.findHandle(position);
		this.delegate.setCursor(handle?.cursor ?? "default");

		for (const button of [
			MouseEventButton.PRIMARY,
			MouseEventButton.MIDDLE,
			MouseEventButton.AUXILIARY,
		]) {
			if ((nativeEvent.buttons & MouseEventButtonMask[button]) === 0) continue;

			const session = state.sessions.get(button);
			if (session === undefined) continue;

			if (session.dragging === "dragging") {
				this.handleDragMove(position, nativeEvent, session);
			} else if (session.dragging === "ready") {
				this.handleDragStart(position, nativeEvent, session);
			}
		}
	};

	readonly handlePointerUp = (nativeEvent: PointerEvent) => {
		const position = this.resolvePosition(nativeEvent);

		const state = this.pointers.get(nativeEvent.pointerId);
		assertNotNullish(state);

		this.handleDragEnd(position, nativeEvent, state);

		if (nativeEvent.pointerType !== "mouse") {
			this.pointers.delete(nativeEvent.pointerId);
		}

		const session = state.sessions.get(nativeEvent.button);
		if (session !== undefined) {
			state.sessions.delete(nativeEvent.button);

			const ev = new PointerEventManagerEventImpl(
				position,
				nativeEvent,
				session,
			);

			for (const listener of session.pointerUpListeners) {
				listener(ev);
			}
			this.delegate.findHandle(position)?.handlePointerUp?.(ev);

			const distance = Math.hypot(
				session.startPosition.x - position.x,
				session.startPosition.y - position.y,
			);
			const duration = nativeEvent.timeStamp - session.readyAt;
			if (
				duration < PointerEventManager.MAX_DURATION_FOR_TAP_IN_MS &&
				distance < PointerEventManager.MAX_DISTANCE_FOR_TAP_IN_PIXEL
			) {
				this.handleTap(position, nativeEvent, session);
			}
		}
	};

	readonly handleDoubleClick = (nativeEvent: MouseEvent) => {
		const position = this.resolvePosition(nativeEvent);
		const ev: PointerEventManagerDoubleClickEvent = {
			position,
			button: nativeEvent.button,
			metaKey: nativeEvent.metaKey,
		};

		this.delegate.findHandle(position)?.handleDoubleClick?.(ev);
	};

	private handleDragStart(
		position: PositionSnapshot,
		nativeEvent: PointerEvent,
		session: PointerSession,
	) {
		if (session.dragging !== "ready") return;
		session.dragging = "dragging";

		const ev = new PointerEventManagerEventImpl(position, nativeEvent, session);
		for (const listener of session.dragStartListeners) {
			listener(ev);
		}
		this.delegate.findHandle(position)?.handleDragStart?.(ev);
	}

	private handleDragMove(
		position: PositionSnapshot,
		nativeEvent: PointerEvent,
		session: PointerSession,
	) {
		if (session.dragging !== "dragging") return;

		const ev = new PointerEventManagerEventImpl(position, nativeEvent, session);
		for (const listener of session.dragMoveListeners) {
			listener(ev);
		}
		this.delegate.findHandle(position)?.handleDragMove?.(ev);
	}

	private handleDragEnd(
		position: PositionSnapshot,
		nativeEvent: PointerEvent,
		state: PointerState,
	) {
		const session = state.sessions.get(nativeEvent.button);
		if (session === undefined || session.dragging !== "dragging") {
			return;
		}
		session.dragging = "ended";

		const ev = new PointerEventManagerEventImpl(position, nativeEvent, session);
		for (const listener of session.dragEndListeners) {
			listener(ev);
		}
		this.delegate.findHandle(position)?.handleDragEnd?.(ev);
	}

	private handleTap(
		position: PositionSnapshot,
		nativeEvent: PointerEvent,
		session: PointerSession,
	) {
		const ev = new PointerEventManagerEventImpl(position, nativeEvent, session);
		for (const listener of session.tapListeners) {
			listener(ev);
		}
		this.delegate.findHandle(position)?.handleTap?.(ev);
	}

	/**
	 * マウスイベントのスクリーン座標系からCanvasUI上の論理座標を解決する。
	 * @param ev
	 * @private
	 */
	private resolvePosition(ev: MouseEvent): PositionSnapshot {
		const { scrollLeft, scrollTop } = this.delegate.getScrollPosition();
		const { width, height } = this.delegate.getSize();

		return {
			x: ev.offsetX,
			y: ev.offsetY,
			scrollLeft,
			scrollTop,
			width,
			height,
			zoom: this.delegate.getZoomLevel(),
		};
	}
}

export interface PointerEventManagerDelegate {
	/**
	 * 座標から、ドラッグハンドルを探す。ハンドルが複数重なっている場合には優先すべきハンドルを解決して返す。
	 * @private
	 */
	findHandle(
		position: PositionSnapshot,
	): PointerEventManagerInteractionHandle | null;

	/**
	 * カーソルを設定する。
	 * @param cursor
	 * @protected
	 */
	setCursor(cursor: string): void;

	/**
	 * Canvasのサイズを取得する。
	 */
	getSize(): { width: number; height: number };

	/**
	 * スクロール位置を取得する。
	 */
	getScrollPosition(): { scrollLeft: number; scrollTop: number };

	/**
	 * 拡大率を取得する。
	 * @returns 拡大率。等倍の場合は1。
	 */
	getZoomLevel(): number;

	/**
	 * ポインタが移動したときに呼び出され、追加の処理を実装可能。
	 * @protected
	 */
	onPointerMove?(): void;
}

interface PointerState {
	position: PositionSnapshot;
	readonly sessions: Map<number, PointerSession>;
}

interface PointerSession {
	button: number;
	dragging: "ready" | "dragging" | "ended";
	startPosition: PositionSnapshot;
	readyAt: number;
	dragStartListeners: Set<(ev: PointerEventManagerEvent) => void>;
	dragMoveListeners: Set<(ev: PointerEventManagerEvent) => void>;
	dragEndListeners: Set<(ev: PointerEventManagerEvent) => void>;
	pointerUpListeners: Set<(ev: PointerEventManagerEvent) => void>;
	tapListeners: Set<(ev: PointerEventManagerEvent) => void>;
}

class PointerEventManagerEventImpl implements PointerEventManagerEvent {
	constructor(
		public readonly position: PositionSnapshot,
		private readonly nativeEvent: MouseEvent,
		private readonly dragSession: PointerSession,
	) {}

	get button() {
		return this.dragSession.button;
	}

	get metaKey() {
		return this.nativeEvent.metaKey;
	}

	get dragging(): "ready" | "dragging" | "ended" {
		return this.dragSession.dragging;
	}

	get startPosition(): PositionSnapshot {
		return this.dragSession.startPosition;
	}

	addDragStartSessionListener(
		listener: (ev: PointerEventManagerEvent) => void,
	): () => void {
		this.dragSession.dragStartListeners.add(listener);
		return () => this.dragSession.dragStartListeners.delete(listener);
	}

	addDragMoveSessionListener(
		listener: (ev: PointerEventManagerEvent) => void,
	): () => void {
		this.dragSession.dragMoveListeners.add(listener);
		return () => this.dragSession.dragMoveListeners.delete(listener);
	}

	addDragEndSessionListener(
		listener: (ev: PointerEventManagerEvent) => void,
	): () => void {
		this.dragSession.dragEndListeners.add(listener);
		return () => this.dragSession.dragEndListeners.delete(listener);
	}

	addPointerUpSessionListener(
		listener: (ev: PointerEventManagerEvent) => void,
	): () => void {
		this.dragSession.pointerUpListeners.add(listener);
		return () => this.dragSession.pointerUpListeners.delete(listener);
	}

	addTapSessionListener(
		listener: (ev: PointerEventManagerEvent) => void,
	): () => void {
		this.dragSession.tapListeners.add(listener);
		return () => this.dragSession.tapListeners.delete(listener);
	}
}
