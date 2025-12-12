import { type ComponentType, createContext, type Dispatch, type ReactNode, type SetStateAction, useContext, useEffect, useState, } from "react";

export function createSlot(): {
    Slot: ComponentType<{ children?: ReactNode }>;
    Injector: ComponentType<{ children?: ReactNode }>;
    Provider: ComponentType<{ children?: ReactNode }>;
} {
	const context = createContext<{
		setContent: Dispatch<SetStateAction<ReactNode>>;
		content: ReactNode;
	}>({
		setContent: () => {},
		content: null,
	});
	context.displayName = "SlotContext";

	function Slot({ children }: { children?: ReactNode }) {
		const { content } = useContext(context);
		return <>{content ?? children}</>;
	}
	Slot.displayName = "Slot";

	function Provider({ children }: { children?: ReactNode }) {
		const [content, setContent] = useState<ReactNode>(null);
		return (
			<context.Provider value={{ setContent, content }}>
				{children}
			</context.Provider>
		);
	}
	Provider.displayName = "Provider";

	function Injector({ children }: { children?: ReactNode }) {
		const { setContent } = useContext(context);

		useEffect(() => {
			setContent(children);
			return () => {
				setContent(null);
			};
		}, [setContent, children]);

		return null;
	}
	Injector.displayName = "Injector";

	return { Slot, Injector, Provider };
}