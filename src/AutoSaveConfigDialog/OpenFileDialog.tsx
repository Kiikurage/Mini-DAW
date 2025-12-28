import { useState } from "react";
import { MdUpload } from "react-icons/md";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { handlePromiseState, PromiseState } from "../PromiseState.ts";
import { AlertMessage } from "../react/AlertMessage.tsx";
import { Button } from "../react/Button.ts";
import { Dialog } from "../react/Dialog.tsx";
import { Form } from "../react/Form.tsx";
import { SelectField } from "../react/Select/Select.tsx";
import { Spinner } from "../react/Spinner.tsx";
import { FlexLayout } from "../react/Styles.ts";
import { type LoadFile, LoadFileKey } from "../usecases/LoadFile.ts";
import { type OpenFile, OpenFileKey } from "../usecases/OpenFile.ts";
import { GoogleDriveFileTree } from "./GoogleDriveFileTree.tsx";

type Method = "google-drive" | "local";

export function OpenFileDialog({
	onClose,
	loadFile,
}: {
	onClose: () => void;
	loadFile?: LoadFile;
}) {
	loadFile = useComponent(LoadFileKey, loadFile);

	const [method, setMethod] = useState<Method>("local");

	return (
		<Dialog open modal onClose={onClose}>
			<Dialog.Header>開く</Dialog.Header>
			<Dialog.Body>
				<div css={[FlexLayout.column.stretch.stretch.gap(8)]}>
					<Form.Row>
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
											css={{
												fontSize: "0.8em",
												color: "var(--color-foreground-weak)",
											}}
										>
											{option.helperText}
										</div>
									</div>
								),
								onChange: (option) => setMethod(option.id),
							}}
						/>
					</Form.Row>
					{method === "local" && (
						<Form.Row>
							<Button
								variant="primary"
								size="lg"
								onClick={() => {
									loadFile();
									onClose();
								}}
								css={{
									marginTop: 48,
									marginBottom: 24,
									flex: "1 1 0",
								}}
							>
								ファイルを選択 <MdUpload />
							</Button>
						</Form.Row>
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
	openFile,
}: {
	onComplete: () => void;
	openFile?: OpenFile;
}) {
	openFile = useComponent(OpenFileKey, openFile);

	const [fileId, setFileId] = useState<string | null>(null);
	const [uploadPS, setUploadPS] = useState<PromiseState<{}>>(
		PromiseState.initial(),
	);

	const onOpenButtonClick = async () => {
		if (fileId === null) return;

		setUploadPS(PromiseState.pending());
		handlePromiseState(async () => {
			await openFile({ type: "googleDrive", fileId });

			onComplete();

			return {};
		}, setUploadPS);
	};

	return (
		<div
			css={[
				FlexLayout.column.stretch.center.gap(16),
				{
					marginBottom: 24,
				},
			]}
		>
			<Form.Row>
				<GoogleDriveFileTree onSelect={(id) => setFileId(id)} />
			</Form.Row>
			<Button
				variant="primary"
				size="lg"
				onClick={onOpenButtonClick}
				css={{
					marginTop: 32,
					flex: "1 1 0",
				}}
				disabled={PromiseState.isPending(uploadPS)}
			>
				{!PromiseState.isPending(uploadPS) && <span>ファイルを取得する</span>}
				{PromiseState.isPending(uploadPS) && (
					<div css={FlexLayout.row.center.center.gap(8)}>
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
