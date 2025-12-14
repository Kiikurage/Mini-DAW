import type { DIContainer } from "../Dependency/DIContainer.ts";
import type { Hashable } from "../Hashable.ts";
import { ExternalSoundFontInstrumentKey, PreInstalledSoundFontInstrumentKey, type SerializedExternalSoundFontInstrumentKey, type SerializedPreInstalledSoundFontInstrumentKey, } from "../SoundFontInstrument.ts";
import { type SerializedOscillatorNodeInstrumentKey, WebAudioOscillatorNodeInstrumentKey, } from "../WebAudioOscillatorNodeInstrument.ts";
import type { Instrument } from "./Instrument.ts";

export interface InstrumentKey extends Hashable {
	load(deps: DIContainer): Promise<Instrument>;

	serialize(): SerializedInstrumentKey;
}

export type SerializedInstrumentKey =
	| SerializedOscillatorNodeInstrumentKey
	| SerializedExternalSoundFontInstrumentKey
	| SerializedPreInstalledSoundFontInstrumentKey;

export namespace InstrumentKey {
	export function deserialize(data: SerializedInstrumentKey): InstrumentKey {
		switch (data.type) {
			case "oscillator":
				return WebAudioOscillatorNodeInstrumentKey.deserialize(data);
			case "sf":
				return ExternalSoundFontInstrumentKey.deserialize(data);
			case "preInstalledSF":
				return PreInstalledSoundFontInstrumentKey.deserialize(data);
			default:
				throw new Error(`Unknown instrument key type`, { cause: data });
		}
	}
}
