import { useState } from "react";
import { css, cx } from "../styled-system/css";
import { flex } from "../styled-system/patterns";
import { useComponent } from "./Dependency/DIContainerProvider.tsx";
import { Editor } from "./Editor/Editor.ts";
import { formatTimestamp, sleep } from "./lib.ts";
import { PromiseState } from "./PromiseState.ts";
import {
	type RecentFileEntry,
	RecentFileService,
} from "./RecentFileService.ts";
import { AlertMessage } from "./react/AlertMessage.tsx";
import { Button } from "./react/Button.tsx";
import { Divider } from "./react/Divider.tsx";
import { Spinner } from "./react/Spinner.tsx";
import { useStateful } from "./Stateful/useStateful.tsx";
import { type NewFile, NewFileKey } from "./usecases/NewFile.ts";
import { type OpenFile, OpenFileKey } from "./usecases/OpenFile.ts";
import { type PutFile, PutFileKey } from "./usecases/PutFile.ts";

/**
 * アプリ起動時に表示される画面
 * @constructor
 */
export function WelcomeView({
	editor,
	recentFileService,
	newFile,
	openFile,
	putFile,
}: {
	editor?: Editor;
	recentFileService?: RecentFileService;
	newFile?: NewFile;
	openFile?: OpenFile;
	putFile?: PutFile;
}) {
	editor = useComponent(Editor.Key, editor);
	recentFileService = useComponent(RecentFileService.Key, recentFileService);
	newFile = useComponent(NewFileKey, newFile);
	openFile = useComponent(OpenFileKey, openFile);
	putFile = useComponent(PutFileKey, putFile);

	const [loadingState, setLoadingState] = useState(PromiseState.initial());

	const recentFiles = useStateful(
		recentFileService,
		(state) => state.recentFiles,
	);

	const onRecentFileEntryClick = async (entry: RecentFileEntry) => {
		setLoadingState(PromiseState.pending());
		try {
			await sleep(1000);
			const file = await openFile(entry.location);
			await putFile(file);
			setLoadingState(PromiseState.initial());
		} catch (error) {
			setLoadingState(PromiseState.rejected(error as Error));
		}
	};

	return (
		<div
			className={cx(
				flex({
					direction: "row",
					alignItems: "stretch",
					justifyContent: "center",
					wrap: "wrap",
				}),
				css({
					position: "absolute",
					inset: 0,
					overflow: "auto",
				}),
			)}
		>
			<div
				className={cx(
					flex({
						direction: "column",
						alignItems: "start",
						justifyContent: "center",
					}),
					css({
						position: "relative",
						padding: "32px 64px",
						width: "60%",
						maxHeight: "540px",
					}),
				)}
				style={{
					pointerEvents: PromiseState.isPending(loadingState) ? "none" : "auto",
				}}
			>
				<h1
					className={css({
						fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
						fontWeight: "light",
						letterSpacing: "0.1em",
						fontSize: "48px",
						margin: 0,
						lineHeight: 1,
					})}
				>
					Mini-DAW
				</h1>
				<div
					className={css({
						my: "32px",
					})}
				>
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
					className={css({
						fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
						fontWeight: 300,
						fontSize: "24px",
						mb: 16,
					})}
				>
					最近使ったファイル
				</h2>
				{PromiseState.isRejected(loadingState) && (
					<AlertMessage variant="error">
						ファイルの読み込み中にエラーが発生しました: {loadingState.message}
					</AlertMessage>
				)}
				<ul
					className={css({
						listStyle: "none",
						my: 16,
						width: "100%",
					})}
				>
					{recentFiles.map((entry, i) => (
						<li
							key={`${i}-${entry.fileName}`}
							className={cx(
								flex({
									direction: "column",
									alignItems: "start",
									justifyContent: "start",
								}),
								css({
									mb: 16,
								}),
							)}
						>
							<button
								type="button"
								className={css({
									width: "100%",
									border: "none",
									background: "none",
									font: "inherit",
									textAlign: "left",
									color: "inherit",
									cursor: "pointer",

									"&:hover": {
										textDecoration: "underline",
									},
								})}
								onClick={() => onRecentFileEntryClick(entry)}
							>
								<span className={css({ fontSize: "1.2em" })}>
									{entry.songTitle}
								</span>
							</button>
							<span
								className={cx(
									flex({
										direction: "row",
										alignItems: "center",
										justifyContent: "start",
									}),
									css({
										gap: 8,
										color: "var(--color-foreground-weak)",
										fontSize: "0.9em",
									}),
								)}
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
							className={css({
								color: "var(--color-foreground-weak)",
							})}
						>
							最近使ったファイルはありません
						</span>
					)}
				</ul>
			</div>
			{PromiseState.isPending(loadingState) && (
				<div
					className={cx(
						flex({
							direction: "row",
							alignItems: "center",
							justifyContent: "center",
						}),
						css({
							gap: 8,
							background: "rgba(0, 0, 0, 0.6)",
							position: "absolute",
							inset: 0,
							lineHeight: 1,
						}),
					)}
				>
					<Spinner />
					<div>読み込み中...</div>
				</div>
			)}
		</div>
	);
}
