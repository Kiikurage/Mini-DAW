import { FaGithub, FaRedo, FaUndo } from "react-icons/fa";
import { MdContentPaste, MdFullscreen } from "react-icons/md";
import { css, cx } from "../styled-system/css";
import { flex } from "../styled-system/patterns";
import { ClipboardManager } from "./ClipboardManager.ts";
import { useComponent } from "./Dependency/DIContainerProvider.tsx";
import { EditHistoryManager } from "./EditHistory/EditHistoryManager.ts";
import { OpenFileDialog } from "./OpenFileDialog.tsx";
import { Button } from "./react/Button.tsx";
import { IconButton } from "./react/IconButton.tsx";
import { Link } from "./react/Link.tsx";
import { OverlayPortal } from "./react/OverlayPortal.ts";
import { SaveFileDialog } from "./SaveFileDialog.tsx";
import { useStateful } from "./Stateful/useStateful.tsx";
import { type NewFile, NewFileKey } from "./usecases/NewFile.ts";

export function GlobalMenuBar({
	newFile,
	overlayPortal,
	history,
	clipboard,
}: {
	newFile?: NewFile;
	overlayPortal?: OverlayPortal;
	history?: EditHistoryManager;
	clipboard?: ClipboardManager;
}) {
	newFile = useComponent(NewFileKey, newFile);
	overlayPortal = useComponent(OverlayPortal.Key, overlayPortal);
	history = useComponent(EditHistoryManager.Key, history);
	clipboard = useComponent(ClipboardManager.Key, clipboard);

	const canUndo = useStateful(history, (state) => state.canUndo);
	const canRedo = useStateful(history, (state) => state.canRedo);

	return (
		<div
			className={cx(
				flex({
					direction: "row",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 16,
				}),
				css({
					width: "100%",
					inset: 0,
					padding: "48px 16px 8px",
					boxSizing: "border-box",
					background: "var(--color-gray-100)",
				}),
			)}
		>
			<div
				className={cx(
					flex({
						direction: "row",
						alignItems: "center",
						justifyContent: "start",
						gap: 16,
					}),
				)}
			>
				<Button
					size="sm"
					variant="normalInline"
					onClick={() => newFile(true)}
					title="新規作成"
				>
					新規作成
				</Button>
				<Button
					size="sm"
					variant="normalInline"
					onClick={() => {
						overlayPortal.show(({ close }) => (
							<SaveFileDialog onClose={close} />
						));
					}}
					title="保存"
				>
					保存
				</Button>
				<Button
					size="sm"
					variant="normalInline"
					onClick={() => {
						overlayPortal.show(({ close }) => (
							<OpenFileDialog onClose={close} />
						));
					}}
					title="開く"
				>
					開く
				</Button>
			</div>
			<div
				className={cx(
					flex({
						direction: "row",
						alignItems: "center",
						justifyContent: "start",
						gap: 16,
					}),
				)}
			>
				<IconButton
					variant="normalInline"
					title="貼り付け"
					onClick={() => {
						void clipboard.paste();
					}}
				>
					<MdContentPaste size="16" />
				</IconButton>
				<IconButton
					variant="normalInline"
					title="元に戻す"
					disabled={!canUndo}
					onClick={() => {
						history.undo();
					}}
				>
					<FaUndo size="16" />
				</IconButton>
				<IconButton
					variant="normalInline"
					title="やり直し"
					disabled={!canRedo}
					onClick={() => {
						history.redo();
					}}
				>
					<FaRedo size="16" />
				</IconButton>
				<IconButton
					variant="normalInline"
					title="全画面表示"
					onClick={async () => {
						if (document.fullscreenElement) {
							await document.exitFullscreen();
						} else {
							document.body.requestFullscreen().catch((e) => alert(e));
						}
					}}
				>
					<MdFullscreen size="24" />
				</IconButton>
				<Link
					href="https://github.com/Kiikurage/Mini-DAW"
					target="_blank"
					rel="noopener noreferrer"
				>
					<IconButton variant="normalInline" title="GitHub リポジトリへ移動">
						<FaGithub size="24" />
					</IconButton>
				</Link>
			</div>
		</div>
	);
}
