import type { ChangeEventHandler } from "react";
import { minmax } from "../lib.ts";
import { useFormValue } from "./useFormValue.ts";

export function Slider({
	min,
	max,
	step,
	defaultValue,
	value: controlledValue,
	title,
	onChange,
}: {
	min?: number;
	max?: number;
	step?: number;
	defaultValue?: number;
	value?: number;
	title?: string;
	onChange?: ChangeEventHandler<HTMLInputElement>;
}) {
	const [value, setValue] = useFormValue(controlledValue, defaultValue ?? 0.5);
	min = min ?? 0;
	max = max ?? 1;

	const rate = minmax(0, 1, (value - min) / (max - min));

	return (
		<div
			css={{
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				position: "relative",
				height: "26px",
			}}
		>
			<input
				css={{
					opacity: 0,
					cursor: "grab",
					margin: 0,
					padding: 0,

					"&:active": {
						cursor: "grabbing",
					},
					"&:focus-visible + svg": {
						outline: "2px solid var(--color-primary-500)",
					},
				}}
				type="range"
				min={min}
				max={max}
				step={step}
				title={title}
				value={value}
				onChange={(ev) => {
					setValue(Number(ev.target.value));
					onChange?.(ev);
				}}
			/>
			<svg
				css={{
					position: "absolute",
					inset: 0,
					width: "100%",
					height: "100%",
					pointerEvents: "none",
					borderRadius: 4,
					overflow: "visible",
				}}
				viewBox={`0 0 ${TOTAL_WIDTH} 1`}
			>
				<title>{title}</title>
				<path
					d={`M${MARKER_RADIUS} 0L${MARKER_RADIUS + TRACK_WIDTH} 0`}
					css={{
						stroke: "var(--color-foreground-weak)",
						strokeWidth: 2,
						strokeLinecap: "round",
					}}
				></path>
				<path
					d={`M${MARKER_RADIUS} 0H${MARKER_RADIUS + TRACK_WIDTH * rate}`}
					css={{
						stroke: "var(--color-foreground)",
						strokeWidth: 8,
						strokeLinecap: "round",
					}}
				></path>
				<circle
					cx={MARKER_RADIUS + TRACK_WIDTH * rate}
					cy={0}
					css={{
						fill: "var(--color-foreground)",
						r: MARKER_RADIUS,
						transition: "r 100ms",

						":is(input:active + svg circle)": {
							r: MARKER_RADIUS * 1.4,
						},
					}}
				></circle>
			</svg>
		</div>
	);
}

const TOTAL_WIDTH = 300;
const MARKER_RADIUS = 16;
const TRACK_WIDTH = TOTAL_WIDTH - 2 * MARKER_RADIUS;
