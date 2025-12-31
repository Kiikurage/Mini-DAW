import {
	createContext,
	type ReactNode,
	useContext,
	useEffectEvent,
	useLayoutEffect,
	useRef,
} from "react";
import { MdClose } from "react-icons/md";
import { css, cx } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { IconButton } from "./IconButton.tsx";
import { BoxShadowStyleBase } from "./Styles.ts";

const context = createContext<{
	onClose: () => void;
}>(null as never);

function DialogHeader({ children }: { children: ReactNode }) {
	const { onClose } = useContext(context);
	return (
		<header
			className={cx(
				flex({ direction: "row", align: "center", justify: "start", gap: 16 }),
				css({
					padding: "8px 16px",
					overflow: "clip",
					borderBottom: "1px solid var(--color-border)",
					userSelect: "none",
					color: "var(--color-foreground-weak)",
					flex: "0 0 auto",
				}),
			)}
		>
			<span className={css({ flex: "1 1 0" })}>{children}</span>
			<IconButton title="閉じる" onClick={onClose} variant="normalInline">
				<MdClose />
			</IconButton>
		</header>
	);
}

function DialogBody({ children }: { children?: ReactNode }) {
	return (
		<div
			className={css({
				position: "relative",
				padding: "16px 24px",
				flex: "1 1 auto",
				minHeight: 0,
				display: "flex",
				flexDirection: "column",
				alignItems: "stretch",
				justifyContent: "stretch",
			})}
		>
			{children}
		</div>
	);
}

function DialogFooter({ children }: { children: ReactNode }) {
	return (
		<footer
			className={cx(
				flex({ direction: "row", align: "center", justify: "end", gap: 16 }),
				css({
					padding: "8px 16px",
					overflow: "clip",
					borderTop: "1px solid var(--color-border)",
					userSelect: "none",
					flex: "0 0 auto",
				}),
			)}
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
					className={cx(
						BoxShadowStyleBase,
						flex({
							direction: "column",
							align: "stretch",
							justify: "stretch",
						}),
						css({
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
							minHeight: "360px",
							maxHeight: "80vh",
							minWidth: "min(640px, 80vw)",
							padding: 0,
							margin: 0,
						}),
					)}
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
