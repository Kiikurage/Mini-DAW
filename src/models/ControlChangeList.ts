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

	put(changes: Iterable<ControlChange>): ControlChangeList {
		const messages = [...this.messages];

		for (const { tick, value } of changes) {
			const { index, exact } = binarySearch(messages, tick);
			if (exact) {
				messages[index] = { tick, value };
			} else {
				messages.splice(index, 0, { tick, value });
			}
		}
		return new ControlChangeList({ messages });
	}

	remove(ticks: Iterable<number>): ControlChangeList {
		const messages = [...this.messages];
		let mutated = false;

		for (const tick of ticks) {
			const { index, exact } = binarySearch(messages, tick);
			if (!exact) return this;

			messages.splice(index, 1);
			mutated = true;
		}
		if (!mutated) return this;

		return new ControlChangeList({ messages });
	}

	toArray(): ControlChange[] {
		return [...this.messages];
	}
}

/**
 * 二分探索でtickの位置を探す。
 * @param messages
 * @param tick
 * @returns 指定されたtickを超えない最大のindexと、その位置に現在存在する要素が完全一致しているか
 */
function binarySearch(
	messages: readonly ControlChange[],
	tick: number,
): { index: number; exact: boolean } {
	let min = 0;
	let max = messages.length;
	while (min < max) {
		const mid = (min + max) >>> 1;
		// biome-ignore lint/style/noNonNullAssertion: Never be nullish
		const midMessage = messages[mid]!;
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
