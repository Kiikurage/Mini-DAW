import { useState } from "react";
import { MdUpload } from "react-icons/md";
import { css, cx } from "../styled-system/css";
import { flex } from "../styled-system/patterns";
import { useComponent } from "./Dependency/DIContainerProvider.tsx";
import { GoogleDriveFileTree } from "./GoogleDriveFileTree.tsx";
import { type SerializedSong, Song } from "./models/Song.ts";
import { handlePromiseState, PromiseState } from "./PromiseState.ts";
import { AlertMessage } from "./react/AlertMessage.tsx";
import { Button } from "./react/Button.tsx";
import { Dialog } from "./react/Dialog.tsx";
import { FormRow } from "./react/Form.tsx";
import { SelectField } from "./react/Select/Select.tsx";
import { Spinner } from "./react/Spinner.tsx";
import { type OpenFile, OpenFileKey } from "./usecases/OpenFile.ts";
import { type PutFile, PutFileKey } from "./usecases/PutFile.ts";

type Method = "google-drive" | "local";

export function OpenFileDialog({ onClose }: { onClose: () => void }) {
	const [method, setMethod] = useState<Method>("local");

	return (
		<Dialog open modal onClose={onClose}>
			<Dialog.Header>開く</Dialog.Header>
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
							label="読み込み元"
							selectProps={{
								value: method,
								options: [
									{
										label: "ローカルファイル",
										id: "local" as const,
										helperText: "このPCに保存したデータを読み込みます",
									},
									{
										label: "Google ドライブ",
										id: "google-drive" as const,
										helperText: "Googleドライブに保存したデータを読み込みます",
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
						<LocalFileSection onComplete={() => onClose()} />
					)}
					{method === "google-drive" && (
						<GoogleDriveSection onComplete={() => onClose()} />
					)}
				</div>
			</Dialog.Body>
		</Dialog>
	);
}

function LocalFileSection({
	onComplete,
	putFile,
}: {
	onComplete: () => void;
	putFile?: PutFile;
}) {
	putFile = useComponent(PutFileKey, putFile);

	const onOpenButtonClick = async () => {
		openFileSelectDialog({
			accept: ".json,application/json",
			onOpen: async (file) => {
				try {
					const body = await new Promise<string>((resolve) => {
						const reader = new FileReader();
						reader.addEventListener("loadend", () => {
							resolve(reader.result as string);
						});
						reader.readAsText(file);
					});
					const data = JSON.parse(body) as SerializedSong;
					const song = Song.deserialize(data);

					await putFile({
						song,
						metadata: null,
					});
					onComplete();
				} catch (e) {
					console.error(e);
				}
			},
		});
		onComplete();
	};

	return (
		<FormRow>
			<Button
				variant="primary"
				size="lg"
				onClick={onOpenButtonClick}
				className={css({
					marginTop: 48,
					marginBottom: 24,
					flex: "1 1 0",
				})}
			>
				ファイルを選択 <MdUpload />
			</Button>
		</FormRow>
	);
}

function GoogleDriveSection({
	onComplete,
	openFile,
	putFile,
}: {
	onComplete: () => void;
	openFile?: OpenFile;
	putFile?: PutFile;
}) {
	openFile = useComponent(OpenFileKey, openFile);
	putFile = useComponent(PutFileKey, putFile);

	const [fileId, setFileId] = useState<string | null>(null);
	const [uploadPS, setUploadPS] = useState<PromiseState<{}>>(
		PromiseState.initial(),
	);

	const onOpenButtonClick = async () => {
		if (fileId === null) return;

		setUploadPS(PromiseState.pending());
		handlePromiseState(async () => {
			const file = await openFile({ type: "googleDrive", fileId });
			await putFile(file);

			onComplete();

			return {};
		}, setUploadPS);
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
				<GoogleDriveFileTree onSelect={(id) => setFileId(id)} />
			</FormRow>
			<Button
				variant="primary"
				size="lg"
				onClick={onOpenButtonClick}
				className={css({
					marginTop: 32,
					flex: "1 1 0",
				})}
				disabled={PromiseState.isPending(uploadPS)}
			>
				{!PromiseState.isPending(uploadPS) && <span>ファイルを取得する</span>}
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
						ファイルを取得中...
					</div>
				)}
			</Button>
			{PromiseState.isRejected(uploadPS) && (
				<AlertMessage variant="error">
					ファイルを開けませんでした: {uploadPS.message}
				</AlertMessage>
			)}
		</div>
	);
}

/**
 * Open file select dialog
 * @param onOpen callback when file is selected
 * @param accept accepted file types
 */
function openFileSelectDialog({
	onOpen,
	accept,
}: {
	onOpen: (file: File) => void;
	accept: string;
}) {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = accept;
	input.addEventListener("change", (_ev) => {
		const file = input.files?.[0];
		if (file === undefined) return;
		onOpen(file);
	});
	input.click();
}
