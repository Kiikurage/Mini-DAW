import { minmax } from "../lib.ts";
import { timecents } from "../units.ts";
import { Envelope } from "./Envelope.ts";
import { Range } from "./Range.ts";
import { type IGEN, type PGEN, SFGenerator } from "./sf2.ts";

export interface ZoneBuilder {
    /**
     * このゾーンが有効となるMIDIキー範囲
     */
    keyRange: Range;

    /**
     * このゾーンに対して指定可能なベロシティ範囲
     */
    velocityRange: Range;

    // region フィルタ

    /**
     * ローパスフィルタのカットオフ周波数 [Hz]
     * nullの場合、フィルタは適用されない
     */
    initialFilterCutoffFrequency: number | null;

    /**
     * ローパスフィルタのQ値
     */
    initialFilterQ: number;

    // endregion

    // region モジュレーションエンベロープ

    /**
     * モジュレーションエンベロープ
     */
    modulationEnvelope: Envelope;

    /**
     * モジュレーションエンベロープのhold時間に対するキー番号の影響度 [倍率]
     * キー番号60を基準とし、1キー増加するごとにこの倍率をdecay時間に乗算する。
     */
    keyNumberToModulationEnvelopeHold: number;

    /**
     * モジュレーションエンベロープのdecay時間に対するキー番号の影響度 [倍率]
     * キー番号60を基準とし、1キー増加するごとにこの倍率をdecay時間に乗算する。
     */
    keyNumberToModulationEnvelopeDecay: number;

    /**
     * モジュレーションエンベロープのピッチへの影響度 [倍率]
     * モジュレーションエンベロープが最大値に達したときのピッチ変化量を表す。
     *
     * 例
     * modulationEnvelopeToPitch=100のとき、
     * モジュレーションエンベロープが最大値に達したときにピッチが100[cent]=1[semitone]=半音上がる
     */
    modulationEnvelopeToPitch: number;

    /**
     * モジュレーションエンベロープのフィルタのカットオフ周波数への影響度 [倍率]
     *
     * モジュレーションエンベロープが最大値に達したときのフィルタのカットオフ周波数変化を表す。
     * 例
     * modulationEnvelopeToFilterCutoffFrequency=1のとき、
     * モジュレーションエンベロープが最大値に達したときにカットオフ周波数が1オクターブ上がる(2倍になる)
     */
    modulationEnvelopeToFilterCutoffFrequency: number;

    // endregion

    // region ビブラートLFO

    /**
     * ビブラートLFOのdelay時間 [sec]
     */
    delayVibrateLFO: number;

    /**
     * ビブラートLFOの周波数 [Hz]
     */
    frequencyVibrationLFO: number;

    /**
     * ビブラートLFOのピッチへの影響度 [倍率]
     *
     * ビブラートが最大値に達したときのピッチ変化量を表す。
     * 例
     * vibrationLFOToPitch=100のとき、
     * ビブラートLFOが最大値に達したときにピッチが100[cent]=1[semitone]=半音上がり、
     * ビブラートLFOが最小値に達したときにピッチが-100[cent]=-1[semitone]=半音下がる
     */
    vibrationLFOToPitch: number;

    // endregion

    // region モジュレーションLFO

    /**
     * モジュレーションLFOのピッチへの影響度 [倍率]
     *
     * モジュレーションが最大値に達したときのピッチ変化量を表す。
     * 例
     * modulationLFOToPitch=1のとき、
     * モジュレーションLFOが最大値に達したときにピッチが1オクターブ上がり(2倍になり)、
     * モジュレーションLFOが最小値に達したときにピッチが1オクターブ下がる(1/2倍になる)
     */
    modulationLFOToPitch: number;

    /**
     * モジュレーションLFOのボリュームへの影響度 [dB]
     *
     * モジュレーションが最大値に達したときのボリューム変化を表す。
     * 例
     * modulationLFOToVolume=100のとき、
     * モジュレーションLFOが最大値に達したときに音量が100[dB]=10[B]増加し
     * モジュレーションLFOが最小値に達したときに音量が-100[dB]=-10[B]減少する
     */
    modulationLFOToVolume: number;

    /**
     * モジュレーションLFOのフィルタのカットオフ周波数への影響度 [倍率]
     *
     * モジュレーションが最大値に達したときのフィルタのカットオフ周波数変化を表す。
     * 例
     * modulationLFOToFilterCutoffFrequency=1のとき、
     * モジュレーションLFOが最大値に達したときにカットオフ周波数が1オクターブ上がり(2倍になり)、
     * モジュレーションLFOが最小値に達したときにカットオフ周波数が1オクターブ下がる(1/2倍になる)
     */
    modulationLFOToFilterCutoffFrequency: number;

    /**
     * モジュレーションLFOのdelay時間 [sec]
     */
    delayModulationLFO: number;

    /**
     * モジュレーションLFOの周波数 [Hz]
     */
    frequencyModulationLFO: number;

    // endregion

    // region ボリュームエンベロープ

    /**
     * ボリュームエンベロープ
     */
    volumeEnvelope: Envelope;

    /**
     * ボリュームエンベロープのhold時間に対するキー番号の影響度 [倍率]
     * キー番号60を基準とし、1キー増加するごとにこの倍率をhold時間に乗算する。
     */
    keyNumberToVolumeEnvelopeHold: number;

    /**
     * ボリュームエンベロープのdecay時間に対するキー番号の影響度 [倍率]
     * キー番号60を基準とし、1キー増加するごとにこの倍率をdecay時間に乗算する。
     */
    keyNumberToVolumeEnvelopeDecay: number;

    // endregion

    /**
     * ピッチのオフセット [semitone]
     */
    coarseTune: number;

    /**
     * ピッチのオフセット [cent]
     */
    fineTune: number;

    /**
     * キーごとのピッチの変化量 [cents]
     */
    scaleTuning: number;

    /**
     * コーラスエフェクトへ送る音量(dB)の割合 [倍率]
     */
    chorusEffectsSend: number;

    /**
     * リバーブエフェクトへ送る音量(dB)の割合 [倍率]
     */
    reverbEffectsSend: number;

    /**
     * 音源の位置 [-0.5(left)〜0(center)〜+0.5(right)]
     */
    pan: number;

    /**
     * 初期減衰量 [dB]
     *
     * ノートのオン時に適用される減衰量を表す。値が大きいほど音量が小さくなる。
     */
    initialAttenuation: number;
}

export function createDefaultZoneBuilder(): ZoneBuilder {
    return {
        keyRange: new Range(0, 127),
        velocityRange: new Range(0, 127),
        initialFilterCutoffFrequency: null,
        initialFilterQ: 0,
        modulationEnvelope: new Envelope(),
        keyNumberToModulationEnvelopeHold: 1.0,
        keyNumberToModulationEnvelopeDecay: 1.0,
        modulationEnvelopeToPitch: 0,
        modulationEnvelopeToFilterCutoffFrequency: 0,
        delayVibrateLFO: 0,
        frequencyVibrationLFO: 8.176,
        vibrationLFOToPitch: 0,
        modulationLFOToPitch: 0,
        modulationLFOToVolume: 0,
        modulationLFOToFilterCutoffFrequency: 0,
        delayModulationLFO: 0,
        frequencyModulationLFO: 8.176,
        volumeEnvelope: new Envelope(),
        keyNumberToVolumeEnvelopeHold: 1.0,
        keyNumberToVolumeEnvelopeDecay: 1.0,
        coarseTune: 0.0,
        fineTune: 0.0,
        scaleTuning: 100,
        chorusEffectsSend: 0,
        reverbEffectsSend: 0,
        pan: 0,
        initialAttenuation: 0,
    };
}

export function applyZoneGenerator(zone: ZoneBuilder, gen: IGEN | PGEN) {
    switch (gen.generator) {
        case SFGenerator.KEY_RANGE: {
            zone.keyRange = new Range(gen.amount.getUint8(0), gen.amount.getUint8(1));
            break;
        }
        case SFGenerator.VELOCITY_RANGE: {
            zone.velocityRange = new Range(
                gen.amount.getUint8(0),
                gen.amount.getUint8(1),
            );
            break;
        }

        // region フィルタ
        case SFGenerator.INITIAL_FILTER_CUTOFF_FREQUENCY: {
            const rawValue = minmax(1500, 13500, gen.amount.getInt16(0, true));
            zone.initialFilterCutoffFrequency = 8.176 * 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.INITIAL_FILTER_Q: {
            zone.initialFilterQ = minmax(0, 960, gen.amount.getUint16(0, true));
            break;
        }
        // endregion

        // region モジュレーションLFO
        case SFGenerator.DELAY_MODULATION_LFO: {
            const rawValue = minmax(-12000, 5000, gen.amount.getInt16(0, true));
            zone.delayModulationLFO = 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.FREQUENCY_MODULATION_LFO: {
            const rawValue = minmax(-16000, 4500, gen.amount.getInt16(0, true));
            zone.frequencyModulationLFO = 8.176 * 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.MODULATION_LFO_TO_PITCH: {
            const rawValue = minmax(-12000, 12000, gen.amount.getInt16(0, true));
            zone.modulationLFOToPitch = 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.MODULATION_LFO_TO_VOLUME: {
            const rawValue = minmax(-960, 960, gen.amount.getInt16(0, true));
            zone.modulationLFOToVolume = rawValue / 10;
            break;
        }
        case SFGenerator.MODULATION_LFO_TO_FILTER_CUTOFF: {
            const rawValue = minmax(-12000, 12000, gen.amount.getInt16(0, true));
            zone.modulationLFOToFilterCutoffFrequency = 2 ** (rawValue / 1200);
            break;
        }
        // endregion

        // region ビブラートLFO
        case SFGenerator.DELAY_VIBRATE_LFO: {
            const rawValue = minmax(-12000, 5000, gen.amount.getInt16(0, true));
            zone.delayVibrateLFO = 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.FREQUENCY_VIBRATE_LFO: {
            const rawValue = minmax(-16000, 4500, gen.amount.getInt16(0, true));
            zone.frequencyVibrationLFO = 8.176 * 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.VIBRATE_LFO_TO_PITCH: {
            const rawValue = minmax(-12000, 12000, gen.amount.getInt16(0, true));
            zone.vibrationLFOToPitch = 2 ** (rawValue / 1200);
            break;
        }
        // endregion

        // region モジュレーションEnvelope
        case SFGenerator.DELAY_MODULATION_ENVELOPE: {
            const rawValue = minmax(-12000, 5000, gen.amount.getInt16(0, true));
            zone.modulationEnvelope.delay = timecents(rawValue);
            break;
        }
        case SFGenerator.ATTACK_MODULATION_ENVELOPE: {
            const rawValue = minmax(-12000, 8000, gen.amount.getInt16(0, true));
            zone.modulationEnvelope.attack = timecents(rawValue);
            break;
        }
        case SFGenerator.HOLD_MODULATION_ENVELOPE: {
            const rawValue = minmax(-12000, 5000, gen.amount.getInt16(0, true));
            zone.modulationEnvelope.hold = 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.DECAY_MODULATION_ENVELOPE: {
            const rawValue = minmax(-12000, 8000, gen.amount.getInt16(0, true));
            zone.modulationEnvelope.decay = 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.SUSTAIN_MODULATION_ENVELOPE: {
            const rawValue = minmax(0, 1000, gen.amount.getUint16(0, true));
            zone.modulationEnvelope.sustain = 1 - rawValue / 1000;
            break;
        }
        case SFGenerator.RELEASE_MODULATION_ENVELOPE: {
            const rawValue = minmax(-12000, 8000, gen.amount.getInt16(0, true));
            zone.modulationEnvelope.release = 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.KEY_NUMBER_TO_MODULATION_ENVELOPE_HOLD: {
            const rawValue = minmax(-1200, 1200, gen.amount.getInt16(0, true));
            zone.keyNumberToModulationEnvelopeHold = 1 / 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.KEY_NUMBER_TO_MODULATION_ENVELOPE_DECAY: {
            const rawValue = minmax(-1200, 1200, gen.amount.getInt16(0, true));
            zone.keyNumberToModulationEnvelopeDecay = 1 / 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.MODULATION_ENVELOPE_TO_PITCH: {
            const rawValue = minmax(-12000, 12000, gen.amount.getInt16(0, true));
            zone.modulationEnvelopeToPitch = 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.MODULATION_ENVELOPE_TO_FILTER_CUTOFF: {
            const rawValue = minmax(-12000, 12000, gen.amount.getInt16(0, true));
            zone.modulationEnvelopeToFilterCutoffFrequency = 2 ** (rawValue / 1200);
            break;
        }

        // endregion

        // region ボリュームEnvelope
        case SFGenerator.DELAY_VOLUME_ENVELOPE: {
            const rawValue = minmax(-12000, 5000, gen.amount.getInt16(0, true));
            zone.volumeEnvelope.delay = timecents(rawValue);
            break;
        }
        case SFGenerator.ATTACK_VOLUME_ENVELOPE: {
            const rawValue = minmax(-12000, 8000, gen.amount.getInt16(0, true));
            zone.volumeEnvelope.attack = timecents(rawValue);
            break;
        }
        case SFGenerator.HOLD_VOLUME_ENVELOPE: {
            const rawValue = minmax(-12000, 5000, gen.amount.getInt16(0, true));
            zone.volumeEnvelope.hold = 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.DECAY_VOLUME_ENVELOPE: {
            const rawValue = minmax(-12000, 8000, gen.amount.getInt16(0, true));
            zone.volumeEnvelope.decay = 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.SUSTAIN_VOLUME_ENVELOPE: {
            const rawValue = minmax(0, 1440, gen.amount.getUint16(0, true));
            zone.volumeEnvelope.sustain = 1 / 10 ** (rawValue / 100);
            break;
        }
        case SFGenerator.RELEASE_VOLUME_ENVELOPE: {
            const rawValue = minmax(-12000, 8000, gen.amount.getInt16(0, true));
            zone.volumeEnvelope.release = 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.KEY_NUMBER_TO_VOLUME_ENVELOPE_HOLD: {
            const rawValue = minmax(-1200, 1200, gen.amount.getInt16(0, true));
            zone.keyNumberToVolumeEnvelopeHold = 1 / 2 ** (rawValue / 1200);
            break;
        }
        case SFGenerator.KEY_NUMBER_TO_VOLUME_ENVELOPE_DECAY: {
            const rawValue = minmax(-1200, 1200, gen.amount.getInt16(0, true));
            zone.keyNumberToVolumeEnvelopeDecay = 1 / 2 ** (rawValue / 1200);
            break;
        }
        // endregion

        case SFGenerator.COARSE_TUNE: {
            zone.coarseTune = minmax(-120, 120, gen.amount.getInt16(0, true));
            break;
        }
        case SFGenerator.FINE_TUNE: {
            zone.fineTune = minmax(-99, 99, gen.amount.getInt16(0, true));
            break;
        }
        case SFGenerator.SCALE_TUNING: {
            zone.scaleTuning = minmax(0, 1200, gen.amount.getInt16(0, true));
            break;
        }

        // region コーラス
        case SFGenerator.CHORUS_EFFECTS_SEND: {
            const rawValue = minmax(0, 1000, gen.amount.getUint16(0, true));
            zone.chorusEffectsSend = rawValue / 1000;
            break;
        }
        // endregion

        // region リバーブ
        case SFGenerator.REVERB_EFFECTS_SEND: {
            const rawValue = minmax(0, 1000, gen.amount.getUint16(0, true));
            zone.reverbEffectsSend = rawValue / 1000;
            break;
        }
        // endregion

        case SFGenerator.PAN: {
            const rawValue = minmax(-500, 500, gen.amount.getInt16(0, true));
            zone.pan = rawValue / 1000;
            break;
        }
        case SFGenerator.INITIAL_ATTENUATION: {
            const rawValue = minmax(0, 1440, gen.amount.getUint16(0, true));
            zone.initialAttenuation = rawValue / 10;
            break;
        }

        case SFGenerator.UNUSED5: {
            break;
        }

        default: {
            console.warn(
                `NIY: ${InverseSFGenerator[gen.generator]}(${gen.generator}) for Zone: ${zone.constructor.name}`,
            );
        }
    }
}

const InverseSFGenerator = Object.fromEntries(
    Object.entries(SFGenerator).map(([k, v]) => [v, k]),
);
