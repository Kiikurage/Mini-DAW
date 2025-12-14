import { assertNotNullish } from "../lib.ts";
import type { Instrument } from "./Instrument.ts";
import { type IGEN, type PGEN, SFGenerator } from "./sf2.ts";
import { type Zone, ZoneImpl } from "./Zone.ts";

export interface PresetZone extends Zone {
	/**
	 * このゾーンが参照するインストゥルメント
	 */
	readonly instrument: Instrument | null;
}

export class PresetZoneImpl extends ZoneImpl implements PresetZone {
	instrument: Instrument | null = null;

	copy() {
		const zone = new PresetZoneImpl();
		Object.assign(zone, this);
		return zone;
	}

	override applyGenerator(
		gen: IGEN | PGEN,
		getInstrument: (instrumentNumber: number) => Instrument | null,
	) {
		switch (gen.generator) {
			case SFGenerator.INSTRUMENT: {
				const instrumentNumber = gen.amount.getUint16(0, true);
				const instrument = getInstrument(instrumentNumber);
				assertNotNullish(instrument);
				this.instrument = instrument;
				break;
			}
			default: {
				super.applyGenerator(gen);
			}
		}
	}
}
