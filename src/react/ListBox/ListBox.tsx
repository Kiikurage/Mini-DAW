import {
	type ComponentProps,
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useEffectEvent,
	useId,
	useRef,
	useState,
} from "react";
import type { PropsOf } from "../../lib.ts";
import { useStateful } from "../../Stateful/useStateful.tsx";
import { Field } from "../Field.tsx";
import {
	ListBoxItemStyleBase,
	ListBoxStyleBase,
	UIControlStyleBase,
} from "../Styles.ts";
import { ListBoxController, type ListBoxState } from "./ListBoxController.tsx";

const context = createContext<ListBoxController>(null as never);

export interface ListBoxOption {
	readonly label: string;
	readonly id: string;
}

export function ListBox({
	id,
	options,
	value,
	defaultValue,
	onChange,
}: {
	id?: string;
	options: readonly ListBoxOption[];
	value?: string;
	defaultValue?: string;
	onChange?: (value: string) => void;
}) {
	const [controller] = useState(() => {
		return new ListBoxController({
			selectedId: value ?? defaultValue ?? "",
		});
	});
	useEffect(() => {
		if (value !== undefined) {
			controller.setSelectedOptionId(value);
		}
	}, [value, controller]);

	const onChangeListener = useEffectEvent((state: ListBoxState) =>
		onChange?.(state.selectedId),
	);
	useEffect(() => {
		controller.on("change", onChangeListener);
		return () => {
			controller.off("change", onChangeListener);
		};
	}, [controller]);

	return (
		<ListBox.Provider controller={controller}>
			<ListBox.OptionList id={id}>
				{options.map((option) => (
					<ListBox.Option key={option.id} id={option.id}>
						{option.label}
					</ListBox.Option>
				))}
			</ListBox.OptionList>
		</ListBox.Provider>
	);
}

export namespace ListBox {
	export function useOptionProps(id: string): PropsOf<"li"> {
		const controller = useContext(context);

		const focused = useStateful(controller, (state) => state.focusedId === id);
		const selected = useStateful(
			controller,
			(state) => state.selectedId === id,
		);

		const ref = useRef<HTMLLIElement>(null);

		useEffect(() => {
			const element = ref.current;
			if (element === null) return;

			return controller.registerOption({ id, element });
		}, [id, controller]);

		useEffect(() => {
			const element = ref.current;
			if (element === null) return;

			if (focused) {
				element.scrollIntoView({ block: "nearest" });
				element.focus();
			}
		}, [focused]);

		return {
			id,
			ref,
			role: "option",
			"aria-selected": selected,
			tabIndex: focused ? 0 : -1,
			css: [ListBoxItemStyleBase],
			onFocus: (ev) => {
				controller.setFocusedOptionId(id);
				ev.stopPropagation();
				ev.preventDefault();
			},
			onClick: (ev) => {
				controller.setSelectedOptionId(id);
				ev.stopPropagation();
				ev.preventDefault();
			},
			onKeyDown: (ev) => {
				switch (ev.key) {
					case "Enter":
					case "Space": {
						controller.setSelectedOptionId(id);
						ev.preventDefault();
						ev.stopPropagation();
						break;
					}
				}
			},
		};
	}

	export function useOptionListProps(): PropsOf<"ul"> {
		const controller = useContext(context);
		const focusedOptionId = useStateful(controller, (state) => state.focusedId);
		const isFocusedNothing = focusedOptionId === null;

		return {
			role: "listbox",
			"aria-activedescendant": focusedOptionId ?? undefined,
			tabIndex: isFocusedNothing ? 0 : -1,
			onKeyDown: (ev) => {
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
				}
			},
			onBlur: (ev) => {
				if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) {
					controller.setFocusedOptionId(null);
				}
			},
		};
	}

	export function Option({
		children,
		id,
	}: {
		children?: ReactNode;
		id: string;
	}) {
		const props = useOptionProps(id);

		return (
			<li {...props} css={[ListBoxItemStyleBase]}>
				{children}
			</li>
		);
	}

	export function OptionList({
		children,
		id,
	}: {
		children?: ReactNode;
		id?: string;
	}) {
		const props = useOptionListProps();

		return (
			<ul {...props} id={id} css={[UIControlStyleBase, ListBoxStyleBase]}>
				{children}
			</ul>
		);
	}

	export function Provider({
		children,
		controller,
	}: {
		children?: ReactNode;
		controller: ListBoxController;
	}) {
		return <context.Provider value={controller}>{children}</context.Provider>;
	}
}

export function ListBoxField({
	label,
	listBoxProps,
}: {
	label: ReactNode;
	listBoxProps: ComponentProps<typeof ListBox>;
}) {
	const fieldId = useId();

	return (
		<Field label={label} htmlFor={fieldId}>
			<ListBox {...listBoxProps} id={fieldId} />
		</Field>
	);
}
