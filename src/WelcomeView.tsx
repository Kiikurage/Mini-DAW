import { useState } from "react";
import { useComponent } from "./Dependency/DIContainerProvider.tsx";
import { Editor } from "./Editor/Editor.ts";
import { formatTimestamp, sleep } from "./lib.ts";
import { PromiseState } from "./PromiseState.ts";
import {
	type RecentFileEntry,
	RecentFileService,
} from "./RecentFileService.ts";
import { AlertMessage } from "./react/AlertMessage.tsx";
import { Button } from "./react/Button.ts";
import { Divider } from "./react/Divider.tsx";
import { Spinner } from "./react/Spinner.tsx";
import { FlexLayout } from "./react/Styles.ts";
import { useStateful } from "./Stateful/useStateful.tsx";
import { type NewFile, NewFileKey } from "./usecases/NewFile.ts";
import { type OpenFile, OpenFileKey } from "./usecases/OpenFile.ts";

/**
 * アプリ起動時に表示される画面
 * @constructor
 */
export function WelcomeView({
	editor,
	recentFileService,
	newFile,
	openFile,
}: {
	editor?: Editor;
	recentFileService?: RecentFileService;
	newFile?: NewFile;
	openFile?: OpenFile;
}) {
	editor = useComponent(Editor.Key, editor);
	recentFileService = useComponent(RecentFileService.Key, recentFileService);
	newFile = useComponent(NewFileKey, newFile);
	openFile = useComponent(OpenFileKey, openFile);

	const [loadingState, setLoadingState] = useState(PromiseState.initial());

	const recentFiles = useStateful(
		recentFileService,
		(state) => state.recentFiles,
	);

	const onRecentFileEntryClick = async (entry: RecentFileEntry) => {
		setLoadingState(PromiseState.pending());
		try {
			await sleep(1000);
			await openFile(entry.location);
			editor.hideWelcomeView();
			setLoadingState(PromiseState.initial());
		} catch (error) {
			setLoadingState(PromiseState.rejected(error as Error));
		}
	};

	return (
		<div
			css={[
				FlexLayout.row.stretch.center,
				{
					position: "absolute",
					inset: 0,
					overflow: "auto",
				},
			]}
		>
			<div
				css={[
					FlexLayout.column.start.center,
					{
						position: "relative",
						padding: "32px 64px",
						width: "60%",
						maxHeight: "540px",
						pointerEvents: PromiseState.isPending(loadingState)
							? "none"
							: "auto",
					},
				]}
			>
				<h1
					css={{
						fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
						fontWeight: 100,
						letterSpacing: "0.1em",
						fontSize: "48px",
						margin: 0,
						lineHeight: 1,
					}}
				>
					Mini-DAW
				</h1>
				<div css={{ margin: "32px 0" }}>
					<Button
						variant="primary"
						onClick={() => {
							newFile(false);
							editor.hideWelcomeView();
						}}
					>
						新しいファイル
					</Button>
				</div>
				<Divider />
				<h2
					css={{
						fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
						fontWeight: 300,
						fontSize: "24px",
						margin: "0 0 16px",
					}}
				>
					最近使ったファイル
				</h2>
				{PromiseState.isRejected(loadingState) && (
					<AlertMessage variant="error">
						ファイルの読み込み中にエラーが発生しました: {loadingState.message}
					</AlertMessage>
				)}
				<ul
					css={{
						listStyle: "none",
						padding: 0,
						margin: "16px 0",
						width: "100%",
					}}
				>
					{recentFiles.map((entry, i) => (
						<li
							key={`${i}-${entry.fileName}`}
							css={[
								FlexLayout.column.start.start,
								{
									marginBottom: 16,
								},
							]}
						>
							<button
								type="button"
								css={{
									width: "100%",
									border: "none",
									background: "none",
									padding: 0,
									font: "inherit",
									textAlign: "left",
									color: "inherit",
									cursor: "pointer",

									"&:hover": {
										textDecoration: "underline",
									},
								}}
								onClick={() => onRecentFileEntryClick(entry)}
							>
								<span css={{ fontSize: "1.2em" }}>{entry.songTitle}</span>
							</button>
							<span
								css={[
									FlexLayout.row.center.start.gap(8),
									{
										color: "var(--color-foreground-weak)",
										fontSize: "0.9em",
									},
								]}
							>
								<span>{entry.fileName}</span>
								<span>-</span>
								<time dateTime={new Date(entry.lastAccessedAt).toISOString()}>
									{formatTimestamp(entry.lastAccessedAt)}
								</time>
							</span>
						</li>
					))}
					{recentFiles.length === 0 && (
						<span
							css={{
								color: "var(--color-foreground-weak)",
							}}
						>
							最近使ったファイルはありません
						</span>
					)}
				</ul>
			</div>

			{PromiseState.isPending(loadingState) && (
				<div
					css={[
						FlexLayout.row.center.center.gap(8),
						{
							background: "rgba(0, 0, 0, 0.6)",
							position: "absolute",
							inset: 0,
							lineHeight: 1,
						},
					]}
				>
					<Spinner />
					<div>読み込み中...</div>
				</div>
			)}
		</div>
	);
}
