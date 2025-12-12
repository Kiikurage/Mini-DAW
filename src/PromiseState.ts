export interface PendingPromiseState {
	status: "pending";
	value: undefined;
	reason: undefined;
}

export interface FulfilledPromiseState<T> {
	status: "fulfilled";
	value: T;
	reason: undefined;
}

export interface RejectedPromiseState {
	status: "rejected";
	value: undefined;
	reason: unknown;
}

/**
 * Promiseの状態スナップショット
 */
export type PromiseState<T> =
	| PendingPromiseState
	| FulfilledPromiseState<T>
	| RejectedPromiseState;

export namespace PromiseState {
	export function pending<T>(): PromiseState<T> {
		return { status: "pending", value: undefined, reason: undefined };
	}

	export function fulfilled<T>(value: T): PromiseState<T> {
		return { status: "fulfilled", value, reason: undefined };
	}

	export function rejected<T>(reason: unknown): PromiseState<T> {
		return { status: "rejected", value: undefined, reason };
	}
}
