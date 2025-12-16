export interface Note {
	readonly id: number;
	readonly key: number;
	readonly tickFrom: number;
	readonly tickTo: number;

	/**
	 * 音の強さ (0-127)
	 */
	readonly velocity: number;
}

export const Note = {
	create(props: {
		id: number;
		key: number;
		tickFrom: number;
		tickTo: number;
		velocity: number;
	}): Note {
		const tickFrom = Math.max(0, props.tickFrom);
		const tickTo = Math.max(tickFrom, props.tickTo);
		return {
			id: props.id,
			key: props.key,
			tickFrom,
			tickTo,
			velocity: props.velocity,
		};
	},
};
