import { useState } from "react";
import { MdDownload } from "react-icons/md";
import { css, cx } from "../styled-system/css";
import { flex } from "../styled-system/patterns";
import { useComponent } from "./Dependency/DIContainerProvider.tsx";
import { FileStore } from "./FileStore.ts";
import type { GoogleDrive } from "./GoogleDriveAPI/GoogleAPIClient.ts";
import { GoogleDriveFileTree } from "./GoogleDriveFileTree.tsx";
import { PromiseState } from "./PromiseState.ts";
import { AlertMessage } from "./react/AlertMessage.tsx";
import { Button } from "./react/Button.tsx";
import { Dialog } from "./react/Dialog.tsx";
import { FormRow } from "./react/Form.tsx";
import { InputField } from "./react/Input.tsx";
import { SelectField } from "./react/Select/Select.tsx";
import { Spinner } from "./react/Spinner.tsx";
import { type SaveFile, SaveFileKey } from "./usecases/SaveFile.ts";

type Method = "google-drive" | "local";

export function SaveFileDialog({
	onClose,
	saveFile,
}: {
	onClose: () => void;
	saveFile?: SaveFile;
}) {
	saveFile = useComponent(SaveFileKey, saveFile);

	const [method, setMethod] = useState<Method>("local");

	return (
		<Dialog open modal onClose={onClose}>
			<Dialog.Header>保存</Dialog.Header>
			<Dialog.Body>
				<div
					className={flex({
						direction: "column",
						align: "stretch",
						justify: "stretch",
						gap: 8,
					})}
				>
					<FormRow>
						<SelectField
							label="保存先"
							selectProps={{
								value: method,
								options: [
									{
										label: "ローカルファイル",
										id: "local" as const,
										helperText: "作成したデータをこのPCに保存します",
									},
									{
										label: "Google ドライブ",
										id: "google-drive" as const,
										helperText: "作成したデータをGoogleドライブに保存します",
									},
								],
								renderOption: (option) => (
									<div>
										<div>{option.label}</div>
										<div
											className={css({
												fontSize: "0.8em",
												color: "var(--color-foreground-weak)",
											})}
										>
											{option.helperText}
										</div>
									</div>
								),
								onChange: (option) => setMethod(option.id),
							}}
						/>
					</FormRow>
					{method === "local" && (
						<FormRow>
							<Button
								variant="primary"
								size="lg"
								onClick={() => {
									saveFile({ type: "download" });
									onClose();
								}}
								className={css({
									marginTop: 48,
									marginBottom: 24,
									flex: "1 1 0",
								})}
							>
								ダウンロード <MdDownload />
							</Button>
						</FormRow>
					)}
					{method === "google-drive" && (
						<GoogleDriveSection onComplete={() => onClose()} />
					)}
				</div>
			</Dialog.Body>
		</Dialog>
	);
}

function GoogleDriveSection({
	onComplete,
	saveFile,
	fileStore,
}: {
	onComplete: () => void;
	saveFile?: SaveFile;
	fileStore?: FileStore;
}) {
	fileStore = useComponent(FileStore.Key, fileStore);

	const [parentId, setParentIdId] = useState<string | null>(null);
	const [fileName, setFileName] = useState(
		`${fileStore.state.song.title}.json`,
	);
	const [uploadPS, setUploadPS] = useState<PromiseState<GoogleDrive.File>>(
		PromiseState.initial(),
	);

	saveFile = useComponent(SaveFileKey, saveFile);

	const onSaveButtonClick = async () => {
		if (parentId === null) return;
		if (fileName.trim() === "") return;

		setUploadPS(PromiseState.pending());
		saveFile({
			type: "googleDriveAsNewFile",
			parentId,
			fileName,
		})
			.then(onComplete)
			.catch((e) => setUploadPS(e));
	};

	return (
		<div
			className={cx(
				flex({
					direction: "column",
					align: "stretch",
					justify: "center",
					gap: 16,
				}),
				css({
					marginBottom: 24,
				}),
			)}
		>
			<FormRow>
				<GoogleDriveFileTree onSelect={(id) => setParentIdId(id)} />
			</FormRow>
			<InputField
				label="ファイル名"
				inputProps={{
					value: fileName,
					onChange: (e) => setFileName(e.target.value),
					disabled: PromiseState.isPending(uploadPS),
				}}
			/>
			<Button
				variant="primary"
				size="lg"
				onClick={onSaveButtonClick}
				className={css({
					marginTop: 32,
					flex: "1 1 0",
				})}
				disabled={PromiseState.isPending(uploadPS)}
			>
				{!PromiseState.isPending(uploadPS) && <span>保存</span>}
				{PromiseState.isPending(uploadPS) && (
					<div
						className={flex({
							direction: "row",
							align: "center",
							justify: "center",
							gap: 8,
						})}
					>
						<Spinner />
						保存中...
					</div>
				)}
			</Button>
			{PromiseState.isRejected(uploadPS) && (
				<AlertMessage variant="error">
					保存に失敗しました: {uploadPS.message}
				</AlertMessage>
			)}
		</div>
	);
}
