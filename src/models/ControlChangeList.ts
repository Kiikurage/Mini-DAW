import type { ControlChange } from "./ControlChange.ts";

export class ControlChangeList {
	public readonly messages: readonly ControlChange[];

	static create() {
		return new ControlChangeList({ messages: [] });
	}

	private constructor(props: {
		messages: ControlChange[];
	}) {
		this.messages = props.messages;
	}

	put(tick: number, value: number): ControlChangeList {
		const { index, exact } = this.findIndex(tick);
		if (exact) {
			const messages = [...this.messages];
			messages[index] = { tick, value };
			return new ControlChangeList({ messages });
		} else {
			return new ControlChangeList({
				messages: [
					...this.messages.slice(0, index),
					{ tick, value },
					...this.messages.slice(index),
				],
			});
		}
	}

	remove(tick: number): ControlChangeList {
		const { index, exact } = this.findIndex(tick);
		if (!exact) return this;

		const messages = [...this.messages];
		messages.splice(index, 1);
		return new ControlChangeList({ messages });
	}

	private findIndex(tick: number): { index: number; exact: boolean } {
		let min = 0;
		let max = this.messages.length;
		while (min < max) {
			const mid = (min + max) >>> 1;
			// biome-ignore lint/style/noNonNullAssertion: Never be nullish
			const midMessage = this.messages[mid]!;
			if (midMessage.tick < tick) {
				min = mid + 1;
			} else if (midMessage.tick === tick) {
				return { index: mid, exact: true };
			} else {
				max = mid;
			}
		}
		return { index: min, exact: false };
	}
}
