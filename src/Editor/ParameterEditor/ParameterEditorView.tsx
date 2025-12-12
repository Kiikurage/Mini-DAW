import { useEffect, useLayoutEffect, useRef } from "react";
import { NUM_KEYS, TICK_PER_BEAT } from "../../constants.ts";
import type { Player } from "../../Player/Player.ts";
import { useResizeObserver } from "../../react/useResizeObserver.ts";
import type { SongStore } from "../../SongStore.ts";
import { useStateful } from "../../Stateful/useStateful.tsx";
import type { Editor } from "../Editor.ts";
import type { ParameterEditor } from "./ParameterEditor.ts";
import { HEIGHT_PER_KEY, renderCanvas, TIMELINE_HEIGHT, widthPerTick, } from "./ParameterEditorRenderer.ts";

export function ParameterEditorView({
	parameterEditor,
	songStore,
	player,
	editor,
}: {
	parameterEditor: ParameterEditor;
	songStore: SongStore;
	player: Player;
	editor: Editor;
}) {
	const zoom = useStateful(editor, (state) => state.zoom);
	const scrollLeft = useStateful(editor, (state) => state.scrollLeft);

	const cursor = useStateful(parameterEditor, (state) => state.cursor);
	const width = useStateful(parameterEditor, (state) => state.width);
	const height = useStateful(parameterEditor, (state) => state.height);

	const viewportRef = useRef<HTMLDivElement>(null);

	const containerResizeObserver = useResizeObserver((entry) => {
		parameterEditor.setSize(entry.contentRect.width, entry.contentRect.height);
	});

	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		function render() {
			const canvas = canvasRef.current;
			if (canvas === null) return;

			renderCanvas({
				canvas,
				parameterEditorState: parameterEditor.state,
				song: songStore.state,
				playerState: player.state,
				editorState: editor.state,
			});
		}

		const unsubscribeCallbacks = [
			parameterEditor.addChangeListener(render),
			songStore.addChangeListener(render),
			player.addChangeListener(render),
			editor.addChangeListener(render),
		];

		render();
		return () => {
			for (const unsubscribe of unsubscribeCallbacks) {
				unsubscribe();
			}
		};
	}, [parameterEditor, songStore, player, editor]);

	useLayoutEffect(() => {
		const viewport = viewportRef.current;
		if (viewport === null) return;

		if (viewport.scrollLeft !== scrollLeft) {
			viewport.scrollLeft = scrollLeft;
		}
	}, [scrollLeft]);

	return (
		<div
			ref={(e) => {
				viewportRef.current = e;
				containerResizeObserver(e);
			}}
			onScroll={(ev) => {
				parameterEditor.setScrollPosition(ev.currentTarget.scrollLeft);
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
						parameterEditor.handlePointerDown(ev.nativeEvent);
					}}
					onPointerMove={(ev) => {
						parameterEditor.handlePointerMove(ev.nativeEvent);
					}}
					onPointerUp={(ev) => {
						ev.currentTarget.releasePointerCapture(ev.pointerId);
						parameterEditor.handlePointerUp(ev.nativeEvent);
					}}
					onDoubleClick={(ev) => {
						parameterEditor.handleDoubleClick(ev.nativeEvent);
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
