import { memo, type ReactNode, useRef, useState } from "react";
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
	quantize,
	toMutableSet,
} from "../../lib.ts";
import { CC, type CCId, CCList } from "../../models/CC.ts";
import {
	type ControlType,
	ControlTypeInitialValues,
} from "../../models/ControlType.ts";
import { useResizeObserver } from "../../react/useResizeObserver.ts";
import { useStateful } from "../../Stateful/useStateful.tsx";
import { type PutCCs, PutCCsKey } from "../../usecases/PutCCs.ts";
import { type RemoveCCs, RemoveCCsKey } from "../../usecases/RemoveCCs.ts";
import { Editor, getSelectedCCIds } from "../Editor.ts";
import type { ParameterEditor } from "./ParameterEditor.ts";
import { widthPerTick } from "./ParameterEditorViewRenderer.ts";
import {
	type DragSessionContext,
	type GestureSessionContext,
	usePointerEvents,
} from "./PointerEventsManager.ts";

function computePath(
	points: { tick: number; value: number }[],
	widthPerTick: number,
	height: number,
) {
	if (points.length === 0) return "";
	const pointStrings = points.map(
		({ tick, value }) => `${tick * widthPerTick} ${(1 - value / 127) * height}`,
	);

	return `M${pointStrings.join("L")}`;
}

export function CCEditorView({
	parameterEditor,
	editor,
	fileStore,
	controlType,
	putCCs,
	removeCCs,
}: {
	parameterEditor: ParameterEditor;
	editor?: Editor;
	fileStore?: FileStore;
	putCCs?: PutCCs;
	removeCCs?: RemoveCCs;
	controlType: ControlType;
}) {
	const resizeObserverRef = useResizeObserver((entry) => {
		parameterEditor.setWidth(entry.contentRect.width);
		parameterEditor.setHeight(entry.contentRect.height);
	});

	editor = useComponent(Editor.Key, editor);
	putCCs = useComponent(PutCCsKey, putCCs);
	removeCCs = useComponent(RemoveCCsKey, removeCCs);
	fileStore = useComponent(FileStore.Key, fileStore);

	const scrollLeft = useStateful(editor, (state) => state.scrollLeft);
	const width = useStateful(parameterEditor, (state) => state.width);
	const height = useStateful(parameterEditor, (state) => state.height);

	const [points, setPoints] = useState<
		{
			tick: number;
			value: number;
		}[]
	>([]);

	// onDragEndで最新のpointsを参照できるように。
	// TODO: より良い方法があればそちらに変更する。
	const latestPointsRef = useRef(points);
	latestPointsRef.current = points;

	const ref = usePointerEvents<SVGElement>((manager) => {
		manager
			.onMouseDown((ctx) => {
				switch (parameterEditor.state.toolMode) {
					case "select": {
						addCC(editor, parameterEditor, controlType, putCCs, ctx);
						selectByMarquee(editor, fileStore, controlType, ctx);
						break;
					}
					case "draw": {
						drawLine(
							editor,
							parameterEditor,
							(tick, value) => {
								setPoints([{ tick, value }]);
							},
							(tick, value) => {
								setPoints((points) => {
									if (points.length < 2) return [...points, { tick, value }];

									const firstPoint = points[0];
									const lastPoint = points[Math.min(points.length - 1, 1)];

									const isRTL =
										firstPoint !== undefined &&
										lastPoint !== undefined &&
										firstPoint.tick > lastPoint.tick;

									let pointsLength = points.length;
									if (isRTL) {
										while (pointsLength > 0) {
											const lastPoint = points[pointsLength - 1];
											if (lastPoint === undefined) break;
											if (lastPoint.tick > tick) break;

											pointsLength--;
										}
									} else {
										while (pointsLength > 0) {
											const lastPoint = points[pointsLength - 1];
											if (lastPoint === undefined) break;
											if (lastPoint.tick < tick) break;

											pointsLength--;
										}
									}

									return [...points.slice(0, pointsLength), { tick, value }];
								});
							},
							() => {
								const channelId = editor.state.activeChannelId;
								if (channelId === null) return;

								const channel = fileStore.state.song.channels.get(channelId);
								if (channel === undefined) return;

								const points = latestPointsRef.current;
								if (points.length === 0) return;

								setPoints([]);

								const firstPoint = getNonNull(points.at(0));
								const lastPoint = getNonNull(points.at(-1));
								const firstTick = firstPoint.tick;
								const lastTick = lastPoint.tick;
								const tickFrom = Math.min(firstTick, lastTick);
								const tickTo = Math.max(firstTick, lastTick) + 1;

								const normalizedPoints: { tick: number; value: number }[] = [];

								normalizedPoints.push(firstPoint);
								const tickStep = editor.state.quantizeUnitInTick;
								let tick = quantize(tickFrom + tickStep, tickStep);
								let lastPointIndex = 0; // 現在時刻以前の最後の点
								while (tick < tickTo) {
									while (
										(points.at(lastPointIndex + 1)?.tick ??
											Number.POSITIVE_INFINITY) <= tick
									) {
										lastPointIndex++;
									}

									const p1 = getNonNull(points.at(lastPointIndex));
									const p2 = getNonNull(points.at(lastPointIndex + 1));

									// 線形補間
									const ratio = (tick - p1.tick) / (p2.tick - p1.tick);
									const value = p1.value * (1 - ratio) + p2.value * ratio;
									normalizedPoints.push({ tick, value });
									tick += tickStep;
								}
								normalizedPoints.push(lastPoint);
								normalizedPoints.push({
									tick: tickTo,
									value: ControlTypeInitialValues[controlType],
								});

								const existingCCIds = [
									...(channel.ccLists
										.get(controlType)
										?.ccs?.values()
										?.filter((cc) => tickFrom <= cc.tick && cc.tick < tickTo)
										?.map((cc) => cc.id) ?? []),
								];
								// 初期
								removeCCs({
									channelId,
									type: controlType,
									ids: existingCCIds,
									markCheckpoint: false,
								});
								putCCs(
									channelId,
									controlType,
									normalizedPoints.map(({ tick, value }) => ({
										id: CC.generateId(),
										tick,
										value,
									})),
									true,
								);
								parameterEditor.setToolMode("select");
							},
							ctx,
						);
						break;
					}
				}
			})
			.onGestureStart((ctx) => {
				scrollBySwipe(editor, ctx);
			});
	});

	const drawingLinePath = computePath(
		points,
		widthPerTick(editor.state.zoom),
		height,
	);

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
				<path d={drawingLinePath} stroke="#fff" strokeWidth={2} fill="none" />
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

	let prevX = 0;
	let prevY = height * (1 - ControlTypeInitialValues[controlType] / 127);
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
		manager.onMouseDown((ctx) => {
			switch (parameterEditor.state.toolMode) {
				case "select": {
					selectByClick(editor, controlType, cc.id, ctx);
					updateCC(
						editor,
						fileStore,
						parameterEditor,
						history,
						controlType,
						putCCs,
						ctx,
					);
					break;
				}
				case "draw": {
					// TODO;
				}
			}
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
	editor: Editor,
	controlType: ControlType,
	ccId: CCId,
	ctx: DragSessionContext<SVGCircleElement>,
) {
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

function drawLine(
	editor: Editor,
	parameterEditor: ParameterEditor,
	onStart: (tick: number, value: number) => void,
	onMove: (tick: number, value: number) => void,
	onEnd: () => void,
	ctx: DragSessionContext<SVGElement>,
) {
	const svg = ctx.element;
	if (svg === null) return;

	ctx.stopPropagation();
	ctx
		.onDragStart(() => {
			const bcr = svg.getBoundingClientRect();
			const x = ctx.currentPosition.x - bcr.left + editor.state.scrollLeft;
			const y = ctx.currentPosition.y - bcr.top;

			const tick = x / widthPerTick(editor.state.zoom);
			const vallue = minmax(
				0,
				127,
				127 * (1 - y / parameterEditor.state.height),
			);

			onStart(tick, vallue);
		})
		.onDragMove(() => {
			const bcr = svg.getBoundingClientRect();
			const x = ctx.currentPosition.x - bcr.left + editor.state.scrollLeft;
			const y = ctx.currentPosition.y - bcr.top;

			const tick = x / widthPerTick(editor.state.zoom);
			const vallue = minmax(
				0,
				127,
				127 * (1 - y / parameterEditor.state.height),
			);

			onMove(tick, vallue);
		})
		.onDragEnd(() => {
			onEnd();
		});
}

const HANDLE_R = 8;
