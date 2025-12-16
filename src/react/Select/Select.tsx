import {
	type FocusEventHandler,
	type KeyboardEventHandler,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { MdArrowDropDown } from "react-icons/md";
import { useStateful } from "../../Stateful/useStateful.tsx";
import { ListBox } from "../ListBox/ListBox.tsx";
import { ListBoxController } from "../ListBox/ListBoxController.tsx";
import { ListBoxState } from "../ListBox/ListBoxState.tsx";
import { PopUp, PopUpController } from "../Popup/PopUp.tsx";

export const Select = Object.assign(
	function Select({
		value,
		defaultValue,
		onChange,
		children,
		renderValue,
	}: {
		value?: string | number;
		defaultValue?: string | number;
		onChange?: (value: string | number | null) => void;
		children?: ReactNode;
		renderValue?: (value: string | number | null) => ReactNode;
	}) {
		renderValue ??= (value) => <>{value}</>;

		const [listBoxController] = useState(() => {
			const listBoxController = new ListBoxController(
				new ListBoxState({
					value: value ?? defaultValue ?? null,
					options: [],
					focusedOptionId: null,
				}),
			);
			listBoxController.on("change", () => {
				closePopup();
			});
			return listBoxController;
		});
		const [popupController] = useState(() => {
			return new PopUpController();
		});

		const listBoxState = useStateful(listBoxController);

		useEffect(() => {
			const handler = (state: ListBoxState) => {
				onChange?.(state.value);
			};
			listBoxController.on("change", handler);
			return () => {
				listBoxController.off("change", handler);
			};
		}, [listBoxController, onChange]);

		const comboBoxRef = useRef<HTMLDivElement>(null);

		const openPopup = () => {
			const combobox = comboBoxRef.current;
			if (combobox === null) return;

			popupController.openAround(combobox);
			listBoxController.focusOnSelectedOption();
		};

		const closePopup = () => {
			popupController.close();
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
							listBoxController.state.focusedOptionId,
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
				role="combobox"
				aria-expanded={popupController.state.open}
				ref={comboBoxRef}
				css={{
					border: "1px solid var(--color-gray-600)",
					background: "var(--color-background)",
					borderRadius: 4,
					minWidth: 120,
					outlineOffset: -2,
					display: "flex",
					flexDirection: "row",
					alignItems: "stretch",
					justifyContent: "stretch",
					height: 26,
					boxSizing: "border-box",

					"&:focus": {
						outline: "2px solid var(--color-primary-500)",
					},
				}}
				tabIndex={0}
				onClick={() => openPopup()}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
			>
				<div
					css={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "flex-start",
						flex: "1 1 0",
						padding: "2px 12px",
					}}
				>
					{renderValue(listBoxState.value)}
				</div>
				<div
					css={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						flex: "0 0 auto",
						padding: "0 4px",
					}}
				>
					<MdArrowDropDown size="24" />
				</div>
				<PopUp controller={popupController}>
					<ListBox.Provider controller={listBoxController}>
						<ListBox.OptionList>{children}</ListBox.OptionList>
					</ListBox.Provider>
				</PopUp>
			</div>
		);
	},
	{
		Option: ListBox.Option,
	},
);
