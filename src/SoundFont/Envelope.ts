export class Envelope {
	/**
	 * delay時間 [sec]
	 */
	delay: number = 0;

	/**
	 * attack時間 [sec]
	 */
	attack: number = 0;

	/**
	 * hold時間 [sec]
	 */
	hold: number = 0;

	/**
	 * decay時間 [sec]
	 */
	decay: number = 0;

	/**
	 * sustainレベル (0.0 - 1.0)
	 */
	sustain: number = 1;

	/**
	 * release時間 [sec]
	 */
	release: number = 0;

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
			return time / this.attack;
		}

		time -= this.attack;
		if (time < this.hold) {
			return 1;
		}

		time -= this.hold;
		if (time < this.decay) {
			return 1 - (1 - this.sustain) * (time / this.decay);
		}

		return this.sustain;
	}

	/**
	 * このエンベロープに基づいたGainNodeを作成する。
	 * @param context
	 * @param time エンベロープの開始時間。未指定の場合は現在のAudioContextの時刻。
	 */
	createGainNode(context: AudioContext, time = context.currentTime): GainNode {
		const node = context.createGain();
		node.gain.cancelScheduledValues(time);
		node.gain.value = 0;

		let t = time;
		node.gain.setValueAtTime(0, t);

		t += this.delay;
		node.gain.setValueAtTime(0, t);

		t += this.attack;
		node.gain.setTargetAtTime(1, t, this.attack / 5);

		t += this.hold;
		node.gain.setTargetAtTime(1, t, this.hold / 5);

		t += this.decay;
		node.gain.setTargetAtTime(this.sustain, t, this.decay / 5);

		return node;
	}

	copy(): Envelope {
		const env = new Envelope();
		env.delay = this.delay;
		env.attack = this.attack;
		env.hold = this.hold;
		env.decay = this.decay;
		env.sustain = this.sustain;
		env.release = this.release;
		return env;
	}
}
