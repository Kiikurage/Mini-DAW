import { type MouseEventHandler, useRef } from "react";
import { assertNotNullish } from "../lib.ts";

export function EditableLabel({
	edit,
	value,
	onStartEdit,
	onSubmit,
}: {
	edit: boolean;
	value: string;
	onStartEdit: MouseEventHandler;
	onSubmit: (newValue: string) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const submit = () => {
		const input = inputRef.current;
		assertNotNullish(input);

		onSubmit(input.value);
	};

	return (
		<form
			css={{
				margin: 0,
				maxWidth: "100%",
			}}
			onSubmit={(ev) => {
				ev.nativeEvent.stopImmediatePropagation();
				ev.preventDefault();

				submit();
			}}
			onBlur={submit}
			onDoubleClick={(ev) => {
				if (!edit) onStartEdit(ev);
			}}
		>
			{edit ? (
				<input
					type="text"
					autoComplete="off"
					defaultValue={value}
					ref={(element) => {
						inputRef.current = element;
						element?.focus();
					}}
					css={{
						fontSize: "inherit",
						border: "none",
						background: "none",
						color: "inherit",
						width: "9999px",
						maxWidth: "100%",
						padding: 0,
						lineHeight: "inherit",
					}}
				/>
			) : (
				<span
					css={{
						display: "inline-block",
						fontSize: "inherit",
						color: "inherit",
						whiteSpace: "nowrap",
						maxWidth: "100%",
						overflow: "clip",
						textOverflow: "ellipsis",
					}}
				>
					{value}
				</span>
			)}
		</form>
	);
}
