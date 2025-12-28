import {
	type ComponentProps,
	type FocusEventHandler,
	type KeyboardEventHandler,
	type ReactNode,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { MdArrowDropDown } from "react-icons/md";
import { useStateful } from "../../Stateful/useStateful.tsx";
import { Field } from "../Field.tsx";
import { ListBox, type ListBoxOption } from "../ListBox/ListBox.tsx";
import {
	ListBoxController,
	type ListBoxState,
} from "../ListBox/ListBoxController.tsx";
import { PopUp, PopUpController } from "../Popup/PopUp.tsx";
import { FlexLayout } from "../Styles.ts";

type OptionRenderer<T> = (option: T) => ReactNode;

function DefaultOptionRenderer(option: ListBoxOption) {
	return option.label;
}

export function Select<T extends ListBoxOption>({
	id,
	options,
	value,
	defaultValue,
	onChange,
	renderOption = DefaultOptionRenderer,
}: {
	id?: string;
	options: readonly T[];
	value?: string;
	defaultValue?: string;
	onChange?: (option: T) => void;
	renderOption?: OptionRenderer<T>;
}) {
	const [popupController] = useState(() => {
		return new PopUpController();
	});

	const closePopup = () => {
		popupController.close();
	};

	const [listBoxController] = useState(() => {
		const listBoxController = new ListBoxController({
			selectedId: value ?? defaultValue ?? "",
		});
		listBoxController.on("change", () => {
			closePopup();
		});
		return listBoxController;
	});
	useEffect(() => {
		if (value !== undefined) {
			listBoxController.setSelectedOptionId(value);
		}
	}, [value, listBoxController]);

	const selectedId = useStateful(
		listBoxController,
		(state) => state.selectedId,
	);
	const selectedOption = options.find((option) => option.id === selectedId);

	useEffect(() => {
		const handler = (state: ListBoxState) => {
			const option = options.find((opt) => opt.id === state.selectedId);
			if (option === undefined) return;

			onChange?.(option);
		};
		listBoxController.on("change", handler);
		return () => {
			listBoxController.off("change", handler);
		};
	}, [listBoxController, onChange, options.find]);

	const comboBoxRef = useRef<HTMLDivElement>(null);

	const openPopup = () => {
		const combobox = comboBoxRef.current;
		if (combobox === null) return;

		popupController.openAround(combobox);
		listBoxController.focusOnSelectedOption();
	};

	const handleBlur: FocusEventHandler = (ev) => {
		if (popupController.contains(ev.relatedTarget)) return;

		closePopup();
	};

	const handleKeyDown: KeyboardEventHandler = (ev) => {
		switch (ev.key) {
			case "ArrowUp": {
				if (popupController.state.open) {
					listBoxController.moveFocusToPrevious();
					ev.preventDefault();
					ev.stopPropagation();
				} else {
					openPopup();
					ev.preventDefault();
					ev.stopPropagation();
				}
				break;
			}
			case "ArrowDown": {
				if (popupController.state.open) {
					listBoxController.moveFocusToNext();
					ev.preventDefault();
					ev.stopPropagation();
				} else {
					openPopup();
					ev.preventDefault();
					ev.stopPropagation();
				}
				break;
			}
			case "Enter":
			case "Space": {
				if (popupController.state.open) {
					listBoxController.setSelectedOptionId(
						listBoxController.state.focusedId,
					);
					ev.preventDefault();
					ev.stopPropagation();
				} else {
					openPopup();
					ev.preventDefault();
					ev.stopPropagation();
				}
				break;
			}
			case "Escape": {
				closePopup();
				ev.preventDefault();
				ev.stopPropagation();
				break;
			}
		}
	};

	return (
		<div
			id={id}
			role="combobox"
			aria-expanded={popupController.state.open}
			ref={comboBoxRef}
			css={[
				FlexLayout.row.stretch.stretch,
				{
					border: "1px solid var(--color-gray-600)",
					background: "var(--color-background)",
					borderRadius: 4,
					minWidth: 120,
					outlineOffset: -2,
					height: 26,
					boxSizing: "border-box",

					"&:focus": {
						outline: "2px solid var(--color-primary-500)",
					},
				},
			]}
			tabIndex={0}
			onClick={() => openPopup()}
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
		>
			<div
				css={[
					FlexLayout.row.center.start,
					{
						flex: "1 1 0",
						padding: "2px 12px",
						lineHeight: 1,
					},
				]}
			>
				{selectedOption?.label ?? ""}
			</div>
			<div
				css={[
					FlexLayout.row.center.center,
					{
						flex: "0 0 auto",
						padding: "0 4px",
					},
				]}
			>
				<MdArrowDropDown size="24" />
			</div>
			<PopUp controller={popupController}>
				<ListBox.Provider controller={listBoxController}>
					<ListBox.OptionList>
						{options.map((option) => (
							<ListBox.Option key={option.id} id={option.id}>
								{renderOption(option)}
							</ListBox.Option>
						))}
					</ListBox.OptionList>
				</ListBox.Provider>
			</PopUp>
		</div>
	);
}

export function SelectField<T extends ListBoxOption>({
	label,
	selectProps,
}: {
	label: string;
	selectProps: ComponentProps<typeof Select<T>>;
}) {
	const fieldId = useId();
	return (
		<Field label={label} htmlFor={fieldId}>
			<Select {...selectProps} id={fieldId} />
		</Field>
	);
}
