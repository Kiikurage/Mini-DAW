import { FaGithub, FaRedo, FaUndo } from "react-icons/fa";
import { MdContentPaste, MdFullscreen } from "react-icons/md";
import { OpenFileDialog } from "./AutoSaveConfigDialog/OpenFileDialog.tsx";
import { SaveFileDialog } from "./AutoSaveConfigDialog/SaveFileDialog.tsx";
import { ClipboardManager } from "./ClipboardManager.ts";
import { useComponent } from "./Dependency/DIContainerProvider.tsx";
import { EditHistoryManager } from "./EditHistory/EditHistoryManager.ts";
import { Button } from "./react/Button.ts";
import { IconButton } from "./react/IconButton.ts";
import { Link } from "./react/Link.ts";
import { OverlayPortal } from "./react/OverlayPortal.ts";
import { FlexLayout } from "./react/Styles.ts";
import { useStateful } from "./Stateful/useStateful.tsx";
import { type LoadFile, LoadFileKey } from "./usecases/LoadFile.ts";
import { type NewFile, NewFileKey } from "./usecases/NewFile.ts";
import { type SaveFile, SaveFileKey } from "./usecases/SaveFile.ts";
import {
	type SaveToGoogleDrive,
	SaveToGoogleDriveKey,
} from "./usecases/SaveToGoogleDrive.ts";

export function GlobalMenuBar({
	newFile,
	saveFile,
	saveToGoogleDrive,
	loadFile,
	overlayPortal,
	history,
	clipboard,
}: {
	newFile?: NewFile;
	saveFile?: SaveFile;
	saveToGoogleDrive?: SaveToGoogleDrive;
	loadFile?: LoadFile;
	overlayPortal?: OverlayPortal;
	history?: EditHistoryManager;
	clipboard?: ClipboardManager;
}) {
	newFile = useComponent(NewFileKey, newFile);
	saveFile = useComponent(SaveFileKey, saveFile);
	saveToGoogleDrive = useComponent(SaveToGoogleDriveKey, saveToGoogleDrive);
	loadFile = useComponent(LoadFileKey, loadFile);
	overlayPortal = useComponent(OverlayPortal.Key, overlayPortal);
	history = useComponent(EditHistoryManager.Key, history);
	clipboard = useComponent(ClipboardManager.Key, clipboard);

	const canUndo = useStateful(history, (state) => state.canUndo);
	const canRedo = useStateful(history, (state) => state.canRedo);

	return (
		<div
			css={[
				FlexLayout.row.center.spaceBetween.gap(16),
				{
					width: "100%",
					inset: 0,
					padding: "48px 16px 8px",
					boxSizing: "border-box",
					background: "var(--color-gray-100)",
				},
			]}
		>
			<div css={[FlexLayout.row.center.start.gap(16)]}>
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
			<div css={[FlexLayout.row.center.start.gap(16)]}>
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
