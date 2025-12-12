import { createContext, type ReactNode, useContext } from "react";
import { type ComponentKey, DIContainer } from "./DIContainer.ts";

const context = createContext<DIContainer>(new DIContainer());

export function DIContainerProvider(props: {
	container: DIContainer;
	children?: ReactNode;
}) {
	return (
		<context.Provider value={props.container}>
			{props.children}
		</context.Provider>
	);
}

export function useComponent<T>(key: ComponentKey<T>): T {
	return useContext(context).get(key);
}
