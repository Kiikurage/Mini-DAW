import { Stateful } from "../Stateful/Stateful.ts";
import { ComponentKey } from "../Dependency/DIContainer.ts";

export class StatusBar extends Stateful<{ message: string | null }> {
	static readonly Key = ComponentKey.of(StatusBar);
	
	private timerIdToClearStatusMessage: ReturnType<typeof setTimeout> | null =
		null;

	constructor() {
		super({ message: null });
	}

	showMessage(message: string, durationInMS: number = 4000) {
		if (this.timerIdToClearStatusMessage !== null) {
			clearTimeout(this.timerIdToClearStatusMessage);
			this.timerIdToClearStatusMessage = null;
		}

		this.updateState((state) => ({ ...state, message }));
		if (durationInMS > 0) {
			this.timerIdToClearStatusMessage = setTimeout(() => {
				this.clearMessage();
			}, durationInMS);
		}
	}

	clearMessage() {
		if (this.timerIdToClearStatusMessage !== null) {
			clearTimeout(this.timerIdToClearStatusMessage);
			this.timerIdToClearStatusMessage = null;
		}
		this.updateState((state) => ({ ...state, message: null }));
	}
}
