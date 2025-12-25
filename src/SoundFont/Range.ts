/**
 * 閉区間
 */
export class Range {
	constructor(
		public min: number,
		public max: number,
	) {}

	includes(value: number) {
		return this.min <= value && value <= this.max;
	}

	copy(): Range {
		return new Range(this.min, this.max);
	}

	intersect(other: Range): Range {
		return new Range(
			Math.max(this.min, other.min),
			Math.min(this.max, other.max),
		);
	}
}
