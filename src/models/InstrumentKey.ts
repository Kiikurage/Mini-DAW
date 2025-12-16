import { PreInstalledSouindFonts } from "../PreInstalledSouindFonts.ts";

export class InstrumentKey {
	public readonly url: string;

	constructor(
		public readonly name: string,
		public readonly presetNumber: number,
		public readonly bankNumber: number,
	) {
		const preInstalledSoundFont = PreInstalledSouindFonts.find(
			(sf) => sf.name === name,
		);
		if (preInstalledSoundFont === undefined) {
			throw new Error(`Pre-installed sound font "${name}" not found.`);
		}

		this.url = preInstalledSoundFont.soundFontUrl;
	}

	serialize(): SerializedInstrumentKey {
		return {
			name: this.name,
			presetNumber: this.presetNumber,
			bankNumber: this.bankNumber,
		};
	}

	static deserialize(data: SerializedInstrumentKey): InstrumentKey {
		return new InstrumentKey(data.name, data.presetNumber, data.bankNumber);
	}
}

export interface SerializedInstrumentKey {
	name: string;
	presetNumber: number;
	bankNumber: number;
}
