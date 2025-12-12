import { useEffect, useLayoutEffect, useRef } from "react";
import { NUM_KEYS, TICK_PER_BEAT } from "../../constants.ts";
import type { InstrumentStore } from "../../InstrumentStore.ts";
import type { Player } from "../../Player/Player.ts";
import { useResizeObserver } from "../../react/useResizeObserver.ts";
import type { SongStore } from "../../SongStore.ts";
import { useStateful } from "../../Stateful/useStateful.tsx";
import type { Editor } from "../Editor.ts";
import type { PianoRoll } from "./PianoRoll.ts";
import { HEIGHT_PER_KEY, renderCanvas, TIMELINE_HEIGHT, widthPerTick, } from "./PianoRollViewRenderer.ts";

export function PianoRollView({
	pianoRoll,
	instrumentStore,
	songStore,
	player,
	editor,
}: {
	pianoRoll: PianoRoll;
	instrumentStore: InstrumentStore;
	songStore: SongStore;
	player: Player;
	editor: Editor;
}) {
	const width = useStateful(pianoRoll, (state) => state.width);
	const height = useStateful(pianoRoll, (state) => state.height);
	const cursor = useStateful(pianoRoll, (state) => state.cursor);
	const zoom = useStateful(editor, (state) => state.zoom);
	const scrollTop = useStateful(editor, (state) => state.scrollTop);
	const scrollLeft = useStateful(editor, (state) => state.scrollLeft);

	const viewportRef = useRef<HTMLDivElement>(null);

	const containerResizeObserver = useResizeObserver((entry) => {
		pianoRoll.setSize(entry.contentRect.width, entry.contentRect.height);
	});

	useEffect(() => {
		// C4が見える位置にスクロールしておく
		const viewport = viewportRef.current;
		if (viewport !== null) {
			viewport.scrollTop =
				(NUM_KEYS - 60) * HEIGHT_PER_KEY - viewport.clientHeight / 2;
		}
	}, []);

	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		function render() {
			const canvas = canvasRef.current;
			if (canvas === null) return;

			renderCanvas({
				canvas,
				pianoRollState: pianoRoll.state,
				instrumentStoreState: instrumentStore.state,
				song: songStore.state,
				playerState: player.state,
				editorState: editor.state,
			});
		}

		render();

		const unsubscribeCallbacks = [
			pianoRoll.addChangeListener(render),
			instrumentStore.addChangeListener(render),
			songStore.addChangeListener(render),
			player.addChangeListener(render),
			editor.addChangeListener(render),
		];

		return () => {
			for (const unsubscribe of unsubscribeCallbacks) {
				unsubscribe();
			}
		};
	}, [pianoRoll, instrumentStore, songStore, player, editor]);

	useLayoutEffect(() => {
		const viewport = viewportRef.current;
		if (viewport === null) return;

		if (viewport.scrollTop !== scrollTop) {
			viewport.scrollTop = scrollTop;
		}
		if (viewport.scrollLeft !== scrollLeft) {
			viewport.scrollLeft = scrollLeft;
		}
	}, [scrollTop, scrollLeft]);

	return (
		<div
			ref={(e) => {
				viewportRef.current = e;
				containerResizeObserver(e);
			}}
			onScroll={(ev) => {
				pianoRoll.handleScroll(ev.nativeEvent);
			}}
			css={{
				overflow: "scroll",
				position: "absolute",
				inset: 0,
				background: "var(--color-key-background)",
			}}
		>
			<div
				css={{
					width: widthPerTick(zoom) * TICK_PER_BEAT * 100,
					height: NUM_KEYS * HEIGHT_PER_KEY + TIMELINE_HEIGHT,
				}}
			>
				<canvas
					ref={canvasRef}
					onPointerDown={(ev) => {
						ev.currentTarget.setPointerCapture(ev.pointerId);
						pianoRoll.handlePointerDown(ev.nativeEvent);
					}}
					onPointerMove={(ev) => {
						pianoRoll.handlePointerMove(ev.nativeEvent);
					}}
					onPointerUp={(ev) => {
						ev.currentTarget.releasePointerCapture(ev.pointerId);
						pianoRoll.handlePointerUp(ev.nativeEvent);
					}}
					onDoubleClick={(ev) => {
						pianoRoll.handleDoubleClick(ev.nativeEvent);
					}}
					style={{
						width,
						height,
						cursor,
					}}
					css={{
						position: "sticky",
						top: 0,
						left: 0,
						bottom: 0,
						right: 0,
					}}
				/>
			</div>
		</div>
	);
}
