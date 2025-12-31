import { css, cx } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { ChannelListView } from "../ChannelList/ChannelListView.tsx";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { Select } from "../react/Select/Select.tsx";
import { useResizeObserver } from "../react/useResizeObserver.ts";
import { Splitter } from "../Splitter/Splitter.tsx";
import { useStateful } from "../Stateful/useStateful.tsx";
import { StatusBarView } from "../StatusBar/StatusBarView.tsx";
import { ToolBar } from "../ToolBar/ToolBar.tsx";
import { Editor } from "./Editor.ts";
import { ParameterEditorView } from "./ParameterEditor/ParameterEditorView.tsx";
import { ParameterType } from "./ParameterType.ts";
import { PianoRollView } from "./PianoRoll/PianoRollView.tsx";

export function EditorView({ editor }: { editor?: Editor }) {
	editor = useComponent(Editor.Key, editor);
	const parameterType = useStateful(editor, (state) => state.parameterType);

	const resizeObserverRef = useResizeObserver((entry) => {
		editor.setWidth(entry.contentRect.width);
	});

	return (
		<div
			className={cx(
				flex({ direction: "column", align: "stretch", justify: "stretch" }),
				css({ position: "absolute", inset: 0 }),
			)}
		>
			<ToolBar />

			<div className={css({ position: "relative", flex: "1 1 0" })}>
				<Splitter direction="row">
					<Splitter.Area defaultSize={240}>
						<ChannelListView />
					</Splitter.Area>
					<Splitter.Area flex>
						<div
							ref={resizeObserverRef}
							className={css({
								position: "absolute",
								inset: 0,
							})}
						>
							<Splitter>
								<Splitter.Area flex>
									<PianoRollView />
								</Splitter.Area>
								<Splitter.Area defaultSize={200}>
									<div
										className={cx(
											flex({
												direction: "column",
												align: "stretch",
												justify: "stretch",
											}),
											css({
												position: "absolute",
												inset: 0,
											}),
										)}
									>
										<div
											className={cx(
												flex({
													direction: "row",
													align: "baseline",
													justify: "start",
													gap: 16,
												}),
												css({
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

													editor.setParameterType(parameterType);
												}}
											/>
										</div>
										<div
											className={css({ position: "relative", flex: "1 1 0" })}
										>
											<ParameterEditorView />
										</div>
									</div>
								</Splitter.Area>
							</Splitter>
						</div>
					</Splitter.Area>
				</Splitter>
			</div>

			<StatusBarView />
		</div>
	);
}
