import { assertNotNullish, isNullish } from "../../lib.ts";
import { Stateful } from "../../Stateful/Stateful.ts";

export interface TreeViewState {
	selectedItemId: string | null;
	focusedItemId: string | null;
	expandedItemIds: ReadonlySet<string>;
	items: readonly {
		id: string;
		element: HTMLElement;
		parentId: string | null;
		isParent: boolean;
	}[];
}

export class TreeViewController extends Stateful<TreeViewState> {
	constructor() {
		super({
			selectedItemId: null,
			focusedItemId: null,
			expandedItemIds: new Set(),
			items: [],
		});
	}

	onSelect?: (itemId: string) => void;

	toggleExpand(folderId: string) {
		this.updateState((state) => {
			const expandedItemIds = new Set(state.expandedItemIds);
			if (expandedItemIds.has(folderId)) {
				expandedItemIds.delete(folderId);
			} else {
				expandedItemIds.add(folderId);
			}
			return { ...state, expandedItemIds };
		});
	}

	registerItem(item: {
		id: string;
		element: HTMLElement;
		parentId: string | null;
		isParent: boolean;
	}) {
		this.updateState((state) => {
			let min = 0;
			let max = state.items.length;
			while (min < max) {
				const mid = (min + max) >> 1;
				const midItem = state.items[mid];
				assertNotNullish(midItem);
				if (
					midItem.element.compareDocumentPosition(item.element) &
					Node.DOCUMENT_POSITION_PRECEDING
				) {
					max = mid;
				} else {
					min = mid + 1;
				}
			}
			const items = [...state.items];
			items.splice(min, 0, item);
			return { ...state, items };
		});

		return () => this.unregisterItem(item.id);
	}

	unregisterItem(id: string) {
		this.updateState((state) => {
			if (state.focusedItemId === id) {
				const focusedIndex = state.items.findIndex(
					(item) => item.id === state.focusedItemId,
				);
				const newFocusedIndex = Math.max(0, focusedIndex - 1);
				const focusedItemId = state.items[newFocusedIndex]?.id ?? null;
				state = { ...state, focusedItemId };
			}

			const items = state.items.filter((item) => item.id !== id);
			if (items.length === state.items.length) return state;

			state = { ...state, items };

			if (state.expandedItemIds.has(id)) {
				const expandedItemIds = new Set(state.expandedItemIds);
				expandedItemIds.delete(id);
				state = { ...state, expandedItemIds };
			}

			return state;
		});
	}

	focusNextItem() {
		this.updateState((state) => {
			if (state.focusedItemId === null) {
				const firstItemId = state.items[0]?.id ?? null;
				return { ...state, focusedItemId: firstItemId };
			}

			const currentIndex = state.items.findIndex(
				(item) => item.id === state.focusedItemId,
			);
			if (currentIndex === -1) return state;

			const nextIndex =
				currentIndex === state.items.length - 1 ? 0 : currentIndex + 1;
			const nextItemId = state.items[nextIndex]?.id ?? null;

			return { ...state, focusedItemId: nextItemId };
		});
	}

	focusPrevItem() {
		this.updateState((state) => {
			if (state.focusedItemId === null) {
				const firstItemId = state.items[0]?.id ?? null;
				return { ...state, focusedItemId: firstItemId };
			}

			const currentIndex = state.items.findIndex(
				(item) => item.id === state.focusedItemId,
			);
			if (currentIndex === -1) return state;

			const nextIndex =
				currentIndex === 0 ? state.items.length - 1 : currentIndex - 1;
			const nextItemId = state.items[nextIndex]?.id ?? null;
			return { ...state, focusedItemId: nextItemId };
		});
	}

	expandFocusedItem() {
		this.updateState((state) => {
			const focusedItemId = state.focusedItemId;
			if (isNullish(focusedItemId)) return state;

			const focusedItemIndex = state.items.findIndex(
				(item) => item.id === focusedItemId,
			);
			if (focusedItemIndex === -1) return state;

			const focusedItem = this.state.items[focusedItemIndex];
			if (focusedItem === undefined) return state;
			if (!focusedItem.isParent) return state;

			if (state.expandedItemIds.has(focusedItem.id)) return state;
			const expandedItemIds = new Set(state.expandedItemIds);
			expandedItemIds.add(focusedItem.id);
			return { ...state, expandedItemIds };
		});
	}

	collapseFocusedItem() {
		this.updateState((state) => {
			const focusedItemId = state.focusedItemId;
			if (isNullish(focusedItemId)) return state;

			const focusedItemIndex = state.items.findIndex(
				(item) => item.id === focusedItemId,
			);
			if (focusedItemIndex === -1) return state;

			const focusedItem = this.state.items[focusedItemIndex];
			if (focusedItem === undefined) return state;

			if (focusedItem.isParent && state.expandedItemIds.has(focusedItem.id)) {
				const expandedItemIds = new Set(state.expandedItemIds);
				expandedItemIds.delete(focusedItem.id);
				return { ...state, expandedItemIds };
			} else {
				return {
					...state,
					focusedItemId: focusedItem.parentId ?? state.items[0]?.id ?? null,
				};
			}
		});
	}

	setFocusedItem(id: string) {
		this.updateState((state) => {
			if (this.state.focusedItemId === id) return state;

			return { ...state, focusedItemId: id };
		});
	}

	setSelectedItem(id: string) {
		this.updateState((state) => {
			if (this.state.selectedItemId === id) return state;

			return { ...state, selectedItemId: id };
		});
		this.onSelect?.(id);
	}

	selectFocusedItem() {
		if (this.state.focusedItemId === null) return;
		this.setSelectedItem(this.state.focusedItemId);
	}
}
