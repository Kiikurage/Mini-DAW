import { type RefCallback, useCallback } from "react";

type Callback = (entry: ResizeObserverEntry) => void;

export class ResizeObserverWrapper {
	private resizeObserver: ResizeObserver;

	private static instance: ResizeObserverWrapper | null = null;

	static getInstance(): ResizeObserverWrapper {
		if (ResizeObserverWrapper.instance === null) {
			ResizeObserverWrapper.instance = new ResizeObserverWrapper();
		}
		return ResizeObserverWrapper.instance;
	}

	readonly callbacks = new Map<Element, Set<Callback>>();

	constructor() {
		this.resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				this.callbacks.get(entry.target)?.forEach((callback) => {
					callback(entry);
				});
			}
		});
	}

	/**
	 * Elementのサイズ変更を監視する
	 * @param target
	 * @param callback
	 * @return 監視解除関数
	 */
	observe(target: Element, callback: Callback): () => void {
		let callbacks = this.callbacks.get(target);
		if (!callbacks) {
			this.resizeObserver.observe(target);
			callbacks = new Set<Callback>();
			this.callbacks.set(target, callbacks);
		}
		callbacks.add(callback);

		return () => {
			this.unobserve(target, callback);
		};
	}

	/**
	 * Elementのサイズ変更の監視を解除する
	 * @param target
	 * @param callback
	 */
	unobserve(target: Element, callback: Callback) {
		const callbacks = this.callbacks.get(target);
		if (!callbacks) return;

		callbacks.delete(callback);
		if (callbacks.size === 0) {
			this.resizeObserver.unobserve(target);
			this.callbacks.delete(target);
		}
	}
}

export function useResizeObserver(callback: Callback): RefCallback<Element> {
	return useCallback(
		(element) => {
			if (element === null) return;

			ResizeObserverWrapper.getInstance().observe(element, callback);
			return () => {
				ResizeObserverWrapper.getInstance().unobserve(element, callback);
			};
		},
		[callback],
	);
}
