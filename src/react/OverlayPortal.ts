import { type ComponentType, createElement } from "react";
import { createPortal } from "react-dom";
import { ComponentKey } from "../Dependency/DIContainer.ts";
import { Stateful } from "../Stateful/Stateful.ts";
import { useStateful } from "../Stateful/useStateful.tsx";

type OverlayComponentType = ComponentType<{ close: () => void }>;

export class OverlayPortal extends Stateful<
	readonly {
		id: number;
		component: OverlayComponentType;
		close: () => void;
	}[]
> {
	static readonly Key = ComponentKey.of(OverlayPortal);

	readonly Portal: ComponentType = () =>
		createPortal(
			useStateful(this).map((overlay) =>
				createElement(overlay.component, {
					key: overlay.id,
					close: overlay.close,
				}),
			),
			document.body,
		);

	constructor() {
		super([]);
	}

	show(component: OverlayComponentType) {
		const id = Math.random();
		const close = () => {
			this.updateState((state) => state.filter((o) => o.id !== id));
		};

		this.updateState((state) => [...state, { id, component, close }]);

		return close;
	}
}
