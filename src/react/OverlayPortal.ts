import { type ComponentType, createElement } from "react";
import { createPortal } from "react-dom";
import { ComponentKey } from "../Dependency/DIContainer.ts";
import { Stateful } from "../Stateful/Stateful.ts";
import { useStateful } from "../Stateful/useStateful.tsx";

export class OverlayPortal extends Stateful<
	readonly {
		id: number;
		component: ComponentType<{ key: number }>;
	}[]
> {
	static readonly Key = ComponentKey.of(OverlayPortal);

	readonly Portal: ComponentType = () =>
		createPortal(
			useStateful(this).map((overlay) =>
				createElement(overlay.component, { key: overlay.id }),
			),
			document.body,
		);

	constructor() {
		super([]);
	}

	show(component: ComponentType<{ key: number }>) {
		const id = Math.random();

		this.updateState((state) => [...state, { id, component }]);

		return () => {
			this.updateState((state) => state.filter((o) => o.id !== id));
		};
	}
}
