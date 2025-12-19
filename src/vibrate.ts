export function vibrate(pattern: VibratePattern): boolean {
	return navigator.vibrate?.(pattern);
}

export function vibrateFeedback() {
	return vibrate(20);
}
