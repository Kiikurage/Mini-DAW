import type { CSSObject } from "@emotion/styled";
import { useState } from "react";
import {
	FaChevronDown,
	FaChevronRight,
	FaFile,
	FaFolder,
	FaSpinner,
} from "react-icons/fa";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { FS } from "../GoogleDriveAPI/FS.ts";
import {
	GoogleAPIClient,
	GoogleDrive,
} from "../GoogleDriveAPI/GoogleAPIClient.ts";
import { PromiseState } from "../PromiseState.ts";
import { Button } from "../react/Button.ts";
import { Dialog } from "../react/Dialog.tsx";
import { Form } from "../react/Form.tsx";
import { Input } from "../react/Input.ts";
import type { OverlayPortal } from "../react/OverlayPortal.ts";
import {
	ListBoxItemStyleBase,
	ListBoxStyleBase,
	UIControlStyleBase,
} from "../react/Styles.ts";
import { useStateful } from "../Stateful/useStateful.tsx";

export class FolderSelectDialog {
	private closeHandle: (() => void) | null = null;

	constructor(private readonly overlayPortal: OverlayPortal) {}

	open() {
		this.close();
		this.closeHandle = this.overlayPortal.show(() => (
			<FolderSelectDialogView controller={this} onClose={() => this.close()} />
		));
	}

	close() {
		this.closeHandle?.();
		this.closeHandle = null;
	}
}

function FolderSelectDialogView({
	controller,
	onClose,
	googleAPIClient,
}: {
	controller: FolderSelectDialog;
	onClose: () => void;
	googleAPIClient?: GoogleAPIClient;
}) {
	const onSubmit = () => {
		onClose();
	};
	googleAPIClient = useComponent(GoogleAPIClient.Key, googleAPIClient);
	const [rootFolder] = useState(() => {
		return new FS.Folder(
			GoogleDrive.ROOT_FOLDER_ID,
			"My Drive",
			googleAPIClient,
		);
	});

	return (
		<Dialog open modal onClose={onClose}>
			<Dialog.Header>フォルダを選択</Dialog.Header>
			<Dialog.Body>
				<Form>
					<Form.Row>
						<Form.Field label="保存先" flex>
							<div
								css={[
									UIControlStyleBase,
									{
										height: 240,
										width: "60vw",
										overflowY: "auto",
									},
								]}
							>
								<FolderView folder={rootFolder} depth={0} />
							</div>
						</Form.Field>
					</Form.Row>
					<Form.Row>
						<Form.Field label="ファイル名" flex>
							<Input css={{ width: "100%" }} />
						</Form.Field>
					</Form.Row>
				</Form>
			</Dialog.Body>
			<Dialog.Footer>
				<Button onClick={onClose}>キャンセル</Button>
				<Button variant="primary" onClick={onSubmit}>
					選択
				</Button>
			</Dialog.Footer>
		</Dialog>
	);
}

function FolderView({ folder, depth }: { folder: FS.Folder; depth: number }) {
	const [isExpanded, setExpanded] = useState(false);
	return (
		<li
			css={{
				listStyle: "none",
			}}
		>
			<button
				type="button"
				css={[ListBoxItemStyleBase, listItemBaseStyle(depth)]}
				onClick={() => setExpanded((value) => !value)}
				onKeyDown={(ev) => {
					switch (ev.key) {
						case " ":
						case "Enter": {
							setExpanded((value) => !value);
							break;
						}
					}
				}}
			>
				<FaChevronDown
					css={{
						transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
						transition: "transform 60ms ease-out",
					}}
				/>
				<FaFolder />
				<div
					css={{
						flex: "1 1 0",
						minWidth: 0,
						overflow: "clip",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{folder.name}
				</div>
			</button>
			{isExpanded && <FolderChildrenView folder={folder} depth={depth + 1} />}
		</li>
	);
}

function FolderChildrenView({
	folder,
	depth,
}: {
	folder: FS.Folder;
	depth: number;
}) {
	const children = useStateful(folder, (state) => state.children);

	if (PromiseState.isPending(children)) {
		return (
			<div
				css={[
					ListBoxItemStyleBase,
					listItemBaseStyle(depth),
					{
						color: "var(--color-foreground-weak)",
					},
				]}
			>
				<FaSpinner
					css={{
						animation: "spin 1s linear infinite",
						"@keyframes spin": {
							from: { transform: "rotate(0deg)" },
							to: { transform: "rotate(360deg)" },
						},
					}}
				/>
				読み込み中...
			</div>
		);
	}
	if (PromiseState.isRejected(children)) {
		return (
			<div
				css={{
					color: "var(--color-error-500)",
				}}
			>
				エラー: 読み込めませんでした
			</div>
		);
	}

	return (
		<ul
			css={[
				ListBoxStyleBase,
				{
					padding: 0,
					margin: 0,
				},
			]}
		>
			{children.map((child) => {
				if (child instanceof FS.Folder) {
					return <FolderView key={child.id} folder={child} depth={depth} />;
				} else {
					return (
						<li
							key={child.id}
							css={[ListBoxItemStyleBase, listItemBaseStyle(depth)]}
						>
							<FaFile />
							<div
								css={{
									flex: "1 1 0",
									minWidth: 0,
									overflow: "clip",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap",
								}}
							>
								{child.name}
							</div>
						</li>
					);
				}
			})}
		</ul>
	);
}

function listItemBaseStyle(depth: number): CSSObject {
	return {
		paddingLeft: 16 + depth * 44,
	};
}
