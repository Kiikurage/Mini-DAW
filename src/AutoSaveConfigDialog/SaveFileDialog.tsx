import { useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { MdDownload } from "react-icons/md";
import { AutoSaveService } from "../AutoSaveService/AutoSaveService.ts";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import {
	GoogleAPIClient,
	type GoogleDrive,
} from "../GoogleDriveAPI/GoogleAPIClient.ts";
import { PromiseState } from "../PromiseState.ts";
import { AlertMessage } from "../react/AlertMessage.tsx";
import { Button } from "../react/Button.ts";
import { Dialog } from "../react/Dialog.tsx";
import { Form } from "../react/Form.tsx";
import { InputField } from "../react/Input.tsx";
import { SelectField } from "../react/Select/Select.tsx";
import { FlexLayout } from "../react/Styles.ts";
import { SongStore } from "../SongStore.ts";
import { StatusBar } from "../StatusBar/StatusBar.tsx";
import { type SaveFile, SaveFileKey } from "../usecases/SaveFile.ts";
import {
	type SaveToGoogleDrive,
	SaveToGoogleDriveKey,
} from "../usecases/SaveToGoogleDrive.ts";
import { GoogleDriveFileTree } from "./GoogleDriveFileTree.tsx";

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
				<div css={[FlexLayout.column.stretch.stretch.gap(8)]}>
					<Form.Row>
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
									saveFile();
									onClose();
								}}
								css={{
									marginTop: 48,
									marginBottom: 24,
									flex: "1 1 0",
								}}
							>
								ダウンロード <MdDownload />
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
	saveToGoogleDrive,
	songStore,
	statusBar,
	autoSaveService,
	googleAPIClient,
}: {
	onComplete: () => void;
	saveToGoogleDrive?: SaveToGoogleDrive;
	songStore?: SongStore;
	statusBar?: StatusBar;
	autoSaveService?: AutoSaveService;
	googleAPIClient?: GoogleAPIClient;
}) {
	songStore = useComponent(SongStore.Key, songStore);
	statusBar = useComponent(StatusBar.Key, statusBar);
	autoSaveService = useComponent(AutoSaveService.Key, autoSaveService);
	googleAPIClient = useComponent(GoogleAPIClient.Key, googleAPIClient);

	const [parentId, setParentIdId] = useState<string | null>(null);
	const [fileName, setFileName] = useState(
		`${songStore.state.song.title}.json`,
	);
	const [uploadPS, setUploadPS] = useState<PromiseState<GoogleDrive.File>>(
		PromiseState.initial(),
	);

	saveToGoogleDrive = useComponent(SaveToGoogleDriveKey, saveToGoogleDrive);

	const onSaveButtonClick = async () => {
		if (parentId === null) return;
		if (fileName.trim() === "") return;

		setUploadPS(PromiseState.pending());
		saveToGoogleDrive({ parentId, fileName })
			.then((file) => {
				onComplete();
				statusBar.showMessage("Googleドライブに保存しました");
				songStore.setLocation({ type: "googleDrive", fileId: file.id });
			})
			.catch((e) => setUploadPS(e));
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
				<GoogleDriveFileTree onSelect={(id) => setParentIdId(id)} />
			</Form.Row>
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
				css={{
					marginTop: 32,
					flex: "1 1 0",
				}}
				disabled={PromiseState.isPending(uploadPS)}
			>
				{!PromiseState.isPending(uploadPS) && <span>保存</span>}
				{PromiseState.isPending(uploadPS) && (
					<div css={FlexLayout.row.center.center.gap(8)}>
						<FaSpinner
							css={{
								animation: "spin 1s linear infinite",
								"@keyframes spin": {
									"0%": { transform: "rotate(0deg)" },
									"100%": { transform: "rotate(360deg)" },
								},
							}}
						/>
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
