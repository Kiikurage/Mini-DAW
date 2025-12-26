import { type ReactNode, useState } from "react";
import { FaFile, FaFolder, FaSpinner } from "react-icons/fa";
import { MdError } from "react-icons/md";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { FS } from "../GoogleDriveAPI/FS.ts";
import {
	GoogleAPIClient,
	GoogleDrive,
} from "../GoogleDriveAPI/GoogleAPIClient.ts";
import { PromiseState, usePromiseState } from "../PromiseState.ts";
import { Button } from "../react/Button.ts";
import { FlexLayout } from "../react/Styles.ts";
import { TreeView } from "../react/TreeView/TreeView.tsx";
import { useStateful } from "../Stateful/useStateful.tsx";

export function GoogleDriveFileTree({
	googleAPIClient,
	onSelect,
}: {
	googleAPIClient?: GoogleAPIClient;
	onSelect?: (fileId: string) => void;
}) {
	googleAPIClient = useComponent(GoogleAPIClient.Key, googleAPIClient);

	const [rootFolder] = useState(() => {
		return new FS.Folder(
			GoogleDrive.ROOT_FOLDER_ID,
			"My Drive",
			googleAPIClient,
		);
	});
	const about = usePromiseState(() => googleAPIClient.getAbout());

	return (
		<div css={{ flex: "1 1 0" }}>
			<header
				css={[
					FlexLayout.row.center.start.gap(8),
					{
						padding: "4px 0",
						width: "100%",
					},
				]}
			>
				<span>アカウント:</span>
				{PromiseState.isPending(about) && (
					<FaSpinner
						css={{
							animation: "spin 1s linear infinite",
							"@keyframes spin": {
								from: { transform: "rotate(0deg)" },
								to: { transform: "rotate(360deg)" },
							},
						}}
					/>
				)}
				{PromiseState.isFulfilled(about) && (
					<>
						<img
							alt="User Icon"
							src={about.user.photoLink}
							width={16}
							height={16}
							css={{
								borderRadius: "50%",
							}}
						/>
						<span>{about.user.emailAddress}</span>
						<Button
							size="sm"
							variant="normalInline"
							// onClick={() => googleAPIClient.signOut()}
						>
							切り替え
						</Button>
					</>
				)}
			</header>
			<TreeView onSelect={onSelect}>
				<GoogleDriveFileTreeItem
					file={rootFolder}
					depth={0}
					icon={<FaFolder />}
					parentId={null}
				/>
			</TreeView>
		</div>
	);
}

function GoogleDriveFileTreeItemChildren({
	folder,
	depth,
}: {
	folder: FS.Folder;
	depth: number;
}) {
	const children = useStateful(folder, (state) => state.children);
	if (PromiseState.isInitial(children)) {
		return null;
	}
	if (PromiseState.isPending(children)) {
		return (
			<ul
				css={[
					{
						padding: 0,
						margin: 0,
					},
				]}
			>
				<TreeView.Item
					id={`${folder.id}-loading`}
					depth={depth}
					parentId={folder.id}
					icon={
						<FaSpinner
							css={{
								animation: "spin 1s linear infinite",
								"@keyframes spin": {
									from: { transform: "rotate(0deg)" },
									to: { transform: "rotate(360deg)" },
								},
							}}
						/>
					}
					expandable={false}
				>
					読み込み中...
				</TreeView.Item>
			</ul>
		);
	}
	if (PromiseState.isRejected(children)) {
		return (
			<ul
				css={[
					{
						padding: 0,
						margin: 0,
					},
				]}
			>
				<TreeView.Item
					id={`${folder.id}-loading`}
					depth={depth}
					parentId={folder.id}
					icon={<MdError />}
					expandable={false}
				>
					<div
						css={{
							color: "var(--color-error-500)",
						}}
					>
						エラー: 読み込めませんでした
					</div>
				</TreeView.Item>
			</ul>
		);
	}

	return (
		<ul
			css={[
				{
					padding: 0,
					margin: 0,
				},
			]}
		>
			{children.map((child) => (
				<GoogleDriveFileTreeItem
					key={child.id}
					file={child}
					depth={depth}
					icon={child instanceof FS.Folder ? <FaFolder /> : <FaFile />}
					parentId={folder.id}
				/>
			))}
		</ul>
	);
}

function GoogleDriveFileTreeItem({
	file,
	depth,
	icon,
	parentId,
}: {
	file: FS.File;
	depth: number;
	icon?: ReactNode;
	parentId: string | null;
}) {
	const isFolder = file instanceof FS.Folder;

	return (
		<TreeView.Item
			id={file.id}
			depth={depth}
			parentId={parentId}
			icon={icon}
			expandable={isFolder}
			subItem={
				isFolder ? (
					<GoogleDriveFileTreeItemChildren folder={file} depth={depth + 1} />
				) : null
			}
		>
			{file.name}
		</TreeView.Item>
	);
}
