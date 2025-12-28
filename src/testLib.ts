export function havingFocus(element: HTMLElement) {
	// オリジナルのexpect(node).toHaveFocus()が内部で使用しているbunのprettyPrintが、
	// nodeをダンプする際に大量のログを出力してしまうため、代替実装を利用する。
	return element.ownerDocument.activeElement === element;
}
