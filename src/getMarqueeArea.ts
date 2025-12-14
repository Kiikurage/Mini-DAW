import type { PianoRollArea } from "./models/PianoRollArea.ts";

export function getMarqueeArea(
	marqueeAreaFrom: null | { key: number; tick: number },
	marqueeAreaTo: null | { key: number; tick: number },
): null | PianoRollArea {
	if (marqueeAreaFrom === null || marqueeAreaTo === null) {
		return null;
	}

	return {
		tickFrom: Math.min(marqueeAreaFrom.tick, marqueeAreaTo.tick),
		tickTo: Math.max(marqueeAreaTo.tick, marqueeAreaFrom.tick) + 1,
		keyFrom: Math.min(marqueeAreaFrom.key, marqueeAreaTo.key),
		keyTo: Math.max(marqueeAreaTo.key, marqueeAreaFrom.key) + 1,
	};
}
