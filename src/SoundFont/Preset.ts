import { NUM_KEYS } from "../constants.ts";
import { assertNotNullish } from "../lib.ts";
import type { InstrumentZone } from "./InstrumentZone.ts";
import type { PresetZone } from "./PresetZone.ts";
import type { PDTA } from "./sf2.ts";

export class Preset {
	readonly name: string;
	readonly zones: PresetZone[];
	readonly presetNumber: number;
	readonly bankNumber: number;

	constructor(props: {
		name: string;
		zones: PresetZone[];
		presetNumber: number;
		bankNumber: number;
	}) {
		this.name = props.name;
		this.zones = props.zones;
		this.presetNumber = props.presetNumber;
		this.bankNumber = props.bankNumber;
	}

	static create(pdta: PDTA, phdrIndex: number, zones: PresetZone[]) {
		const phdr = pdta.phdr[phdrIndex];
		assertNotNullish(phdr);

		const zoneIndexFrom = pdta.phdr[phdrIndex]?.bagIndex;
		const zoneIndexTo = pdta.phdr[phdrIndex + 1]?.bagIndex;
		assertNotNullish(zoneIndexFrom);
		assertNotNullish(zoneIndexTo);

		return new Preset({
			name: phdr.name,
			presetNumber: phdr.preset,
			bankNumber: phdr.bank,
			zones: zones.slice(zoneIndexFrom, zoneIndexTo),
		});
	}

	getInstrumentZones(key: number, velocity: number): InstrumentZone[] {
		const zones: InstrumentZone[] = [];

		for (const zone of this.zones) {
			if (!zone.keyRange.includes(key)) continue;
			if (!zone.velocityRange.includes(velocity)) continue;
			if (zone.instrument === null) continue;

			zones.push(...zone.instrument.getZones(key, velocity));
		}

		return zones;
	}

	getNoLoopKeys(): Set<number> {
		const noLoopKeys = new Set<number>();
		for (let key = 0; key < NUM_KEYS; key++) {
			noLoopKeys.add(key);
		}

		for (const zone of this.zones) {
			if (zone.instrument === null) continue;

			for (const instZone of zone.instrument.zones) {
				if (instZone.sampleMode === "no_loop") continue;

				for (
					let key = instZone.keyRange.min;
					key <= instZone.keyRange.max;
					key++
				) {
					noLoopKeys.delete(key);
				}
			}
		}

		return noLoopKeys;
	}
}
