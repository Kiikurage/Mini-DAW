import { type ReactNode, useRef } from "react";
import { KEY_PER_OCTAVE, NUM_KEYS } from "../constants.ts";
import { useIntersectionObserver } from "./useIntersectionObserver.ts";

function isBlackKey(key: number) {
	const k = key % KEY_PER_OCTAVE;
	return k === 1 || k === 3 || k === 6 || k === 8 || k === 10;
}

export function Keyboard({
	onPointerDown,
	onPointerUp,
}: {
	onPointerDown?: (key: number) => void;
	onPointerUp?: (key: number) => void;
}) {
	const isFirstIntersectRef = useRef(false);
	const intersectionObserverCallback = useIntersectionObserver((entry) => {
		if (entry.isIntersecting && !isFirstIntersectRef.current) {
			isFirstIntersectRef.current = true;

			// 初期状態でC4キーが見えるようにスクロールする
			entry.target.scrollLeft =
				(entry.target.scrollWidth - entry.target.clientWidth) / 2;
		}
	});

	const whiteKeys: ReactNode[] = [];
	const blackKeys: ReactNode[] = [];
	let x = 0;
	const KEY_WIDTH = 30;
	const KEY_WIDTH_BLACK = KEY_WIDTH - 8;
	const KEY_HEIGHT = KEY_WIDTH * 2.5;
	const KEY_HEIGHT_BLACK = KEY_HEIGHT * 0.5;
	for (let key = 0; key < NUM_KEYS; key++) {
		const isBlack = isBlackKey(key);

		if (isBlack) {
			blackKeys.push(
				<rect
					key={key}
					x={x - KEY_WIDTH_BLACK / 2}
					y={0}
					width={KEY_WIDTH_BLACK}
					height={KEY_HEIGHT_BLACK}
					css={{
						fill: "var(--color-keyboard-black-fill)",
						stroke: "var(--color-keyboard-black-stroke)",

						"&:hover": {
							fill: "var(--color-keyboard-black-fill-hover)",
						},
						"&:active": {
							fill: "var(--color-keyboard-black-fill-active)",
						},
					}}
					onPointerDown={(ev) => {
						ev.currentTarget.setPointerCapture(ev.pointerId);
						onPointerDown?.(key);
					}}
					onPointerUp={(ev) => {
						ev.currentTarget.releasePointerCapture(ev.pointerId);
						onPointerUp?.(key);
					}}
				/>,
			);
		} else {
			whiteKeys.push(
				<rect
					key={key}
					x={x}
					y={0}
					width={KEY_WIDTH}
					height={KEY_HEIGHT}
					css={{
						fill: "var(--color-keyboard-white-fill)",
						stroke: "var(--color-keyboard-white-stroke)",

						"&:hover": {
							fill: "var(--color-keyboard-white-fill-hover)",
						},
						"&:active": {
							fill: "var(--color-keyboard-white-fill-active)",
						},
					}}
					onPointerDown={(ev) => {
						ev.currentTarget.setPointerCapture(ev.pointerId);
						onPointerDown?.(key);
					}}
					onPointerUp={(ev) => {
						ev.currentTarget.releasePointerCapture(ev.pointerId);
						onPointerUp?.(key);
					}}
				/>,
			);
			if (key % KEY_PER_OCTAVE === 0) {
				whiteKeys.push(
					<text
						key={`label-${key}`}
						x={x + KEY_WIDTH / 2}
						y={KEY_HEIGHT - 8}
						textAnchor="middle"
						css={{
							fill: "var(--color-keyboard-foreground)",
							pointerEvents: "none",
						}}
					>
						C{Math.floor(key / KEY_PER_OCTAVE) - 1}
					</text>,
				);
			}

			x += KEY_WIDTH;
		}
	}

	return (
		<div
			ref={(e) => {
				intersectionObserverCallback(e);
			}}
			css={{
				overflowX: "scroll",
				userSelect: "none",
			}}
		>
			<svg viewBox={`0 0 ${x} ${KEY_HEIGHT}`} width={x} height={KEY_HEIGHT}>
				<title>Keyboard</title>
				{whiteKeys}
				{blackKeys}
			</svg>
		</div>
	);
}
