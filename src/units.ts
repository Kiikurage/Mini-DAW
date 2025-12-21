export class Time {
	constructor(private readonly timecent: number) {}

	inTimecent() {
		return this.timecent;
	}
	inSecond() {
		return 2 ** (this.timecent / 1200);
	}
}

export function timecents(value: number): Time {
	return new Time(value);
}

export function seconds(value: number): Time {
	return new Time(Math.log2(value) * 1200);
}
