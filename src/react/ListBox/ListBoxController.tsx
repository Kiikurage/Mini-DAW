import { Stateful } from "../../Stateful/Stateful.ts";
import { ListBoxState, type Option } from "./ListBoxState.tsx";

export class ListBoxController extends Stateful<
	ListBoxState,
	{
		change: [state: ListBoxState];
	}
> {
	constructor(initialState: ListBoxState = new ListBoxState()) {
		super(initialState);
	}

	setSelectedOptionId(optionId: string | null) {
		this.updateState((state) => state.setSelectedOptionId(optionId));
		this.emit("change", this.state);
	}

	setFocusedOptionId(optionId: string | null) {
		this.updateState((state) => state.setFocusedOptionId(optionId));
	}

	registerOption(option: Option) {
		this.updateState((state) => state.registerOption(option));
	}

	unregisterOption(optionId: string) {
		this.updateState((state) => state.unregisterOption(optionId));
	}

	moveFocusToNext() {
		this.updateState((state) => state.moveFocusToNext());
	}

	moveFocusToPrevious() {
		this.updateState((state) => state.moveFocusToPrevious());
	}

	focusOnSelectedOption() {
		const selectedOption = this.state.selectedOption;
		if (selectedOption === null) return;

		this.setFocusedOptionId(selectedOption.id);
	}
}
