import {
	createContext,
	type KeyboardEventHandler,
	type MouseEventHandler,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useEffectEvent,
	useState,
} from "react";
import { useStateful } from "../../Stateful/useStateful.tsx";
import {
	ListBoxItemStyleBase,
	ListBoxStyleBase,
	UIControlStyleBase,
} from "../Styles.ts";
import { ListBoxController } from "./ListBoxController.tsx";
import { ListBoxState } from "./ListBoxState.tsx";

const context = createContext<ListBoxController>(null as never);

function ListBoxOption({
	children,
	value,
}: {
	children?: ReactNode;
	value: string | number;
}) {
	const controller = useContext(context);
	const state = useStateful(controller);

	const id = value.toString(); // useId()
	const selected = state.selectedOption?.id === id;

	const refCallback = useCallback(
		(element: HTMLLIElement) => {
			if (element === null) return;

			controller.registerOption({ id, value, element });
			return () => controller.unregisterOption(id);
		},
		[controller, id, value],
	);

	return (
		// biome-ignore lint/a11y/useFocusableInteractive: <explanation>
		<li
			id={id}
			ref={refCallback}
			// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: <explanation>
			role="option"
			aria-selected={selected}
			data-focused={state.focusedOptionId === id}
			css={[ListBoxItemStyleBase]}
		>
			{children}
		</li>
	);
}

function ListBoxOptionList({ children }: { children?: ReactNode }) {
	const controller = useContext(context);
	const state = useStateful(controller);

	const handleKeyDown: KeyboardEventHandler = (ev) => {
		switch (ev.key) {
			case "ArrowUp": {
				controller.moveFocusToPrevious();
				ev.preventDefault();
				ev.stopPropagation();
				break;
			}
			case "ArrowDown": {
				controller.moveFocusToNext();
				ev.preventDefault();
				ev.stopPropagation();
				break;
			}
			case "Enter":
			case "Space": {
				if (state.focusedOptionId !== null) {
					controller.setSelectedOptionId(state.focusedOptionId);
					ev.preventDefault();
					ev.stopPropagation();
				}
				break;
			}
		}
	};

	const handleClick: MouseEventHandler<HTMLUListElement> = (ev) => {
		ev.stopPropagation();
		ev.preventDefault();

		const option = controller.state.resolveOptionByElement(
			ev.target as HTMLElement,
		);
		if (option === null) return;

		controller.setSelectedOptionId(option.id);
		controller.setFocusedOptionId(option.id);
	};

	useEffect(() => {
		const option = state.focusedOption;
		if (option === null) return;

		option.element.scrollIntoView({ block: "nearest" });
	}, [state]);

	return (
		// biome-ignore lint/a11y/useAriaActivedescendantWithTabindex: <explanation>
		<ul
			css={[UIControlStyleBase, ListBoxStyleBase]}
			aria-activedescendant={state.focusedOptionId ?? undefined}
			// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: <explanation>
			role="listbox"
			onKeyDown={handleKeyDown}
			onClick={handleClick}
			onBlur={() => controller.setFocusedOptionId(null)}
		>
			{children}
		</ul>
	);
}

function ListBoxProvider({
	children,
	controller,
}: {
	children?: ReactNode;
	controller: ListBoxController;
}) {
	return <context.Provider value={controller}>{children}</context.Provider>;
}

export const ListBox = Object.assign(
	function ListBox({
		children,
		value: controlledValue,
		defaultValue,
		onChange,
	}: {
		children?: ReactNode;
		value?: string | number | null;
		defaultValue?: string | number;
		onChange?: (value: string | number | null) => void;
	}) {
		const [controller] = useState(() => {
			return new ListBoxController(
				new ListBoxState({
					value: controlledValue ?? defaultValue ?? null,
					options: [],
					focusedOptionId: null,
				}),
			);
		});

		const onChangeListener = useEffectEvent((state: ListBoxState) =>
			onChange?.(state.value),
		);
		useEffect(() => {
			controller.on("change", onChangeListener);
			return () => {
				controller.off("change", onChangeListener);
			};
		}, [controller]);

		return (
			<ListBoxProvider controller={controller}>{children}</ListBoxProvider>
		);
	},
	{
		Provider: ListBoxProvider,
		OptionList: ListBoxOptionList,
		Option: ListBoxOption,
	},
);
