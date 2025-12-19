import { FaGithub, FaGoogleDrive } from "react-icons/fa";
import { MdFullscreen } from "react-icons/md";
import { useComponent } from "./Dependency/DIContainerProvider.tsx";
import { Button } from "./react/Button.ts";
import { IconButton } from "./react/IconButton.ts";
import { Link } from "./react/Link.ts";
import { OverlayPortal } from "./react/OverlayPortal.ts";
import { FolderSelectDialog } from "./SaveDialog/FolderSelectDialog.tsx";
import { type LoadFile, LoadFileKey } from "./usecases/LoadFile.ts";
import { type NewFile, NewFileKey } from "./usecases/NewFile.ts";
import { type SaveFile, SaveFileKey } from "./usecases/SaveFile.ts";

export function GlobalMenuBar({
	newFile,
	saveFile,
	loadFile,
	overlayPortal,
}: {
	newFile?: NewFile;
	saveFile?: SaveFile;
	loadFile?: LoadFile;
	overlayPortal?: OverlayPortal;
}) {
	newFile = useComponent(NewFileKey, newFile);
	saveFile = useComponent(SaveFileKey, saveFile);
	loadFile = useComponent(LoadFileKey, loadFile);
	overlayPortal = useComponent(OverlayPortal.Key, overlayPortal);

	return (
		<div
			css={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 16,
				width: "100%",
				inset: 0,
				padding: "48px 16px 8px",
				boxSizing: "border-box",
				background: "var(--color-gray-100)",
			}}
		>
			<div
				css={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "flex-start",
					gap: 16,
				}}
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
					onClick={() => saveFile()}
					title="保存"
				>
					保存
				</Button>
				<Button
					size="sm"
					variant="normalInline"
					onClick={() => loadFile()}
					title="読み込み"
				>
					読み込み
				</Button>
			</div>
			<div
				css={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "flex-start",
					gap: 16,
				}}
			>
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
				<IconButton
					variant="normalInline"
					title="Google Driveへ接続"
					onClick={async (ev) => {
						ev.preventDefault();
						ev.stopPropagation();
						new FolderSelectDialog(overlayPortal).open();
					}}
				>
					<FaGoogleDrive size="24" />
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
