import { useEffect, useState } from "react";
import { MdOpenInNew } from "react-icons/md";
import type { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { PreInstalledSouindFonts } from "../PreInstalledSouindFonts.ts";
import { PromiseState } from "../PromiseState.ts";
import { Button } from "../react/Button.ts";
import { Dialog } from "../react/Dialog.tsx";
import { Field } from "../react/Field.tsx";
import { Form } from "../react/Form.tsx";
import { Keyboard } from "../react/Keyboard.tsx";
import { Link } from "../react/Link.ts";
import { ListBox } from "../react/ListBox/ListBox.tsx";
import type { OverlayPortal } from "../react/OverlayPortal.ts";
import { Select, SelectField } from "../react/Select/Select.tsx";
import { FlexLayout } from "../react/Styles.ts";
import type { SoundFontStore } from "../SoundFontStore.ts";
import { useStateful } from "../Stateful/useStateful.tsx";
import type { Synthesizer } from "../Synthesizer.ts";
import type { UpdateChannel } from "../usecases/UpdateChannel.ts";

export class SoundFontDialog {
	private closeHandle: (() => void) | null = null;

	constructor(
		private readonly overlayPortal: OverlayPortal,
		private readonly synthesizer: Synthesizer,
		private readonly soundFontStore: SoundFontStore,
		private readonly updateChannel: UpdateChannel,
		readonly channel: Channel,
	) {}

	open() {
		this.close();
		this.closeHandle = this.overlayPortal.show(() => (
			<SoundFontDialogView
				controller={this}
				onClose={() => this.close()}
				soundFontStore={this.soundFontStore}
				synthesizer={this.synthesizer}
				updateChannel={this.updateChannel}
			/>
		));
	}

	close() {
		this.closeHandle?.();
		this.closeHandle = null;
	}
}

const PREVIEW_CHANNEL_NUMBER = 999;

function SoundFontDialogView({
	synthesizer,
	controller,
	onClose,
	soundFontStore,
	updateChannel,
}: {
	synthesizer: Synthesizer;
	controller: SoundFontDialog;
	onClose: () => void;
	soundFontStore: SoundFontStore;
	updateChannel: UpdateChannel;
}) {
	const [instrumentKey, _setInstrumentKey] = useState(
		controller.channel.instrumentKey,
	);
	const setInstrumentKey = (key: InstrumentKey) => {
		_setInstrumentKey(key);
		synthesizer.setBank({
			channel: PREVIEW_CHANNEL_NUMBER,
			bankNumber: key.bankNumber,
		});
		synthesizer.setPreset({
			channel: PREVIEW_CHANNEL_NUMBER,
			programNumber: key.presetNumber,
		});
	};

	const soundFont = useStateful(soundFontStore, () =>
		soundFontStore.getOrLoad(instrumentKey.url),
	);
	const selectedPreinstalledSoundFont = PreInstalledSouindFonts.find(
		(sf) => sf.soundFontUrl === instrumentKey.url,
	);

	const handleKeyboardPointerDown = (key: number) => {
		synthesizer.noteOn({ channel: PREVIEW_CHANNEL_NUMBER, key, velocity: 100 });
	};

	const handleKeyboardPointerUp = (key: number) => {
		synthesizer.noteOff({ channel: PREVIEW_CHANNEL_NUMBER, key });
	};

	const onSubmit = () => {
		updateChannel(controller.channel.id, {
			instrumentKey,
		});

		onClose();
	};

	useEffect(() => {
		synthesizer.reset(PREVIEW_CHANNEL_NUMBER);
	}, [synthesizer]);

	return (
		<Dialog open modal onClose={onClose}>
			<Dialog.Header>
				楽器を変更: {controller.channel.labelOrDefault}
			</Dialog.Header>
			<Dialog.Body>
				<Form>
					<SelectField
						label="サウンドフォント"
						selectProps={{
							value: instrumentKey.url,
							onChange: (option) => {
								const soundFont = PreInstalledSouindFonts.find(
									(sf) => sf.name === option.id,
								);
								if (soundFont === undefined) return;

								setInstrumentKey(new InstrumentKey(soundFont.name, 0, 0));
							},
							options: PreInstalledSouindFonts.map((soundFont) => ({
								label: soundFont.name,
								id: soundFont.name,
							})),
						}}
					/>
					<footer
						css={[
							FlexLayout.row.end.baseline.gap(8),
							{
								margin: "4px 0 0",
							},
						]}
					>
						{selectedPreinstalledSoundFont === undefined ? null : (
							<>
								<Link
									href={selectedPreinstalledSoundFont.licenseUrl}
									target="_blank"
								>
									<MdOpenInNew />
									ライセンス
								</Link>
								<Link
									href={selectedPreinstalledSoundFont.creatorUrl}
									target="_blank"
								>
									<MdOpenInNew />
									配布元
								</Link>
							</>
						)}
					</footer>
					<Form.Row
						css={{
							maxHeight: 400,
							flexDirection: "row",
							alignItems: "stretcn",
						}}
					>
						<div
							css={[
								FlexLayout.row.stretch.default.gap(16),
								{
									width: "100%",
									maxHeight: "400px",
								},
							]}
						>
							<div
								css={[
									FlexLayout.row.stretch,
									{
										width: 200,
									},
								]}
							>
								<Field label="プリセット">
									{PromiseState.isFulfilled(soundFont) ? (
										<ListBox
											options={[
												...soundFont.getPresetNames().map((preset) => ({
													label: `${preset.presetNumber}: ${preset.name}`,
													id: preset.presetNumber.toString(),
												})),
											]}
											onChange={(presetNumber) => {
												setInstrumentKey(
													new InstrumentKey(
														instrumentKey.name,
														Number.parseInt(presetNumber),
														0,
													),
												);
											}}
										/>
									) : PromiseState.isPending(soundFont) ? (
										<span>ロード中...</span>
									) : PromiseState.isRejected(soundFont) ? (
										<span>サウンドフォントの読み込みに失敗しました</span>
									) : null}
								</Field>
							</div>
							<div
								css={[
									FlexLayout.row.stretch,
									{
										width: 200,
									},
								]}
							>
								<Field label="バンク">
									{PromiseState.isFulfilled(soundFont) ? (
										<ListBox
											value={instrumentKey.presetNumber.toString()}
											onChange={(bankNumber) => {
												setInstrumentKey(
													new InstrumentKey(
														instrumentKey.name,
														instrumentKey.presetNumber,
														Number.parseInt(bankNumber),
													),
												);
											}}
											options={[
												...soundFont
													.getPresetsByPresetNumber(instrumentKey.presetNumber)
													.map((preset) => ({
														label: `${preset.bankNumber}: ${preset.name}`,
														id: preset.bankNumber.toString(),
													})),
											]}
										/>
									) : PromiseState.isPending(soundFont) ? (
										<span>ロード中...</span>
									) : PromiseState.isRejected(soundFont) ? (
										<span>サウンドフォントの読み込みに失敗しました</span>
									) : null}
								</Field>
							</div>
							<div
								css={[
									FlexLayout.row.stretch,
									{
										flex: "1 1 0",
										overflowX: "scroll",
										maxWidth: "800px",
									},
								]}
							>
								<Field label="プレビュー">
									<Keyboard
										onPointerDown={handleKeyboardPointerDown}
										onPointerUp={handleKeyboardPointerUp}
									/>
								</Field>
							</div>
						</div>
					</Form.Row>
				</Form>
			</Dialog.Body>
			<Dialog.Footer>
				<Button onClick={onClose}>キャンセル</Button>
				<Button variant="primary" onClick={onSubmit}>
					決定
				</Button>
			</Dialog.Footer>
		</Dialog>
	);
}
