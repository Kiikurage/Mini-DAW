import { assertNotNullish } from "../lib.ts";
import { Instrument } from "./Instrument.ts";
import { type InstrumentZone, InstrumentZoneImpl } from "./InstrumentZone.ts";
import { Preset } from "./Preset.ts";
import { type PresetZone, PresetZoneImpl } from "./PresetZone.ts";
import { RIFF } from "./RIFF.ts";
import { Sample } from "./Sample.ts";
import { type IBAG, type IGEN, type IMOD, type INST, parsePDTA, parseSDTA, type PBAG, type PDTA, type PGEN, type PHDR, type PMOD, type SDTA, } from "./sf2.ts";

export class SoundFont {
	private readonly presetHeaders: ReadonlyMap<
		/* prset number */ number,
		ReadonlyMap</* bank number */ number, IndexedPresetHeader>
	>;
	private readonly instrumentHeaders: readonly IndexedInstrument[];

	private readonly cachedPresets: Map<number, Map<number, Preset>> = new Map();

	constructor(
		private readonly sdta: SDTA,
		private readonly pdta: PDTA,
	) {
		const presetBags: IndexedPresetBag[] = [];
		for (let i = 0; i < pdta.pbag.length - 1; i++) {
			const pbag = pdta.pbag[i];
			const nextPbag = pdta.pbag[i + 1];
			assertNotNullish(pbag);
			assertNotNullish(nextPbag);

			presetBags.push({
				pbag,
				generators: pdta.pgen.slice(
					pbag.generatorIndex,
					nextPbag.generatorIndex,
				),
				modulators: pdta.pmod.slice(
					pbag.modulatorIndex,
					nextPbag.modulatorIndex,
				),
			});
		}

		const presetHeaders = new Map<number, Map<number, IndexedPresetHeader>>();
		for (let i = 0; i < pdta.phdr.length - 1; i++) {
			const phdr = pdta.phdr[i];
			const nextPhdr = pdta.phdr[i + 1];
			assertNotNullish(phdr);
			assertNotNullish(nextPhdr);

			let bankMap = presetHeaders.get(phdr.preset);
			if (bankMap === undefined) {
				bankMap = new Map<number, IndexedPresetHeader>();
				presetHeaders.set(phdr.preset, bankMap);
			}
			bankMap.set(phdr.bank, {
				phdr: phdr,
				pbags: presetBags.slice(phdr.bagIndex, nextPhdr.bagIndex),
			});
		}
		this.presetHeaders = presetHeaders;

		const instrumentBags: IndexedInstrumentBag[] = [];
		for (let i = 0; i < pdta.ibag.length - 1; i++) {
			const ibag = pdta.ibag[i];
			const nextIbag = pdta.ibag[i + 1];
			assertNotNullish(ibag);
			assertNotNullish(nextIbag);
			instrumentBags.push({
				ibag,
				generators: pdta.igen.slice(
					ibag.generatorIndex,
					nextIbag.generatorIndex,
				),
				modulators: pdta.imod.slice(
					ibag.modulatorIndex,
					nextIbag.modulatorIndex,
				),
			});
		}

		const instrumentHeaders: IndexedInstrument[] = [];
		for (let i = 0; i < pdta.inst.length - 1; i++) {
			const inst = pdta.inst[i];
			const nextInst = pdta.inst[i + 1];
			assertNotNullish(inst);
			assertNotNullish(nextInst);
			instrumentHeaders.push({
				inst,
				ibags: instrumentBags.slice(inst.bagIndex, nextInst.bagIndex),
			});
		}
		this.instrumentHeaders = instrumentHeaders;
	}

	/**
	 * 各プリセット番号について、プリセットの名前を取得する。
	 * 複数バンクに同じプリセット番号が存在する場合、最初に見つかったものを返す。
	 */
	getPresetNames(): {
		number: number;
		name: string;
		bankMap: ReadonlyMap<number, IndexedPresetHeader>;
	}[] {
		const presetNames: {
			number: number;
			name: string;
			bankMap: ReadonlyMap<number, IndexedPresetHeader>;
		}[] = [];

		for (const [presetNumber, bankMap] of this.presetHeaders) {
			const firstBankHeader = bankMap.values().next().value;
			if (firstBankHeader === undefined) continue;

			presetNames.push({
				number: presetNumber,
				name: firstBankHeader.phdr.name,
				bankMap: bankMap,
			});
		}

		presetNames.sort((a, b) => a.number - b.number);
		return presetNames;
	}

	/**
	 * 指定されたプリセット番号に対応するすべてのバンクのプリセットを取得する。
	 * @param presetNumber
	 */
	getPresetsByPresetNumber(presetNumber: number): Preset[] {
		const bankMap = this.presetHeaders.get(presetNumber);
		if (bankMap === undefined) return [];

		const presets: Preset[] = [];
		for (const bankNumber of bankMap.keys()) {
			const preset = this.getPreset(presetNumber, bankNumber);
			if (preset !== null) {
				presets.push(preset);
			}
		}

		presets.sort((a, b) => a.bankNumber - b.bankNumber);
		return presets;
	}

	/**
	 * 指定されたプリセット番号とバンク番号に対応するプリセットを取得する。
	 */
	getPreset(presetNumber: number, bankNumber: number): Preset | null {
		const cached = this.cachedPresets.get(presetNumber)?.get(bankNumber);
		if (cached !== undefined) return cached;

		const preset = this.loadPreset(presetNumber, bankNumber);
		if (preset === null) return null;

		let bankMap = this.cachedPresets.get(presetNumber);
		if (bankMap === undefined) {
			bankMap = new Map<number, Preset>();
			this.cachedPresets.set(presetNumber, bankMap);
		}
		bankMap.set(bankNumber, preset);

		return preset;
	}

	/**
	 * SoundFont2をパースする。
	 * @param buffer
	 */
	static async parse(buffer: ArrayBuffer) {
		const chunk = RIFF.parse(buffer);
		const sdta = parseSDTA(chunk.chunks[1] as RIFF.ListChunk);
		const pdta = parsePDTA(chunk.chunks[2] as RIFF.ListChunk);

		return new SoundFont(sdta, pdta);
	}

	/**
	 * URLからSoundFont2をロードしてパースする。
	 * @param url
	 */
	static async load(url: string) {
		const res = await fetch(url);
		const buffer = await res.arrayBuffer();

		return SoundFont.parse(buffer);
	}

	/**
	 * 指定されたプリセット番号とバンク番号に対応するプリセットを取得する。
	 */
	private loadPreset(presetNumber: number, bankNumber: number): Preset | null {
		const header = this.presetHeaders.get(presetNumber)?.get(bankNumber);
		if (header === undefined) return null;

		let globalZone: PresetZoneImpl | null = null;
		const zones: PresetZone[] = [];
		for (const pbag of header.pbags) {
			const zone: PresetZoneImpl = globalZone?.copy() ?? new PresetZoneImpl();

			for (const pgen of pbag.generators) {
				zone.applyGenerator(pgen, (instrumentNumber) =>
					this.loadInstrument(instrumentNumber),
				);
			}

			if (zone.instrument === null) {
				globalZone = zone;
			} else {
				zones.push(zone);
			}
		}

		return new Preset({
			name: header.phdr.name,
			presetNumber: header.phdr.preset,
			bankNumber: header.phdr.bank,
			zones: zones,
		});
	}

	/**
	 * 指定されたインストゥルメント番号に対応するインストゥルメントを取得する。
	 * @param instrumentNumber
	 */
	private loadInstrument(instrumentNumber: number): Instrument | null {
		const header = this.instrumentHeaders[instrumentNumber];
		if (header === undefined) return null;

		let globalZone: InstrumentZoneImpl | null = null;
		const zones: InstrumentZone[] = [];
		for (const ibag of header.ibags) {
			const zone: InstrumentZoneImpl =
				globalZone?.copy() ?? new InstrumentZoneImpl();

			for (const igen of ibag.generators) {
				zone.applyGenerator(igen, (sampleNumber) =>
					this.loadSample(sampleNumber),
				);
			}

			if (zone.sample === null) {
				globalZone = zone;
			} else {
				zones.push(zone);
			}
		}

		return new Instrument(header.inst.name, zones);
	}

	/**
	 * 指定されたサンプル番号に対応するサンプルを取得する。
	 * @param sampleNumber
	 * @private
	 */
	private loadSample(sampleNumber: number): Sample | null {
		const shdr = this.pdta.shdr[sampleNumber];
		if (shdr === undefined) return null;

		return Sample.create(this.sdta.sample, shdr);
	}
}

export interface IndexedPresetHeader {
	readonly phdr: PHDR;
	readonly pbags: readonly IndexedPresetBag[];
}

export interface IndexedPresetBag {
	readonly pbag: PBAG;
	readonly generators: readonly PGEN[];
	readonly modulators: readonly PMOD[];
}

export interface IndexedInstrument {
	readonly inst: INST;
	readonly ibags: readonly IndexedInstrumentBag[];
}

export interface IndexedInstrumentBag {
	readonly ibag: IBAG;
	readonly generators: readonly IGEN[];
	readonly modulators: readonly IMOD[];
}
