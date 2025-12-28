import { type RefCallback, useCallback, useEffectEvent } from "react";

type Callback = (entry: IntersectionObserverEntry) => void;

export class IntersectionObserverWrapper {
	private observer: IntersectionObserver;

	private static instance: IntersectionObserverWrapper | null = null;

	static getInstance(): IntersectionObserverWrapper {
		if (IntersectionObserverWrapper.instance === null) {
			IntersectionObserverWrapper.instance = new IntersectionObserverWrapper();
		}
		return IntersectionObserverWrapper.instance;
	}

	readonly callbacks = new Map<Element, Set<Callback>>();

	constructor() {
		this.observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				this.callbacks.get(entry.target)?.forEach((callback) => {
					callback(entry);
				});
			}
		});
	}

	/**
	 * Elementを監視する
	 * @param target
	 * @param callback
	 * @return 監視解除関数
	 */
	observe(target: Element, callback: Callback): () => void {
		let callbacks = this.callbacks.get(target);
		if (!callbacks) {
			this.observer.observe(target);
			callbacks = new Set<Callback>();
			this.callbacks.set(target, callbacks);
		}
		callbacks.add(callback);

		return () => {
			this.unobserve(target, callback);
		};
	}

	/**
	 * Elementの監視を解除する
	 * @param target
	 * @param callback
	 */
	unobserve(target: Element, callback: Callback) {
		const callbacks = this.callbacks.get(target);
		if (!callbacks) return;

		callbacks.delete(callback);
		if (callbacks.size === 0) {
			this.observer.unobserve(target);
			this.callbacks.delete(target);
		}
	}
}

export function useIntersectionObserver(
	callback: Callback,
): RefCallback<Element> {
	const onResize = useEffectEvent(callback);

	return useCallback((element) => {
		if (element === null) return;

		IntersectionObserverWrapper.getInstance().observe(element, onResize);
		return () => {
			IntersectionObserverWrapper.getInstance().unobserve(element, onResize);
		};
	}, []);
}
