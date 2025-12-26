import { useEffect, useEffectEvent, useState } from "react";

export const Pending = Symbol("PromiseState#Pending");
export type Pending = typeof Pending;

export const Initial = Symbol("PromiseState#Initial");
export type Initial = typeof Initial;

/**
 * Promiseの状態スナップショット
 */
export type PromiseState<T extends {}> = Initial | Pending | T | Error;

export namespace PromiseState {
	export function isInitial<T extends {}>(ps: PromiseState<T>): ps is Initial {
		return ps === Initial;
	}

	export function isPending<T extends {}>(ps: PromiseState<T>): ps is Pending {
		return ps === Pending;
	}

	export function isFulfilled<T extends {}>(ps: PromiseState<T>): ps is T {
		return !isInitial(ps) && !isPending(ps) && !isRejected(ps);
	}

	export function isRejected<T extends {}>(ps?: PromiseState<T>): ps is Error {
		return ps instanceof Error;
	}

	export function initial(): PromiseState<never> {
		return Initial;
	}

	export function pending(): PromiseState<never> {
		return Pending;
	}

	export function rejected(reason: unknown): PromiseState<never> {
		return new Error("Promise is rejected", { cause: reason });
	}
}

export function usePromiseState<T extends {}>(
	fn: () => Promise<T>,
): PromiseState<T> {
	const [state, setState] = useState<PromiseState<T>>(PromiseState.pending());

	const run = useEffectEvent(() => {
		fn()
			.then((value) => setState(value))
			.catch((error) => setState(PromiseState.rejected(error)));
	});
	useEffect(() => run(), []);

	return state;
}
