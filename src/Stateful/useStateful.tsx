import { useSyncExternalStore } from "react";
import type { Stateful } from "./Stateful.ts";

export function useStateful<T, E extends Record<string, unknown[]>>(
	stateful: Stateful<T, E>,
): T;
export function useStateful<T, E extends Record<string, unknown[]>, U>(
	stateful: Stateful<T, E>,
	mapper: (state: T) => U,
): U;
export function useStateful<T, E extends Record<string, unknown[]>, U = T>(
	stateful: Stateful<T, E>,
	mapper?: (state: T) => U,
): U {
	mapper = mapper ?? ((state: T) => state as unknown as U);
	return useSyncExternalStore(
		(subscribe) => {
			return stateful.addChangeListener(subscribe);
		},
		() => mapper(stateful.state),
	);
}
