import { useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { MdUpload } from "react-icons/md";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import {
	GoogleAPIClient,
	type GoogleDrive,
} from "../GoogleDriveAPI/GoogleAPIClient.ts";
import { type SerializedSong, Song } from "../models/Song.ts";
import { PromiseState } from "../PromiseState.ts";
import { AlertMessage } from "../react/AlertMessage.tsx";
import { Button } from "../react/Button.ts";
import { Dialog } from "../react/Dialog.tsx";
import { Form } from "../react/Form.tsx";
import { SelectField } from "../react/Select/Select.tsx";
import { FlexLayout } from "../react/Styles.ts";
import { StatusBar } from "../StatusBar/StatusBar.tsx";
import { type LoadFile, LoadFileKey } from "../usecases/LoadFile.ts";
import { type SetSong, SetSongKey } from "../usecases/SetSong.ts";
import { GoogleDriveFileTree } from "./GoogleDriveFileTree.tsx";

type Method = "" | "google-drive" | "local";

export function OpenFileDialog({
	onClose,
	loadFile,
}: {
	onClose: () => void;
	loadFile?: LoadFile;
}) {
	loadFile = useComponent(LoadFileKey, loadFile);

	const [method, setMethod] = useState<Method>("");

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
	setSong,
	onComplete,
	googleAPIClient,
	statusBar,
}: {
	setSong?: SetSong;
	onComplete: () => void;
	googleAPIClient?: GoogleAPIClient;
	statusBar?: StatusBar;
}) {
	googleAPIClient = useComponent(GoogleAPIClient.Key, googleAPIClient);
	statusBar = useComponent(StatusBar.Key, statusBar);

	setSong = useComponent(SetSongKey, setSong);
	const [parentId, setParentIdId] = useState<string | null>(null);
	const [uploadPS, setUploadPS] = useState<PromiseState<GoogleDrive.File>>(
		PromiseState.initial(),
	);

	const onOpenButtonClick = async () => {
		if (parentId === null) return;

		setUploadPS(PromiseState.pending());
		googleAPIClient
			.downloadFile(parentId)
			.then(async (buffer) => {
				const body = await new Promise<string>((resolve) => {
					const reader = new FileReader();
					reader.addEventListener("loadend", () => {
						resolve(reader.result as string);
					});
					reader.readAsText(new Blob([buffer]));
				});
				const data = JSON.parse(body) as SerializedSong;
				const song = Song.deserialize(data);

				setSong(song);
				onComplete();
				statusBar.showMessage("Googleドライブから読み込みました");
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
						<FaSpinner
							css={{
								animation: "spin 1s linear infinite",
								"@keyframes spin": {
									"0%": { transform: "rotate(0deg)" },
									"100%": { transform: "rotate(360deg)" },
								},
							}}
						/>
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
