import { FaGithub } from "react-icons/fa";
import { Button } from "./react/Button.ts";
import { IconButton } from "./react/IconButton.ts";
import { Link } from "./react/Link.ts";
import type { LoadFile } from "./usecases/LoadFile.ts";
import type { NewFile } from "./usecases/NewFile.ts";
import type { SaveFile } from "./usecases/SaveFile.ts";

export function GlobalMenuBar({
	newFile,
	saveFile,
	loadFile,
}: {
	newFile: NewFile;
	saveFile: SaveFile;
	loadFile: LoadFile;
}) {
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
