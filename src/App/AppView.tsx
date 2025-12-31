import { useEffect } from "react";
import { css, cx } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { Editor } from "../Editor/Editor.ts";
import { EditorView } from "../Editor/EditorView.tsx";
import { GlobalMenuBar } from "../GlobalMenuBar.tsx";
import { KeyboardHandler } from "../KeyboardHandler.tsx";
import { addListener } from "../lib.ts";
import { OverlayPortal } from "../react/OverlayPortal.ts";
import { useStateful } from "../Stateful/useStateful.tsx";
import {
	type InitializeApp,
	InitializeAppKey,
} from "../usecases/initializeApp.ts";
import { WelcomeView } from "../WelcomeView.tsx";

export function AppView({
	keyboard,
	overlayPortal,
	initializeApp,
	editor,
}: {
	keyboard?: KeyboardHandler;
	overlayPortal?: OverlayPortal;
	initializeApp?: InitializeApp;
	editor?: Editor;
}) {
	keyboard = useComponent(KeyboardHandler.Key, keyboard);
	overlayPortal = useComponent(OverlayPortal.Key, overlayPortal);
	initializeApp = useComponent(InitializeAppKey, initializeApp);
	editor = useComponent(Editor.Key, editor);

	const showWelcomPage = useStateful(editor, (state) => state.showWelcomeView);

	useEffect(() => {
		initializeApp();
	}, [initializeApp]);

	useEffect(() => {
		const handleKeyDownCapture = (ev: KeyboardEvent) => {
			const handled = keyboard.handleKeyDownCapture(ev);
			if (handled) {
				ev.preventDefault();
				ev.stopPropagation();
			}
		};
		const handleKeyDown = (ev: KeyboardEvent) => {
			const handled = keyboard.handleKeyDown(ev);
			if (handled) {
				ev.preventDefault();
				ev.stopPropagation();
			}
		};

		const cleanUps = [
			addListener(window, "keydown", handleKeyDownCapture, { capture: true }),
			addListener(window, "keydown", handleKeyDown, { capture: false }),
		];
		return () => {
			for (const cleanUp of cleanUps) {
				cleanUp();
			}
		};
	}, [keyboard]);

	return (
		<div
			className={cx(
				flex({
					flexDirection: "column",
					alignItems: "stretch",
					justifyContent: "stretch",
				}),
				css({
					position: "fixed",
					inset: 0,
				}),
			)}
		>
			<div
				className={css({
					gridArea: "GlobalMenuBar",
					position: "relative",
					flex: 0,
				})}
			>
				<GlobalMenuBar />
			</div>

			<div
				className={css({
					flex: 1,
					background: "var(--color-background-weak)",
					position: "relative",
				})}
			>
				{showWelcomPage ? <WelcomeView /> : <EditorView />}
			</div>

			<overlayPortal.Portal />
		</div>
	);
}
