import {
	createContext,
	type ReactNode,
	useContext,
	useEffectEvent,
	useLayoutEffect,
	useRef,
} from "react";
import { MdClose } from "react-icons/md";
import { IconButton } from "./IconButton";
import { Styles } from "./Styles.ts";

const context = createContext<{
	onClose: () => void;
}>(null as never);

function DialogHeader({ children }: { children: ReactNode }) {
	const { onClose } = useContext(context);
	return (
		<header
			css={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "flex-start",
				gap: 16,
				padding: "4px 16px",
				height: 36,
				overflow: "clip",
				borderBottom: "1px solid var(--color-border)",
				userSelect: "none",
				color: "var(--color-foreground-weak)",
			}}
		>
			<span css={{ flex: "1 1 0" }}>{children}</span>
			<IconButton title="閉じる" onClick={onClose}>
				<MdClose />
			</IconButton>
		</header>
	);
}

function DialogBody({ children }: { children: ReactNode }) {
	return <div css={{ padding: "16px 24px", flex: "1 1 0" }}>{children}</div>;
}

function DialogFooter({ children }: { children: ReactNode }) {
	return (
		<footer
			css={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "flex-end",
				gap: 16,
				padding: "4px 16px",
				height: 36,
				overflow: "clip",
				borderTop: "1px solid var(--color-border)",
				userSelect: "none",
			}}
		>
			{children}
		</footer>
	);
}

export const Dialog = Object.assign(
	function Dialog({
		open = false,
		modal = false,
		children,
		onClose,
	}: {
		open?: boolean;
		modal?: boolean;
		children?: ReactNode;
		onClose: () => void;
	}) {
		const dialogRef = useRef<HTMLDialogElement>(null);

		const syncOpenState = useEffectEvent((open: boolean) => {
			const dialog = dialogRef.current;
			if (dialog === null) return;

			if (open) {
				if (modal) {
					dialog.showModal();
				} else {
					dialog.show();
				}
			} else {
				dialog.close();
			}
		});
		useLayoutEffect(() => syncOpenState(open), [open]);

		if (!open) return null;

		return (
			<context.Provider value={{ onClose }}>
				<dialog
					ref={dialogRef}
					onKeyDown={(ev) => {
						if (ev.key === "Escape") {
							onClose();
							ev.stopPropagation();
							ev.preventDefault();
						}
					}}
					css={{
						"&::backdrop": {
							backgroundColor: "rgba(0, 0, 0, 0.3)",
						},
						position: "fixed",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
						background: "var(--color-background)",
						color: "var(--color-foreground)",
						outline: "none",
						border: "1px solid var(--color-border)",
						borderRadius: 6,
						minWidth: "min(640px, 80vw)",
						boxShadow: Styles.BOX_SHADOW,
						padding: 0,
						margin: 0,
						display: "flex",
						flexDirection: "column",
						alignItems: "stretch",
						justifyContent: "stretch",
					}}
				>
					{children}
				</dialog>
			</context.Provider>
		);
	},
	{
		Header: DialogHeader,
		Body: DialogBody,
		Footer: DialogFooter,
	},
);
