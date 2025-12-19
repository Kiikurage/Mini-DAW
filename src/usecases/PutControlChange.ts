import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { EventBus } from "../EventBus.ts";
import type { ControlChange } from "../models/ControlChange.ts";
import type { ControlType } from "../models/ControlType.ts";

export const PutControlChangeKey =
	ComponentKey<PutControlChange>("PutControlChange");

export function PutControlChange({ bus }: { bus: EventBus }) {
	return (args: {
		channelId: number;
		type: ControlType;
		changes: Iterable<ControlChange>;
	}) => {
		bus.emitPhasedEvents("control.put", args);
	};
}

export type PutControlChange = ReturnType<typeof PutControlChange>;
