import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import type { ControlType } from "../models/ControlType.ts";

export const PutControlChangeKey =
	ComponentKey<PutControlChange>("PutControlChange");

export function PutControlChange({ bus }: { bus: EventBus }) {
	return (args: {
		channelId: number;
		type: ControlType;
		ticks: Iterable<number>;
		value: number;
	}) => {
		bus.emitPhasedEvents("control.put", args);
	};
}

export type PutControlChange = ReturnType<typeof PutControlChange>;
