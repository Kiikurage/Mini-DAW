import type { LoadFile } from "../usecases/LoadFile.ts";
import type { NewFile } from "../usecases/NewFile.ts";
import type { SaveFile } from "../usecases/SaveFile.ts";
import { Button } from "./Button.ts";

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
				justifyContent: "flex-start",
				gap: 16,
				width: "100%",
				inset: 0,
				padding: "48px 16px 8px",
				boxSizing: "border-box",
				background: "var(--color-gray-100)",
			}}
		>
			<Button size="sm" variant="normalInline" onClick={() => newFile(true)}>
				新規作成
			</Button>
			<Button size="sm" variant="normalInline" onClick={() => saveFile()}>
				保存
			</Button>
			<Button size="sm" variant="normalInline" onClick={() => loadFile()}>
				読み込み
			</Button>
		</div>
	);
}
