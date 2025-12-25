import { assertNotNullish } from "../lib.ts";
import { Envelope } from "./Envelope.ts";
import { InstrumentZone } from "./InstrumentZone.ts";
import { Preset } from "./Preset.ts";
import { Range } from "./Range.ts";
import { RIFF } from "./RIFF.ts";
import {
	type IBAG,
	type IGEN,
	type IMOD,
	type INST,
	type PBAG,
	type PDTA,
	type PGEN,
	type PHDR,
	type PMOD,
	parsePDTA,
	parseSDTA,
	type SDTA,
	SFGenerator,
} from "./sf2.ts";

type GeneratorRecord = { [K in SFGenerator]?: IGEN | PGEN };

interface GeneratorTypes {
	[SFGenerator.START_ADDRESS_OFFSET]: number;
	[SFGenerator.END_ADDRESS_OFFSET]: number;
	[SFGenerator.START_LOOP_ADDRESS_OFFSET]: number;
	[SFGenerator.END_LOOP_ADDRESS_OFFSET]: number;
	[SFGenerator.START_ADDRESS_COARSE_OFFSET]: number;
	[SFGenerator.MODULATION_LFO_TO_PITCH]: number;
	[SFGenerator.VIBRATE_LFO_TO_PITCH]: number;
	[SFGenerator.MODULATION_ENVELOPE_TO_PITCH]: number;
	[SFGenerator.INITIAL_FILTER_CUTOFF_FREQUENCY]: number;
	[SFGenerator.INITIAL_FILTER_Q]: number;
	[SFGenerator.MODULATION_LFO_TO_FILTER_CUTOFF]: number;
	[SFGenerator.MODULATION_ENVELOPE_TO_FILTER_CUTOFF]: number;
	[SFGenerator.END_ADDRESS_COARSE_OFFSET]: number;
	[SFGenerator.MODULATION_LFO_TO_VOLUME]: number;
	[SFGenerator.CHORUS_EFFECTS_SEND]: number;
	[SFGenerator.REVERB_EFFECTS_SEND]: number;
	[SFGenerator.PAN]: number;
	[SFGenerator.DELAY_MODULATION_LFO]: number;
	[SFGenerator.FREQUENCY_MODULATION_LFO]: number;
	[SFGenerator.DELAY_VIBRATE_LFO]: number;
	[SFGenerator.FREQUENCY_VIBRATE_LFO]: number;
	[SFGenerator.DELAY_MODULATION_ENVELOPE]: number;
	[SFGenerator.ATTACK_MODULATION_ENVELOPE]: number;
	[SFGenerator.HOLD_MODULATION_ENVELOPE]: number;
	[SFGenerator.DECAY_MODULATION_ENVELOPE]: number;
	[SFGenerator.SUSTAIN_MODULATION_ENVELOPE]: number;
	[SFGenerator.RELEASE_MODULATION_ENVELOPE]: number;
	[SFGenerator.KEY_NUMBER_TO_MODULATION_ENVELOPE_HOLD]: number;
	[SFGenerator.KEY_NUMBER_TO_MODULATION_ENVELOPE_DECAY]: number;
	[SFGenerator.DELAY_VOLUME_ENVELOPE]: number;
	[SFGenerator.ATTACK_VOLUME_ENVELOPE]: number;
	[SFGenerator.HOLD_VOLUME_ENVELOPE]: number;
	[SFGenerator.DECAY_VOLUME_ENVELOPE]: number;
	[SFGenerator.SUSTAIN_VOLUME_ENVELOPE]: number;
	[SFGenerator.RELEASE_VOLUME_ENVELOPE]: number;
	[SFGenerator.KEY_NUMBER_TO_VOLUME_ENVELOPE_HOLD]: number;
	[SFGenerator.KEY_NUMBER_TO_VOLUME_ENVELOPE_DECAY]: number;
	[SFGenerator.INSTRUMENT]: number | null;
	[SFGenerator.KEY_RANGE]: Range;
	[SFGenerator.VELOCITY_RANGE]: Range;
	[SFGenerator.START_LOOP_ADDRESS_COARSE_OFFSET]: number;
	[SFGenerator.KEY_NUMBER]: number | null;
	[SFGenerator.VELOCITY]: number | null;
	[SFGenerator.INITIAL_ATTENUATION]: number;
	[SFGenerator.END_LOOP_ADDRESS_COARSE_OFFSET]: number;
	[SFGenerator.COARSE_TUNE]: number;
	[SFGenerator.FINE_TUNE]: number;
	[SFGenerator.SAMPLE_ID]: number | null;
	[SFGenerator.SAMPLE_MODES]: number;
	[SFGenerator.SCALE_TUNING]: number;
	[SFGenerator.EXCLUSIVE_CLASS]: number | null;
	[SFGenerator.OVERRIDING_ROOT_KEY]: number | null;
}

const GeneratorDefaultValue: GeneratorTypes = {
	[SFGenerator.START_ADDRESS_OFFSET]: 0,
	[SFGenerator.END_ADDRESS_OFFSET]: 0,
	[SFGenerator.START_LOOP_ADDRESS_OFFSET]: 0,
	[SFGenerator.END_LOOP_ADDRESS_OFFSET]: 0,
	[SFGenerator.START_ADDRESS_COARSE_OFFSET]: 0,
	[SFGenerator.MODULATION_LFO_TO_PITCH]: 0,
	[SFGenerator.VIBRATE_LFO_TO_PITCH]: 0,
	[SFGenerator.MODULATION_ENVELOPE_TO_PITCH]: 0,
	[SFGenerator.INITIAL_FILTER_CUTOFF_FREQUENCY]: 13500,
	[SFGenerator.INITIAL_FILTER_Q]: 0,
	[SFGenerator.MODULATION_LFO_TO_FILTER_CUTOFF]: 0,
	[SFGenerator.MODULATION_ENVELOPE_TO_FILTER_CUTOFF]: 0,
	[SFGenerator.END_ADDRESS_COARSE_OFFSET]: 0,
	[SFGenerator.MODULATION_LFO_TO_VOLUME]: 0,
	[SFGenerator.CHORUS_EFFECTS_SEND]: 0,
	[SFGenerator.REVERB_EFFECTS_SEND]: 0,
	[SFGenerator.PAN]: 0,
	[SFGenerator.DELAY_MODULATION_LFO]: -12000,
	[SFGenerator.FREQUENCY_MODULATION_LFO]: 0,
	[SFGenerator.DELAY_VIBRATE_LFO]: -12000,
	[SFGenerator.FREQUENCY_VIBRATE_LFO]: 0,
	[SFGenerator.DELAY_MODULATION_ENVELOPE]: -12000,
	[SFGenerator.ATTACK_MODULATION_ENVELOPE]: -12000,
	[SFGenerator.HOLD_MODULATION_ENVELOPE]: -12000,
	[SFGenerator.DECAY_MODULATION_ENVELOPE]: -12000,
	[SFGenerator.SUSTAIN_MODULATION_ENVELOPE]: 0,
	[SFGenerator.RELEASE_MODULATION_ENVELOPE]: -12000,
	[SFGenerator.KEY_NUMBER_TO_MODULATION_ENVELOPE_HOLD]: 0,
	[SFGenerator.KEY_NUMBER_TO_MODULATION_ENVELOPE_DECAY]: 0,
	[SFGenerator.DELAY_VOLUME_ENVELOPE]: -12000,
	[SFGenerator.ATTACK_VOLUME_ENVELOPE]: -12000,
	[SFGenerator.HOLD_VOLUME_ENVELOPE]: -12000,
	[SFGenerator.DECAY_VOLUME_ENVELOPE]: -12000,
	[SFGenerator.SUSTAIN_VOLUME_ENVELOPE]: 0,
	[SFGenerator.RELEASE_VOLUME_ENVELOPE]: -12000,
	[SFGenerator.KEY_NUMBER_TO_VOLUME_ENVELOPE_HOLD]: 0,
	[SFGenerator.KEY_NUMBER_TO_VOLUME_ENVELOPE_DECAY]: 0,
	[SFGenerator.INSTRUMENT]: null,
	[SFGenerator.KEY_RANGE]: new Range(0, 127),
	[SFGenerator.VELOCITY_RANGE]: new Range(0, 127),
	[SFGenerator.START_LOOP_ADDRESS_COARSE_OFFSET]: 0,
	[SFGenerator.KEY_NUMBER]: null,
	[SFGenerator.VELOCITY]: null,
	[SFGenerator.INITIAL_ATTENUATION]: 0,
	[SFGenerator.END_LOOP_ADDRESS_COARSE_OFFSET]: 0,
	[SFGenerator.COARSE_TUNE]: 0,
	[SFGenerator.FINE_TUNE]: 0,
	[SFGenerator.SAMPLE_ID]: null,
	[SFGenerator.SAMPLE_MODES]: 0,
	[SFGenerator.SCALE_TUNING]: 100,
	[SFGenerator.EXCLUSIVE_CLASS]: null,
	[SFGenerator.OVERRIDING_ROOT_KEY]: null,
};

type KeyOf<T> = {
	[K in keyof GeneratorTypes]: [GeneratorTypes[K]] extends [T] ? K : never;
}[keyof GeneratorTypes];

function i16<K extends KeyOf<number>>(record: GeneratorRecord, key: K): number {
	return record[key]?.amount?.getInt16(0, true) ?? GeneratorDefaultValue[key];
}

function i16OrNull<K extends KeyOf<number | null>>(
	record: GeneratorRecord,
	key: K,
): number | null {
	return record[key]?.amount?.getInt16(0, true) ?? GeneratorDefaultValue[key];
}

function range<K extends KeyOf<Range>>(record: GeneratorRecord, key: K): Range {
	const gen = record[key];
	if (gen === undefined) return GeneratorDefaultValue[key];
	const min = gen.amount.getUint8(0);
	const max = gen.amount.getUint8(1);
	return new Range(min, max);
}

interface ParsedPresetHeader {
	readonly original: PHDR;
	readonly bags: readonly ParsedPresetBag[];
}

interface ParsedPresetBag {
	readonly original: PBAG;
	readonly generators: readonly PGEN[];
	readonly generatorRecord: GeneratorRecord;
	readonly modulators: readonly PMOD[];
	readonly instrument: ParsedInstrument | null;
}

interface ParsedInstrument {
	readonly original: INST;
	readonly bags: readonly ParsedInstrumentBag[];
}

interface ParsedInstrumentBag {
	readonly original: IBAG;
	readonly generators: readonly IGEN[];
	readonly generatorRecord: GeneratorRecord;
	readonly modulators: readonly IMOD[];
}

function parse(pdta: PDTA): ParsedPresetHeader[] {
	const instrumentBags: ParsedInstrumentBag[] = [];
	for (let i = 0; i < pdta.ibag.length - 1; i++) {
		const ibag = pdta.ibag[i];
		const nextIbag = pdta.ibag[i + 1];
		assertNotNullish(ibag);
		assertNotNullish(nextIbag);
		const generators = pdta.igen.slice(
			ibag.generatorIndex,
			nextIbag.generatorIndex,
		);
		const modulators = pdta.imod.slice(
			ibag.modulatorIndex,
			nextIbag.modulatorIndex,
		);

		const generatorRecord: GeneratorRecord = {};
		for (const generator of generators) {
			generatorRecord[generator.generator] = generator;
		}

		instrumentBags.push({
			original: ibag,
			generators,
			generatorRecord,
			modulators,
		});
	}

	const instrumentHeaders: ParsedInstrument[] = [];
	for (let i = 0; i < pdta.inst.length - 1; i++) {
		const inst = pdta.inst[i];
		const nextInst = pdta.inst[i + 1];
		assertNotNullish(inst);
		assertNotNullish(nextInst);
		const bags = instrumentBags.slice(inst.bagIndex, nextInst.bagIndex);

		instrumentHeaders.push({
			original: inst,
			bags,
		});
	}

	const presetBags: ParsedPresetBag[] = [];
	for (let i = 0; i < pdta.pbag.length - 1; i++) {
		const pbag = pdta.pbag[i];
		const nextPbag = pdta.pbag[i + 1];
		assertNotNullish(pbag);
		assertNotNullish(nextPbag);
		const generators = pdta.pgen.slice(
			pbag.generatorIndex,
			nextPbag.generatorIndex,
		);
		const modulators = pdta.pmod.slice(
			pbag.modulatorIndex,
			nextPbag.modulatorIndex,
		);

		const generatorRecord: GeneratorRecord = {};
		for (const generator of generators) {
			generatorRecord[generator.generator] = generator;
		}
		const instrumentIndex = i16OrNull(generatorRecord, SFGenerator.INSTRUMENT);
		const instrument =
			instrumentIndex === null
				? null
				: (instrumentHeaders[instrumentIndex] ?? null);

		presetBags.push({
			original: pbag,
			generators,
			generatorRecord,
			modulators,
			instrument,
		});
	}

	const presetHeaders: ParsedPresetHeader[] = [];
	for (let i = 0; i < pdta.phdr.length - 1; i++) {
		const phdr = pdta.phdr[i];
		const nextPhdr = pdta.phdr[i + 1];
		assertNotNullish(phdr);
		assertNotNullish(nextPhdr);
		const bags = presetBags.slice(phdr.bagIndex, nextPhdr.bagIndex);

		presetHeaders.push({
			original: phdr,
			bags,
		});
	}

	return presetHeaders;
}

export class SoundFont {
	private readonly presetHeaders: readonly ParsedPresetHeader[];
	private readonly cachedPresets: Map<string, Preset> = new Map();

	constructor(
		private readonly sdta: SDTA,
		private readonly pdta: PDTA,
	) {
		this.presetHeaders = parse(pdta);
	}

	/**
	 * 各プリセット番号について、プリセットの名前を取得する。
	 * 複数バンクに同じプリセット番号が存在する場合、最初に見つかったものを返す。
	 */
	getPresetNames(): {
		readonly presetNumber: number;
		readonly name: string;
		readonly bankMap: ReadonlyMap<
			number,
			{
				readonly presetNumber: number;
				readonly bankNumber: number;
				readonly name: string;
			}
		>;
	}[] {
		const result = new Map<
			number,
			{
				readonly presetNumber: number;
				readonly name: string;
				readonly bankMap: Map<
					number,
					{
						readonly presetNumber: number;
						readonly bankNumber: number;
						readonly name: string;
					}
				>;
			}
		>();

		for (const header of this.presetHeaders) {
			let entry = result.get(header.original.preset);
			if (entry === undefined) {
				entry = {
					presetNumber: header.original.preset,
					name: header.original.name,
					bankMap: new Map(),
				};
				result.set(header.original.preset, entry);
			}
			entry.bankMap.set(header.original.bank, {
				presetNumber: header.original.preset,
				bankNumber: header.original.bank,
				name: header.original.name,
			});
		}
		return [...result.values()].sort((a, b) => a.presetNumber - b.presetNumber);
	}

	/**
	 * 指定されたプリセット番号に対応するすべてのバンクのプリセットを取得する。
	 * @param presetNumber
	 */
	getPresetsByPresetNumber(presetNumber: number): Preset[] {
		const presets = this.presetHeaders
			.filter((header) => header.original.preset === presetNumber)
			.map((header) => this.toPreset(header));

		presets.sort((a, b) => a.bankNumber - b.bankNumber);
		return presets;
	}

	/**
	 * 指定されたプリセット番号とバンク番号に対応するプリセットを取得する。
	 */
	getPreset(presetNumber: number, bankNumber: number): Preset | null {
		for (const header of this.presetHeaders) {
			if (
				header.original.preset === presetNumber &&
				header.original.bank === bankNumber
			) {
				return this.toPreset(header);
			}
		}
		return null;
	}

	private toPreset(header: ParsedPresetHeader): Preset {
		const cacheKey = `${header.original.preset}-${header.original.bank}`;
		const cached = this.cachedPresets.get(cacheKey);
		if (cached !== undefined) return cached;

		const entries: InstrumentZone[] = [];

		let globalPresetZoneRecord: GeneratorRecord = {};
		for (const pbag of header.bags) {
			const presetZoneRecord = {
				...globalPresetZoneRecord,
				...pbag.generatorRecord,
			};
			if (pbag.instrument === null) {
				globalPresetZoneRecord = presetZoneRecord;
				continue;
			}

			let globalInstrumentZoneRecord: GeneratorRecord = {};
			for (const ibag of pbag.instrument.bags) {
				const instrumentZoneRecord = {
					...globalInstrumentZoneRecord,
					...ibag.generatorRecord,
				};

				const sampleId = i16OrNull(instrumentZoneRecord, SFGenerator.SAMPLE_ID);
				if (sampleId === null) {
					globalInstrumentZoneRecord = instrumentZoneRecord;
					continue;
				}
				const shdr = this.pdta.shdr[sampleId];
				if (shdr === undefined) continue;

				const sample = new Float32Array(
					this.sdta.sample.slice(
						shdr.start +
							i16(
								instrumentZoneRecord,
								SFGenerator.START_ADDRESS_COARSE_OFFSET,
							) *
								32768 +
							i16(instrumentZoneRecord, SFGenerator.START_ADDRESS_OFFSET),
						shdr.end +
							i16(instrumentZoneRecord, SFGenerator.END_ADDRESS_COARSE_OFFSET) *
								32768 +
							i16(instrumentZoneRecord, SFGenerator.END_ADDRESS_OFFSET),
					),
				).map((v) => v / 32768);

				entries.push(
					new InstrumentZone({
						sampleMode:
							i16(instrumentZoneRecord, SFGenerator.SAMPLE_MODES) === 1
								? "loop"
								: "no_loop",
						keyRange: range(presetZoneRecord, SFGenerator.KEY_RANGE).intersect(
							range(instrumentZoneRecord, SFGenerator.KEY_RANGE),
						),
						velocityRange: range(
							presetZoneRecord,
							SFGenerator.VELOCITY_RANGE,
						).intersect(
							range(instrumentZoneRecord, SFGenerator.VELOCITY_RANGE),
						),
						volumeEnvelope: new Envelope({
							delay:
								2 **
								(i16(instrumentZoneRecord, SFGenerator.DELAY_VOLUME_ENVELOPE) /
									1200),
							attack:
								2 **
								(i16(instrumentZoneRecord, SFGenerator.ATTACK_VOLUME_ENVELOPE) /
									1200),
							hold:
								2 **
								(i16(instrumentZoneRecord, SFGenerator.HOLD_VOLUME_ENVELOPE) /
									1200),
							decay:
								2 **
								(i16(instrumentZoneRecord, SFGenerator.DECAY_VOLUME_ENVELOPE) /
									1200),
							sustain:
								10 **
								(-i16(
									instrumentZoneRecord,
									SFGenerator.SUSTAIN_VOLUME_ENVELOPE,
								) /
									100),
							release:
								2 **
								(i16(
									instrumentZoneRecord,
									SFGenerator.RELEASE_VOLUME_ENVELOPE,
								) /
									1200),
						}),
						initialFilterCutoffFrequency:
							8.176 *
							2 **
								(i16(
									instrumentZoneRecord,
									SFGenerator.INITIAL_FILTER_CUTOFF_FREQUENCY,
								) /
									1200),
						initialFilterQ:
							i16(instrumentZoneRecord, SFGenerator.INITIAL_FILTER_Q) / 10,
						sample,
						sampleRate: shdr.sampleRate,
						loopStartIndex:
							shdr.startLoop +
							i16(
								instrumentZoneRecord,
								SFGenerator.START_LOOP_ADDRESS_COARSE_OFFSET,
							) *
								32768 +
							i16(instrumentZoneRecord, SFGenerator.START_LOOP_ADDRESS_OFFSET) -
							shdr.start,
						loopEndIndex:
							shdr.endLoop +
							i16(
								instrumentZoneRecord,
								SFGenerator.END_LOOP_ADDRESS_COARSE_OFFSET,
							) *
								32768 +
							i16(instrumentZoneRecord, SFGenerator.END_LOOP_ADDRESS_OFFSET) -
							shdr.start,
						tune:
							i16(instrumentZoneRecord, SFGenerator.COARSE_TUNE) * 100 +
							i16(instrumentZoneRecord, SFGenerator.FINE_TUNE),
						scaleTuning: i16(instrumentZoneRecord, SFGenerator.SCALE_TUNING),
						rootKey:
							i16OrNull(
								instrumentZoneRecord,
								SFGenerator.OVERRIDING_ROOT_KEY,
							) ?? shdr.originalPitch,
					}),
				);
			}
		}

		const preset = new Preset({
			name: header.original.name,
			presetNumber: header.original.preset,
			bankNumber: header.original.bank,
			entires: entries,
		});

		this.cachedPresets.set(cacheKey, preset);
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
}
