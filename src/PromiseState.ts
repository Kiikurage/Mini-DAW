const StatusSymbol = Symbol("PromiseState#status");
const ReasonSymbol = Symbol("PromiseState#reason");

export interface PendingPromiseState {
	[StatusSymbol]: "pending";
	[ReasonSymbol]?: undefined;
}
export interface RejectedPromiseState {
	[StatusSymbol]: "rejected";
	[ReasonSymbol]: unknown;
}

/**
 * Promiseの状態スナップショット
 */
export type PromiseState<T extends {}> =
	| PendingPromiseState
	| T
	| RejectedPromiseState;

export namespace PromiseState {
	export function isPending<T extends {}>(
		ps?: PromiseState<T>,
	): ps is PendingPromiseState {
		return (
			ps !== undefined && StatusSymbol in ps && ps[StatusSymbol] === "pending"
		);
	}

	export function isFulfilled<T extends {}>(ps?: PromiseState<T>): ps is T {
		return ps !== undefined && !(StatusSymbol in ps);
	}

	export function isRejected<T extends {}>(
		ps?: PromiseState<T>,
	): ps is RejectedPromiseState {
		return (
			ps !== undefined && StatusSymbol in ps && ps[StatusSymbol] === "rejected"
		);
	}

	const PendingPromiseStateInstance: PromiseState<never> = {
		[StatusSymbol]: "pending",
	};

	export function pending(): PromiseState<never> {
		return PendingPromiseStateInstance;
	}

	export function rejected(reason: unknown): PromiseState<never> {
		return {
			[StatusSymbol]: "rejected",
			[ReasonSymbol]: reason,
		};
	}
}
