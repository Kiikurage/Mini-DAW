import { Stateful } from "../../Stateful/Stateful.ts";

interface Option {
	id: string;
	element: HTMLElement;
}

export interface ListBoxState {
	readonly selectedId: string;
	readonly focusedId: string | null;
	readonly options: readonly Option[];
}

export class ListBoxController extends Stateful<
	ListBoxState,
	{
		change: [state: ListBoxState];
	}
> {
	constructor(initialState?: Partial<ListBoxState>) {
		super({
			selectedId: "",
			focusedId: null,
			options: [],
			...initialState,
		});
	}

	setSelectedOptionId(optionId: string | null) {
		this.updateState((state) => {
			const option =
				state.options.find((option) => option.id === optionId) ?? null;
			if (option === null) return state;

			return { ...state, selectedId: option.id };
		});
		this.emit("change", this.state);
	}

	setFocusedOptionId(optionId: string | null) {
		this.updateState((state) => {
			if (state.focusedId === optionId) return state;
			return { ...state, focusedId: optionId };
		});
	}

	registerOption(option: Option) {
		this.updateState((state) => ({
			...state,
			options: [...state.options, option],
		}));
		return () => this.unregisterOption(option.id);
	}

	unregisterOption(optionId: string) {
		this.updateState((state) => ({
			...state,
			options: state.options.filter((option) => option.id !== optionId),
		}));
	}

	moveFocusToNext() {
		this.updateState((state) => {
			const currentIndex = state.options.findIndex(
				(option) => option.id === state.focusedId,
			);
			const nextIndex = (currentIndex + 1) % state.options.length;
			return {
				...state,
				focusedId: state.options[nextIndex]?.id ?? null,
			};
		});
	}

	moveFocusToPrevious() {
		this.updateState((state) => {
			const currentIndex = state.options.findIndex(
				(option) => option.id === state.focusedId,
			);
			const nextIndex =
				(currentIndex - 1 + state.options.length) % state.options.length;

			return {
				...state,
				focusedId: state.options[nextIndex]?.id ?? null,
			};
		});
	}

	focusOnSelectedOption() {
		this.setFocusedOptionId(this.state.selectedId);
	}
}
