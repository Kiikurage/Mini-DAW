import { memo, type ReactNode } from "react";
import { css } from "../../../styled-system/css";
import { NUM_KEYS } from "../../constants.ts";
import { useComponent } from "../../Dependency/DIContainerProvider.tsx";
import { EditHistoryManager } from "../../EditHistory/EditHistoryManager.ts";
import { FileStore } from "../../FileStore.ts";
import { getActiveChannel, useActiveChannel } from "../../getActiveChannel.ts";
import { getMarqueeArea } from "../../getMarqueeArea.ts";
import {
	EmptyMap,
	EmptySet,
	getNonNull,
	minmax,
	toMutableSet,
} from "../../lib.ts";
import { CC, type CCId, CCList } from "../../models/CC.ts";
import type { ControlType } from "../../models/ControlType.ts";
import { useResizeObserver } from "../../react/useResizeObserver.ts";
import { useStateful } from "../../Stateful/useStateful.tsx";
import { type PutCCs, PutCCsKey } from "../../usecases/PutCCs.ts";
import { Editor, getSelectedCCIds } from "../Editor.ts";
import type { ParameterEditor } from "./ParameterEditor.ts";
import { widthPerTick } from "./ParameterEditorViewRenderer.ts";
import {
	type DragSessionContext,
	type GestureSessionContext,
	type PointerEventsManager,
	usePointerEvents,
} from "./PointerEventsManager.ts";

export function CCEditorView({
	parameterEditor,
	editor,
	fileStore,
	controlType,
	putCCs,
}: {
	parameterEditor: ParameterEditor;
	editor?: Editor;
	fileStore?: FileStore;
	putCCs?: PutCCs;
	controlType: ControlType;
}) {
	const resizeObserverRef = useResizeObserver((entry) => {
		parameterEditor.setWidth(entry.contentRect.width);
		parameterEditor.setHeight(entry.contentRect.height);
	});

	editor = useComponent(Editor.Key, editor);
	putCCs = useComponent(PutCCsKey, putCCs);
	fileStore = useComponent(FileStore.Key, fileStore);

	const scrollLeft = useStateful(editor, (state) => state.scrollLeft);
	const width = useStateful(parameterEditor, (state) => state.width);
	const height = useStateful(parameterEditor, (state) => state.height);

	const ref = usePointerEvents<SVGElement>((manager) => {
		manager
			.onMouseDown((ctx) =>
				addCC(editor, parameterEditor, controlType, putCCs, ctx),
			)
			.onMouseDown((ctx) =>
				selectByMarquee(editor, fileStore, controlType, ctx),
			)
			.onGestureStart((ctx) => scrollBySwipe(editor, ctx));
	});

	return (
		// biome-ignore lint/a11y/noSvgWithoutTitle: Not needed
		<svg
			viewBox={`0 0 ${width} ${height}`}
			ref={(e) => {
				resizeObserverRef(e);
				ref.current = e;
			}}
			className={css({
				position: "absolute",
				width: "100%",
				height: "100%",
				inset: 0,
			})}
		>
			<g
				style={{
					transform: `translateX(${-scrollLeft}px)`,
				}}
			>
				<CCListView
					parameterEditor={parameterEditor}
					controlType={controlType}
				/>
				<MarqueeArea />
			</g>
		</svg>
	);
}

const CCListView = memo(function CCListView({
	editor,
	fileStore,
	parameterEditor,
	controlType,
}: {
	editor?: Editor;
	fileStore?: FileStore;
	parameterEditor: ParameterEditor;
	controlType: ControlType;
}) {
	editor = useComponent(Editor.Key, editor);
	fileStore = useComponent(FileStore.Key, fileStore);

	const zoom = useStateful(editor, (state) => state.zoom);
	const width = useStateful(parameterEditor, (state) => state.width);
	const height = useStateful(parameterEditor, (state) => state.height);

	const scrollLeft = useStateful(editor, (state) => state.scrollLeft);

	const activeChannel = useActiveChannel(fileStore, editor);
	const list = activeChannel?.ccLists?.get(controlType);
	const ccIds = list?.ccIds ?? [];
	const ccMap = list?.ccs ?? EmptyMap;
	const color = activeChannel?.metadata?.color.cssString ?? "#fff";

	const INITIAL_VALUE = 64;

	let prevX = 0;
	let prevY = height * (1 - INITIAL_VALUE / 127);
	const path: string[] = [`M${prevX} ${prevY}`];
	for (const ccId of ccIds) {
		const cc = getNonNull(ccMap.get(ccId));
		const x = cc.tick * widthPerTick(zoom);
		path.push(`L${x} ${prevY}`);

		const y = height * (1 - cc.value / 127);
		path.push(`L${x} ${y}`);
		prevX = x;
		prevY = y;
	}
	path.push(`L${prevX + scrollLeft + width} ${prevY}`);
	const dParameterValue = path.join("");

	path.push(`L${prevX + scrollLeft + width} ${height}`);
	path.push(`L0 ${height}`);
	path.push("Z");
	const dParameterArea = path.join("");

	return (
		<g>
			<path d={dParameterValue} stroke={color} strokeWidth="1" fill="none" />
			<path d={dParameterArea} fill={color} opacity="0.1" stroke="none" />
			{[...ccMap.values()].map((cc) => (
				<CCView
					key={cc.id}
					parameterEditor={parameterEditor}
					controlType={controlType}
					cc={cc}
					color={color}
				/>
			))}
		</g>
	);
});

const CCView = memo(function CCView({
	editor,
	fileStore,
	parameterEditor,
	history,
	controlType,
	cc,
	color,
	putCCs,
}: {
	editor?: Editor;
	fileStore?: FileStore;
	parameterEditor: ParameterEditor;
	history?: EditHistoryManager;
	controlType: ControlType;
	cc: CC;
	color: string;
	putCCs?: PutCCs;
}) {
	editor = useComponent(Editor.Key, editor);
	fileStore = useComponent(FileStore.Key, fileStore);
	putCCs = useComponent(PutCCsKey, putCCs);
	history = useComponent(EditHistoryManager.Key, history);

	const zoom = useStateful(editor, (state) => state.zoom);
	const height = useStateful(parameterEditor, (state) => state.height);
	const selectedIds = useStateful(editor, (state) =>
		getSelectedCCIds(state, controlType),
	);
	const isSelected = selectedIds.has(cc.id);

	const ref = usePointerEvents<SVGCircleElement>((manager) => {
		selectByClick(manager, editor, controlType, cc.id);
		manager.onMouseDown((ctx) => {
			updateCC(
				editor,
				fileStore,
				parameterEditor,
				history,
				controlType,
				putCCs,
				ctx,
			);
		});
	});
	return (
		<g>
			<circle
				cx={cc.tick * widthPerTick(zoom)}
				cy={height * (1 - cc.value / 127)}
				r={isSelected ? 6 : 4}
				fill={color}
				stroke={isSelected ? "#fff" : "#000"}
			/>
			<circle
				cx={cc.tick * widthPerTick(zoom)}
				cy={height * (1 - cc.value / 127)}
				r={HANDLE_R}
				fill={color}
				stroke="none"
				opacity={0}
				ref={ref}
				className={css({
					cursor: "grab",
					"&:hover, &:active": {
						opacity: 0.3,
						cursor: "grabbing",
					},
				})}
			/>
		</g>
	);
});

const MarqueeArea = memo(function renderMarqueeArea({
	editor,
}: {
	editor?: Editor;
}): ReactNode {
	editor = useComponent(Editor.Key, editor);

	const marqueeAreaFrom = useStateful(editor, (state) => state.marqueeAreaFrom);
	const marqueeAreaTo = useStateful(editor, (state) => state.marqueeAreaTo);
	const zoom = useStateful(editor, (state) => state.zoom);
	const marqueeArea = getMarqueeArea(marqueeAreaFrom, marqueeAreaTo);

	const x0 = (marqueeArea?.tickFrom ?? 0) * widthPerTick(zoom);
	const x1 = (marqueeArea?.tickTo ?? 0) * widthPerTick(zoom);

	return (
		<rect
			visibility={marqueeArea === null ? "hidden" : "visible"}
			x={x0}
			y={0}
			width={x1 - x0}
			height="100%"
			fill="rgba(0, 120, 215, 0.3)"
			stroke="#fff"
			strokeWidth={1}
			strokeDasharray="1 2"
		/>
	);
});

function addCC(
	editor: Editor,
	parameterEditor: ParameterEditor,
	controlType: ControlType,
	putCCs: PutCCs,
	ctx: DragSessionContext<SVGElement>,
) {
	// CCを一つ以上選択中の場合、選択解除のためのタップとし、追加処理は行わない。
	if (getSelectedCCIds(editor.state, controlType).size > 0) return;

	ctx.stopPropagation();
	ctx.onTap(() => {
		const activeChannelId = editor.state.activeChannelId;
		if (activeChannelId === null) return;

		const bcr = ctx.element.getBoundingClientRect();
		const x = ctx.currentPosition.x - bcr.left + editor.state.scrollLeft;
		const tick = x / widthPerTick(editor.state.zoom);
		const y = ctx.currentPosition.y - bcr.top;
		const value = minmax(0, 127, 127 * (1 - y / parameterEditor.state.height));

		putCCs(
			activeChannelId,
			controlType,
			[{ tick, value, id: CC.generateId() }],
			true,
		);
	});
}

function selectByMarquee(
	editor: Editor,
	fileStore: FileStore,
	controlType: ControlType,
	ctx: DragSessionContext<SVGElement>,
) {
	if (!ctx.metaKey && !ctx.ctrlKey) {
		editor.clearSelection();
	}
	ctx.stopPropagation();
	const svg = ctx.element;

	let originalSelectedCCIds: ReadonlySet<CCId> = EmptySet;
	ctx
		.onDragStart(() => {
			originalSelectedCCIds = getSelectedCCIds(editor.state, controlType);
			const bcr = svg.getBoundingClientRect();
			const x = ctx.currentPosition.x - bcr.left + editor.state.scrollLeft;
			const tick = x / widthPerTick(editor.state.zoom);

			editor.startMarqueeSelection({ key: 0, tick });
		})
		.onDragMove(() => {
			const bcr = svg.getBoundingClientRect();
			const x = ctx.currentPosition.x - bcr.left + editor.state.scrollLeft;
			const tick = x / widthPerTick(editor.state.zoom);

			editor.setMarqueeAreaTo({ key: NUM_KEYS, tick });

			const area = getMarqueeArea(
				editor.state.marqueeAreaFrom,
				editor.state.marqueeAreaTo,
			);
			if (area === null) return;

			const activeChannel = getActiveChannel(
				fileStore.state.song,
				editor.state,
			);
			if (activeChannel === null) return;

			const list = activeChannel.ccLists.get(controlType);
			const ccs = [...(list?.ccs?.values() ?? [])];

			editor.setSelectedCCs(controlType, [
				...originalSelectedCCIds,
				...ccs
					.filter((cc) => area.tickFrom <= cc.tick && cc.tick < area.tickTo)
					.map((cc) => cc.id),
			]);
		})
		.onDragEnd(() => {
			originalSelectedCCIds = EmptySet;
			editor.stopMarqueeSelection();
		});
}

function scrollBySwipe(editor: Editor, ctx: GestureSessionContext<SVGElement>) {
	const initialScrollLeft = editor.state.scrollLeft;
	ctx.onGestureMove(() => {
		editor.setScrollLeft(
			initialScrollLeft - (ctx.currentPosition.x - ctx.startPosition.x),
		);
	});
}

function selectByClick(
	manager: PointerEventsManager<SVGCircleElement>,
	editor: Editor,
	controlType: ControlType,
	ccId: CCId,
) {
	manager.onMouseDown((ctx) => {
		ctx.stopPropagation();
		const selectedIds = getSelectedCCIds(editor.state, controlType);

		if (ctx.metaKey || ctx.ctrlKey) {
			if (selectedIds.has(ccId)) {
				ctx.onTap(() => {
					const newSelectedCCs = toMutableSet(selectedIds);
					newSelectedCCs.delete(ccId);
					editor.setSelectedCCs(controlType, newSelectedCCs);
				});
			} else {
				editor.setSelectedCCs(controlType, [...selectedIds, ccId]);
			}
		} else {
			if (!selectedIds.has(ccId)) {
				editor.setSelectedCCs(controlType, [ccId]);
			}
		}
	});
}

function updateCC(
	editor: Editor,
	fileStore: FileStore,
	parameterEditor: ParameterEditor,
	history: EditHistoryManager,
	controlType: ControlType,
	putCCs: PutCCs,
	ctx: DragSessionContext<SVGElement>,
) {
	const svg = ctx.element.ownerSVGElement;
	if (svg === null) return;

	ctx.stopPropagation();

	const bcr = svg.getBoundingClientRect();
	const x = ctx.currentPosition.x - bcr.left + editor.state.scrollLeft;
	const y = ctx.currentPosition.y - bcr.top;

	const tick = x / widthPerTick(editor.state.zoom);

	const height = parameterEditor.state.height;
	const value = minmax(0, 127, 127 * (1 - y / height));

	const activeChannel = getActiveChannel(fileStore.state.song, editor.state);
	const originalCCList = activeChannel?.ccLists.get(controlType);
	if (originalCCList === undefined) return;

	ctx
		.onDragMove(() => {
			const activeChannelId = editor.state.activeChannelId;
			if (activeChannelId === null) return;

			const bcr = svg.getBoundingClientRect();
			const x = ctx.currentPosition.x - bcr.left + editor.state.scrollLeft;
			const y = ctx.currentPosition.y - bcr.top;

			const tickDiff = x / widthPerTick(editor.state.zoom) - tick;

			const height = parameterEditor.state.height;
			const valueDiff = minmax(0, 127, 127 * (1 - y / height)) - value;

			const ccIds = getSelectedCCIds(editor.state, controlType);

			const newCCs: CC[] = [];
			for (const ccId of ccIds) {
				const originalCC = CCList.get(originalCCList, ccId);
				if (originalCC === null) continue;

				const newCC = CC.applyPatch(originalCC, {
					id: ccId,
					tickDiff,
					valueDiff,
				});
				newCCs.push(newCC);
			}

			putCCs(activeChannelId, controlType, newCCs, false);
		})
		.onDragEnd(() => {
			history.markCheckpoint();
		});
}

const HANDLE_R = 8;
