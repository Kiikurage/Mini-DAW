export class Envelope {
	/**
	 * delay時間 [sec]
	 */
	readonly delay: number;

	/**
	 * attack時間 [sec]
	 */
	readonly attack: number;

	/**
	 * hold時間 [sec]
	 */
	readonly hold: number;

	/**
	 * decay時間 [sec]
	 */
	readonly decay: number;

	/**
	 * sustainレベル (0.0 - 1.0)
	 * 1の場合、attackレベルと同じ最大音量を維持
	 * 0の場合、decayフェーズの終了時に無音になる
	 */
	readonly sustain: number;

	/**
	 * release時間 [sec]
	 */
	readonly release: number;

	/**
	 * 全体のスケール。アタック終了時の値がこれに等しい。
	 */
	readonly scale: number = 1;

	constructor(
		props: {
			delay?: number;
			attack?: number;
			hold?: number;
			decay?: number;
			sustain?: number;
			release?: number;
			scale?: number;
		} = {},
	) {
		this.delay = props.delay ?? 0;
		this.attack = props.attack ?? 0;
		this.hold = props.hold ?? 0;
		this.decay = props.decay ?? 0;
		this.sustain = props.sustain ?? 1;
		this.release = props.release ?? 0;
		this.scale = props.scale ?? 1;
	}

	/**
	 * 指定した時間におけるエンベロープの値を取得する。ただし、releaseフェーズは考慮しない。
	 * @param time
	 */
	getValueAt(time: number): number {
		if (time < this.delay) {
			return 0;
		}

		time -= this.delay;
		if (time < this.attack) {
			return (this.scale * time) / this.attack;
		}

		time -= this.attack;
		if (time < this.hold) {
			return this.scale;
		}

		time -= this.hold;
		if (time < this.decay) {
			return this.scale * (1 - (1 - this.sustain) * (time / this.decay));
		}

		return this.scale * this.sustain;
	}

	/**
	 * このエンベロープに基づいたGainNodeを作成する。
	 * @param context
	 * @param time エンベロープの開始時間。未指定の場合は現在のAudioContextの時刻。
	 */
	createGainNode(context: AudioContext, time = context.currentTime): GainNode {
		const node = new GainNode(context);
		node.gain.cancelScheduledValues(time);
		node.gain.value = 0;

		let t = time;
		node.gain.setValueAtTime(0, t);

		t += this.delay;
		node.gain.setValueAtTime(0, t);

		t += this.attack;
		node.gain.setTargetAtTime(this.scale, t, this.attack / 5);

		t += this.hold;
		node.gain.setTargetAtTime(this.scale, t, this.hold / 5);

		t += this.decay;
		node.gain.setTargetAtTime(this.scale * this.sustain, t, this.decay / 5);

		return node;
	}
}
