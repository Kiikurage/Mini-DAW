export namespace RIFF {
	export interface RIFFChunk {
		fourCC: "RIFF";
		format: string;
		size: number;
		chunks: Chunk[];
	}
	export interface ListChunk {
		fourCC: "LIST";
		format: string;
		size: number;
		chunks: Chunk[];
	}
	export interface PayloadChunk {
		fourCC: string;
		size: number;
		payload: DataView<ArrayBuffer>;
	}
	export type Chunk = RIFFChunk | ListChunk | PayloadChunk;

	function parseChunk(view: DataView<ArrayBuffer>): Chunk {
		const fourCC = getAsciiString(view, 0, 4);

		const size = view.getUint32(4, true);

		if (fourCC === "RIFF" || fourCC === "LIST") {
			const format = getAsciiString(view, 8, 4);

			const chunks: Chunk[] = [];
			let offset = 4;
			while (offset < size) {
				const chunk = parseChunk(
					new DataView(view.buffer, view.byteOffset + 8 + offset),
				);
				chunks.push(chunk);
				offset += 8 + chunk.size;
			}
			return { fourCC, format, size, chunks } as RIFFChunk | ListChunk;
		} else {
			const payload = new DataView(view.buffer, view.byteOffset + 8, size);
			return { fourCC, size, payload };
		}
	}

	export function parse(buffer: ArrayBuffer): RIFFChunk {
		return parseChunk(new DataView(buffer)) as RIFFChunk;
	}
}

export function getAsciiString(
	dataView: DataView,
	offset: number,
	length: number,
): string {
	let result = "";
	for (let i = 0; i < length; i++) {
		const code = dataView.getUint8(offset + i);
		if (code === 0) break;
		result += String.fromCharCode(code);
	}
	return result;
}
