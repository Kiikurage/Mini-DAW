import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { Select } from "../react/Select/Select.tsx";
import { FlexLayout } from "../react/Styles.ts";
import { useResizeObserver } from "../react/useResizeObserver.ts";
import { Splitter } from "../Splitter/Splitter.tsx";
import { useStateful } from "../Stateful/useStateful.tsx";
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
			ref={resizeObserverRef}
			css={{
				position: "absolute",
				inset: 0,
			}}
		>
			<Splitter>
				<Splitter.Area flex>
					<PianoRollView />
				</Splitter.Area>
				<Splitter.Area defaultSize={200}>
					<div
						css={[
							FlexLayout.column.stretch.stretch,
							{
								position: "absolute",
								inset: 0,
							},
						]}
					>
						<div
							css={[
								FlexLayout.row.baseline.start.gap(16),
								{
									position: "relative",
									background: "var(--color-background)",
									flex: "0 0 12px",
									borderTop: "1px solid var(--color-border)",
									borderBottom: "1px solid var(--color-border)",
									padding: "4px 8px",
								},
							]}
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
						<div css={{ position: "relative", flex: "1 1 0" }}>
							<ParameterEditorView />
						</div>
					</div>
				</Splitter.Area>
			</Splitter>
		</div>
	);
}
