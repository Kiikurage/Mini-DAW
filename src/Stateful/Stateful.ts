import { EventEmitter } from "./EventEmitter.ts";

/**
 * A class that manages subscribable state.
 *
 * @example
 * ```typescript
 * class Counter extends Stateful<number> {
 *   increment() {
 *     this.updateState((prev) => prev + 1);
 *   }
 *   decrement() {
 *     this.updateState((prev) => prev - 1);
 *   }
 * }
 * ```
 */
export class Stateful<
	T,
	E extends Record<string, unknown[]> = Record<string, any>,
> extends EventEmitter<E> {
	private stateListeners: Set<(state: T) => void> = new Set();
	#state: T;

	constructor(initialState: T) {
		super();
		this.#state = initialState;
	}

	get state(): T {
		return this.#state;
	}

	addChangeListener(listener: (state: T) => void): () => void {
		this.stateListeners.add(listener);
		return () => {
			this.stateListeners.delete(listener);
		};
	}

	protected setState(newState: T): void {
		if (this.#state === newState) return;
		this.#state = newState;
		for (const listener of this.stateListeners) {
			listener(this.#state);
		}
	}

	protected updateState(updater: (prevState: T) => T): void {
		this.setState(updater(this.#state));
	}
}

export type StateOnly<T> = T extends Stateful<infer S, infer E>
	? Stateful<S, E>
	: never;
