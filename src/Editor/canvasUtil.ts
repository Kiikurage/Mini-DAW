export function addRectPath({
	ctx,
	x0,
	y0,
	x1,
	y1,
}: {
	ctx: CanvasRenderingContext2D;
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}) {
	ctx.moveTo(x0 - 0.5, y0 - 0.5);
	ctx.lineTo(x1 + 0.5, y0 - 0.5);
	ctx.lineTo(x1 + 0.5, y1 + 0.5);
	ctx.lineTo(x0 - 0.5, y1 + 0.5);
	ctx.closePath();
}

export function addLinePath({
	ctx,
	x0,
	y0,
	x1,
	y1,
}: {
	ctx: CanvasRenderingContext2D;
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}) {
	ctx.moveTo(x0 - 0.5, y0 - 0.5);
	ctx.lineTo(x1 + 0.5, y1 + 0.5);
}
