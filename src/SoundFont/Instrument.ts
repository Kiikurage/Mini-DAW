import { assertNotNullish } from "../lib.ts";
import type { InstrumentZone } from "./InstrumentZone.ts";
import type { INST, PDTA } from "./sf2.ts";

export class Instrument {
	constructor(
		readonly name: string,
		readonly zones: InstrumentZone[],
	) {}

	static create(
		pdta: PDTA,
		inst: INST,
		instIndex: number,
		zones: InstrumentZone[],
	): Instrument {
		const zoneIndexFrom = pdta.inst[instIndex]?.bagIndex;
		const zoneIndexTo = pdta.inst[instIndex + 1]?.bagIndex;
		assertNotNullish(zoneIndexFrom);
		assertNotNullish(zoneIndexTo);

		return new Instrument(inst.name, zones.slice(zoneIndexFrom, zoneIndexTo));
	}

	getZones(key: number, velocity: number): InstrumentZone[] {
		const zones: InstrumentZone[] = [];

		for (const zone of this.zones) {
			if (!zone.keyRange.includes(key)) continue;
			if (!zone.velocityRange.includes(velocity)) continue;
			if (zone.sample === null) continue;

			zones.push(zone);
		}

		return zones;
	}
}
