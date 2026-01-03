import { useState } from "react";
import { PiGitCommit, PiPencil, PiSelectionPlus } from "react-icons/pi";
import { css, cx } from "../../../styled-system/css";
import { flex } from "../../../styled-system/patterns";
import { useComponent } from "../../Dependency/DIContainerProvider.tsx";
import { CC } from "../../models/CC.ts";
import { Player } from "../../Player/Player.ts";
import { IconButton } from "../../react/IconButton.tsx";
import { Select } from "../../react/Select/Select.tsx";
import { useStateful } from "../../Stateful/useStateful.tsx";
import { PutCCsKey } from "../../usecases/PutCCs.ts";
import { Editor } from "../Editor.ts";
import { ParameterType } from "../ParameterType.ts";
import { CCEditorView } from "./CCEditorView.tsx";
import { ParameterEditor } from "./ParameterEditor.ts";
import { widthPerTick } from "./ParameterEditorViewRenderer.ts";
import { VelocityEditorView } from "./VelocityEditorView.tsx";

export function ParameterEditorView({
	editor,
	player,
}: {
	editor?: Editor;
	player?: Player;
}) {
	editor = useComponent(Editor.Key, editor);
	player = useComponent(Player.Key, player);
	const putCCs = useComponent(PutCCsKey);

	const [parameterEditor] = useState(() => new ParameterEditor());
	const parameterType = useStateful(
		parameterEditor,
		(state) => state.parameterType,
	);
	const toolMode = useStateful(parameterEditor, (state) => state.toolMode);
	const currentTick = useStateful(player, (state) => state.currentTick);
	const width = useStateful(parameterEditor, (state) => state.width);
	const height = useStateful(parameterEditor, (state) => state.height);
	const zoom = useStateful(editor, (state) => state.zoom);
	const scrollLeft = useStateful(editor, (state) => state.scrollLeft);

	return (
		<div
			className={cx(
				css({
					display: "grid",
					gridTemplate: `
					"toolbar toolbar" auto
					"sidebar editor" 1fr / 32px 1fr
					`,
					gap: 0,
					position: "absolute",
					inset: 0,
				}),
			)}
		>
			<div
				className={cx(
					flex({
						direction: "row",
						align: "center",
						justify: "start",
						gap: 16,
					}),
					css({
						gridArea: "toolbar",
						position: "relative",
						background: "var(--color-background)",
						flex: "0 0 12px",
						borderTop: "1px solid var(--color-border)",
						borderBottom: "1px solid var(--color-border)",
						padding: "4px 8px",
					}),
				)}
			>
				<Select
					value={parameterType.label}
					options={ParameterType.map((p) => ({
						label: p.label,
						id: p.label,
					}))}
					onChange={(option) => {
						const parameterType = ParameterType.find(
							(p) => p.label === option.id,
						);
						if (parameterType === undefined) return;

						parameterEditor.setParameterType(parameterType);
					}}
				/>
				<IconButton
					variant="normalInline"
					size="sm"
					title="範囲選択"
					aria-pressed={toolMode === ParameterEditor.ToolMode.Select}
					onClick={(ev) => {
						parameterEditor.setToolMode(ParameterEditor.ToolMode.Select);
						ev.preventDefault();
						ev.stopPropagation();
					}}
				>
					<PiSelectionPlus />
				</IconButton>
				<IconButton
					variant="normalInline"
					size="sm"
					title="ペン入力"
					aria-pressed={toolMode === ParameterEditor.ToolMode.Draw}
					onClick={(ev) => {
						parameterEditor.setToolMode(ParameterEditor.ToolMode.Draw);
						ev.preventDefault();
						ev.stopPropagation();
					}}
				>
					<PiPencil />
				</IconButton>
				{parameterType.type === "cc" && (
					<IconButton
						variant="normalInline"
						size="sm"
						title="現在時刻で初期値へリセット"
						onClick={(ev) => {
							const channelId = editor.state.activeChannelId;
							if (channelId === null) return;

							putCCs(
								channelId,
								parameterType.controlType,
								[
									{
										id: CC.generateId(),
										tick: player.state.currentTick,
										value: 64,
									},
								],
								true,
							);
							ev.preventDefault();
							ev.stopPropagation();
						}}
					>
						<PiGitCommit />
					</IconButton>
				)}
			</div>
			<div
				className={css({
					gridArea: "sidebar",
					background: "var(--color-background)",
					borderRight: "1px solid var(--color-border)",
				})}
			/>
			<div className={css({ gridArea: "editor", position: "relative" })}>
				{/** biome-ignore lint/a11y/noSvgWithoutTitle: <explanation> */}
				<svg
					viewBox={`0 0 ${width} ${height}`}
					className={css({
						position: "absolute",
						width: "100%",
						height: "100%",
						inset: 0,
						pointerEvents: "none",
					})}
				>
					<g
						style={{
							transform: `translateX(${-scrollLeft}px)`,
						}}
					>
						<path
							d={`M${currentTick * widthPerTick(zoom)} 0 V${height}`}
							stroke="red"
							strokeWidth="1"
						/>
					</g>
				</svg>
				{parameterType.type === "velocity" && (
					<VelocityEditorView parameterEditor={parameterEditor} />
				)}
				{parameterType.type === "cc" && (
					<CCEditorView
						parameterEditor={parameterEditor}
						controlType={parameterType.controlType}
					/>
				)}
			</div>
		</div>
	);
}
