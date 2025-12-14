import { useEffect, useRef } from "react";
import { NUM_KEYS } from "../../constants.ts";
import type { InstrumentStore } from "../../InstrumentStore.ts";
import type { Player } from "../../Player/Player.ts";
import { ResizeObserverWrapper } from "../../react/useResizeObserver.ts";
import type { SongStore } from "../../SongStore.ts";
import type { Editor } from "../Editor.ts";
import type { PianoRoll } from "./PianoRoll.ts";
import { HEIGHT_PER_KEY, renderCanvas } from "./PianoRollViewRenderer.ts";

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
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas === null) return;

		const controller = new PianoRollViewController(
			pianoRoll,
			instrumentStore,
			songStore,
			player,
			editor,
		);
		controller.setCanvas(canvas);

		return () => {
			controller.cleanUp();
		};
	}, [editor, instrumentStore, pianoRoll, player, songStore]);

	return (
		<canvas
			ref={canvasRef}
			css={{
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				background: "var(--color-key-background)",
			}}
		/>
	);
}

class PianoRollViewController {
	private canvas: HTMLCanvasElement | null = null;
	private readonly unregisterCallbacks: (() => void)[] = [];

	constructor(
		private readonly pianoRoll: PianoRoll,
		private readonly instrumentStore: InstrumentStore,
		private readonly songStore: SongStore,
		private readonly player: Player,
		private readonly editor: Editor,
	) {
		this.unregisterCallbacks.push(
			pianoRoll.addChangeListener((state) => {
				if (this.canvas === null) return;
				this.canvas.style.cursor = state.cursor;
			}),
			pianoRoll.addChangeListener(this.render),
			instrumentStore.addChangeListener(this.render),
			songStore.addChangeListener(this.render),
			player.addChangeListener(this.render),
			editor.addChangeListener(this.render),
		);
	}

	setCanvas(canvas: HTMLCanvasElement | null) {
		this.cleanUpCanvas();
		if (canvas === null) return;

		// C4 を中央に表示する
		this.pianoRoll.setScrollTop(
			(NUM_KEYS - 60) * HEIGHT_PER_KEY - canvas.clientHeight / 2,
		);

		this.canvas = canvas;
		ResizeObserverWrapper.getInstance().observe(canvas, this.handleResize);
		this.canvas.addEventListener("wheel", this.handleWheel);
		this.canvas.addEventListener("pointerdown", this.handlePointerDown);
		this.canvas.addEventListener("pointermove", this.handlePointerMove);
		this.canvas.addEventListener("pointerup", this.handlePointerUp);
		this.canvas.addEventListener("dblclick", this.handleDoubleClick);

		this.render();
	}

	cleanUp() {
		this.setCanvas(null);
		for (const unregister of this.unregisterCallbacks) {
			unregister();
		}
	}

	private cleanUpCanvas() {
		if (this.canvas === null) return;

		ResizeObserverWrapper.getInstance().unobserve(
			this.canvas,
			this.handleResize,
		);
		this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
		this.canvas.removeEventListener("pointermove", this.handlePointerMove);
		this.canvas.removeEventListener("pointerup", this.handlePointerUp);
		this.canvas.removeEventListener("dblclick", this.handleDoubleClick);
		this.canvas.removeEventListener("wheel", this.handleWheel);
		this.canvas = null;
	}

	private readonly render = () => {
		if (this.canvas === null) return;

		renderCanvas({
			canvas: this.canvas,
			pianoRollState: this.pianoRoll.state,
			instrumentStoreState: this.instrumentStore.state,
			song: this.songStore.state,
			playerState: this.player.state,
			editorState: this.editor.state,
		});
	};

	private readonly handleResize = (entry: ResizeObserverEntry) => {
		this.pianoRoll.setHeight(entry.contentRect.height);
	};

	private readonly handleWheel = (ev: WheelEvent) => {
		this.editor.setScrollLeft(this.editor.state.scrollLeft + ev.deltaX);
		this.pianoRoll.setScrollTop(this.pianoRoll.state.scrollTop + ev.deltaY);
	};

	private readonly handlePointerDown = (ev: PointerEvent) => {
		(ev.target as HTMLElement).setPointerCapture(ev.pointerId);
		this.pianoRoll.handlePointerDown(ev);
	};

	private readonly handlePointerMove = (ev: PointerEvent) => {
		this.pianoRoll.handlePointerMove(ev);
	};

	private readonly handlePointerUp = (ev: PointerEvent) => {
		(ev.target as HTMLElement).releasePointerCapture(ev.pointerId);
		this.pianoRoll.handlePointerUp(ev);
	};

	private readonly handleDoubleClick = (ev: MouseEvent) => {
		this.pianoRoll.handleDoubleClick(ev);
	};
}
