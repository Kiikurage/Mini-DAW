import { useEffect, useRef } from "react";
import { MdContentCopy, MdContentCut, MdDelete } from "react-icons/md";
import { css } from "../../../styled-system/css";
import { cx } from "../../../styled-system/css/cx";
import { flex } from "../../../styled-system/patterns";
import { ClipboardManager } from "../../ClipboardManager.ts";
import { computeSelectionArea } from "../../computeSelectionArea.tsx";
import { NUM_KEYS } from "../../constants.ts";
import { useComponent } from "../../Dependency/DIContainerProvider.tsx";
import { FileStore } from "../../FileStore.ts";
import { addListener, EmptySet, minmax } from "../../lib.ts";
import { Player } from "../../Player/Player.ts";
import { PointerEventManager } from "../../PointerEventManager/PointerEventManager.ts";
import { IconButton } from "../../react/IconButton.tsx";
import { BoxShadowStyleBase, UIControlStyleBase } from "../../react/Styles.ts";
import { ResizeObserverWrapper } from "../../react/useResizeObserver.ts";
import { SoundFontStore } from "../../SoundFontStore.ts";
import { useStateful } from "../../Stateful/useStateful.tsx";
import { Synthesizer } from "../../Synthesizer.ts";
import { type PutNotes, PutNotesKey } from "../../usecases/PutNotes.ts";
import {
	type RemoveNotes,
	RemoveNotesKey,
} from "../../usecases/RemoveNotes.ts";
import { Editor } from "../Editor.ts";
import { widthPerTick } from "../ParameterEditor/ParameterEditorViewRenderer.ts";
import { PianoRoll } from "./PianoRoll.ts";
import { PianoRollInteractionHandleResolver } from "./PianoRollInteractionHandleResolver.ts";
import {
	HEIGHT_PER_KEY,
	renderCanvas,
	SIDEBAR_WIDTH,
	TIMELINE_HEIGHT,
} from "./PianoRollViewRenderer.ts";

export function PianoRollView({
	fileStore,
	player,
	editor,
	setNotes,
	removeNotes,
	synthesizer,
	soundFontStore,
	clipboard,
}: {
	fileStore?: FileStore;
	player?: Player;
	editor?: Editor;
	setNotes?: PutNotes;
	removeNotes?: RemoveNotes;
	synthesizer?: Synthesizer;
	soundFontStore?: SoundFontStore;
	clipboard?: ClipboardManager;
}) {
	synthesizer = useComponent(Synthesizer.Key, synthesizer);
	soundFontStore = useComponent(SoundFontStore.Key, soundFontStore);
	fileStore = useComponent(FileStore.Key, fileStore);
	player = useComponent(Player.Key, player);
	editor = useComponent(Editor.Key, editor);
	setNotes = useComponent(PutNotesKey, setNotes);
	removeNotes = useComponent(RemoveNotesKey, removeNotes);
	clipboard = useComponent(ClipboardManager.Key, clipboard);

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const pianoRollRef = useRef<PianoRoll>(null);
	if (pianoRollRef.current == null) {
		pianoRollRef.current = new PianoRoll(soundFontStore, fileStore, editor);
	}
	const pianoRoll = pianoRollRef.current;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas === null) return;

		const pointerEventManager = new PointerEventManager();
		const handleResolver = new PianoRollInteractionHandleResolver(
			synthesizer,
			pianoRoll,
			fileStore,
			setNotes,
			removeNotes,
			player,
			editor,
		);
		pointerEventManager
			.on("mouseMove", (ev) =>
				handleResolver.resolveHandle(ev.position)?.handlePointerMove?.(ev),
			)
			.on("pointerDown", (ev) =>
				handleResolver.resolveHandle(ev.position)?.handlePointerDown?.(ev),
			)
			.on("doubleTap", (ev) =>
				handleResolver.resolveHandle(ev.position)?.handleDoubleClick?.(ev),
			)
			.on("gestureStart", (ev) => {
				const gesturePositionTick =
					(editor.state.scrollLeft + ev.position.x - SIDEBAR_WIDTH) /
					widthPerTick(editor.state.zoom);
				const startScrollTop = pianoRoll.state.scrollTop;
				const startZoom = editor.state.zoom;

				ev.sessionEvents.on("gestureChange", (ev) => {
					const scale = Math.hypot(ev.scale.x, ev.scale.y);
					const newZoom = minmax(0.25, startZoom * scale, 16);

					// ジェスチャ中心のティック位置は維持
					// tick
					//   = (oldScrollLeft + oldGestureX - SIDEBAR_WIDTH) / widthPerTick(oldZoom)
					//   = (newScrollLeft + newGestureX - SIDEBAR_WIDTH) / widthPerTick(newZoom)
					//
					// newScrollLeft =  tick * widthPerTick(newZoom) - (newCenterX - SIDEBAR_WIDTH)

					const newScrollLeft =
						gesturePositionTick * widthPerTick(newZoom) -
						(ev.position.x - SIDEBAR_WIDTH);

					editor.setZoom(newZoom);
					editor.setScrollLeft(newScrollLeft);
					pianoRoll.setScrollTop(startScrollTop - ev.distance.y);
				});
			});

		const render = () => {
			renderCanvas({
				canvas,
				pianoRollState: pianoRoll.state,
				pianoRollHoverNotesManagerState: pianoRoll.hoverNotesManager.state,
				song: fileStore.state.song,
				playerState: player.state,
				editorState: editor.state,
				soundFontStoreState: soundFontStore.state,
			});
		};

		const disposables = [
			pianoRoll.addChangeListener((state) => {
				canvas.style.cursor = state.cursor;
			}),
			pianoRoll.addChangeListener(render),
			pianoRoll.hoverNotesManager.addChangeListener(render),
			fileStore.addChangeListener(render),
			player.addChangeListener(render),
			editor.addChangeListener(render),
			soundFontStore.addChangeListener(render),
			ResizeObserverWrapper.getInstance().observe(canvas, (entry) => {
				pianoRoll.setHeight(entry.contentRect.height);
			}),
			addListener(canvas, "wheel", (ev) => {
				editor.setScrollLeft(editor.state.scrollLeft + ev.deltaX);
				pianoRoll.setScrollTop(pianoRoll.state.scrollTop + ev.deltaY);
				if (ev.deltaX !== 0) {
					player.setAutoScrollEnabled(false);
				}
			}),
			pointerEventManager.install(canvas),
		];

		// C5(key=72) を中央に表示する
		pianoRoll.setScrollTop(
			(NUM_KEYS - 72) * HEIGHT_PER_KEY - canvas.clientHeight / 2,
		);

		render();

		return () => {
			for (const disposable of disposables) {
				disposable();
			}
		};
	}, [
		synthesizer,
		editor,
		player,
		fileStore,
		removeNotes,
		setNotes,
		soundFontStore,
		pianoRoll,
	]);

	return (
		<div
			className={css({
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				background: "var(--color-key-background)",
			})}
		>
			<canvas
				ref={canvasRef}
				className={css({
					position: "absolute",
					inset: 0,
					width: "100%",
					height: "100%",
				})}
			/>
			<PianoRollSelectionActionPopup
				pianoRoll={pianoRoll}
				editor={editor}
				fileStore={fileStore}
				clipboard={clipboard}
			/>
		</div>
	);
}

function PianoRollSelectionActionPopup({
	editor,
	fileStore,
	pianoRoll,
	clipboard,
}: {
	editor: Editor;
	fileStore: FileStore;
	pianoRoll: PianoRoll;
	clipboard: ClipboardManager;
}) {
	const editorState = useStateful(editor);
	const song = useStateful(fileStore, (state) => state.song);
	const pianoRollState = useStateful(pianoRoll);

	const zoom = useStateful(editor, (state) => state.zoom);
	const scrollLeft = useStateful(editor, (state) => state.scrollLeft);
	const width = useStateful(editor, (state) => state.width);
	const marqueeAreaFrom = useStateful(editor, (state) => state.marqueeAreaFrom);
	const selection = useStateful(editor, (state) => state.selection);
	if (selection.type !== "note") return null;
	if (selection.noteIds.size <= 1) return null;
	if (marqueeAreaFrom !== null) return null;

	const selectionArea = computeSelectionArea(EmptySet, song, editorState);
	if (selectionArea == null) return null;

	const selectionBottom =
		pianoRollState.height -
		((NUM_KEYS - selectionArea.keyTo) * HEIGHT_PER_KEY -
			pianoRollState.scrollTop +
			TIMELINE_HEIGHT) +
		8;
	const selectionRight =
		width -
		(selectionArea.tickTo * widthPerTick(zoom) - scrollLeft + SIDEBAR_WIDTH) -
		16;

	return (
		<div
			className={cx(
				BoxShadowStyleBase,
				UIControlStyleBase,
				flex({ direction: "row", align: "center", justify: "center", gap: 8 }),
				css({
					position: "absolute",
					minHeight: "unset",
					padding: "4px 8px",
				}),
			)}
			style={{
				bottom: selectionBottom,
				right: selectionRight,
			}}
		>
			<IconButton
				variant="normalInline"
				size="sm"
				onClick={() => {
					clipboard.cut();
				}}
			>
				<MdContentCut size={16} />
			</IconButton>
			<IconButton
				variant="normalInline"
				size="sm"
				onClick={() => {
					clipboard.copy();
				}}
			>
				<MdContentCopy size={16} />
			</IconButton>
			<IconButton variant="normalInline" size="sm">
				<MdDelete
					size={16}
					onClick={() => {
						clipboard.cut();
					}}
				/>
			</IconButton>
		</div>
	);
}
