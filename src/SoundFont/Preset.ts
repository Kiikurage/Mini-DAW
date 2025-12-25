import type { InstrumentZone } from "./InstrumentZone.ts";

/**
 * パース済みのSoundFont2のPresetを表すデータクラス。
 * 各種プロパティや波形データはアクセスしやすい形に変換されている。
 */
export class Preset {
	readonly name: string;
	readonly entries: readonly InstrumentZone[];
	readonly presetNumber: number;
	readonly bankNumber: number;
	readonly loopKeys: ReadonlySet<number>;

	constructor(props: {
		name: string;
		entires: InstrumentZone[];
		presetNumber: number;
		bankNumber: number;
	}) {
		this.name = props.name;
		this.entries = props.entires;
		this.presetNumber = props.presetNumber;
		this.bankNumber = props.bankNumber;

		const loopKeys = new Set<number>();
		for (const entry of this.entries) {
			if (entry.sampleMode === "no_loop") continue;
			for (let key = entry.keyRange.min; key <= entry.keyRange.max; key++) {
				loopKeys.add(key);
			}
		}
		this.loopKeys = loopKeys;
	}

	getInstrumentZones(key: number, velocity: number): InstrumentZone[] {
		const entries: InstrumentZone[] = [];

		for (const entry of this.entries) {
			if (!entry.keyRange.includes(key)) continue;
			if (!entry.velocityRange.includes(velocity)) continue;

			entries.push(entry);
		}

		return entries;
	}
}
