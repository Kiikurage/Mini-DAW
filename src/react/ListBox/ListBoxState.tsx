export class ListBoxState {
	readonly value: string | number | null;
	readonly options: readonly Option[];
	readonly focusedOptionId: string | null;

	constructor(
		props: {
			value: string | number | null;
			options: readonly Option[];
			focusedOptionId: string | null;
		} = {
			value: null,
			options: [],
			focusedOptionId: null,
		},
	) {
		this.value = props.value;
		this.options = props.options;
		this.focusedOptionId = props.focusedOptionId;
	}

	get selectedOption(): Option | null {
		for (const option of this.options) {
			if (option.value === this.value) return option;
		}
		return null;
	}

	get focusedOption(): Option | null {
		for (const option of this.options) {
			if (option.id === this.focusedOptionId) return option;
		}
		return null;
	}

	resolveOptionByElement(element: HTMLElement): Option | null {
		for (const option of this.options) {
			if (option.element.contains(element)) return option;
		}
		return null;
	}

	setSelectedOptionId(optionId: string | null): ListBoxState {
		const option =
			this.options.find((option) => option.id === optionId) ?? null;
		if (option === null) return this;

		return new ListBoxState({ ...this, value: option.value });
	}

	setFocusedOptionId(optionId: string | null): ListBoxState {
		return new ListBoxState({ ...this, focusedOptionId: optionId });
	}

	registerOption(option: Option): ListBoxState {
		return new ListBoxState({
			...this,
			options: [...this.options, option],
		});
	}

	unregisterOption(optionId: string): ListBoxState {
		return new ListBoxState({
			...this,
			options: this.options.filter((option) => option.id !== optionId),
		});
	}

	moveFocusToNext(): ListBoxState {
		const currentIndex = this.options.findIndex(
			(option) => option.id === this.focusedOptionId,
		);
		const nextIndex = (currentIndex + 1) % this.options.length;
		return new ListBoxState({
			...this,
			focusedOptionId: this.options[nextIndex]?.id ?? null,
		});
	}

	moveFocusToPrevious(): ListBoxState {
		const currentIndex = this.options.findIndex(
			(option) => option.id === this.focusedOptionId,
		);
		const nextIndex =
			(currentIndex - 1 + this.options.length) % this.options.length;

		return new ListBoxState({
			...this,
			focusedOptionId: this.options[nextIndex]?.id ?? null,
		});
	}
}

export interface Option {
	id: string;
	value: string | number;
	element: HTMLElement;
}
