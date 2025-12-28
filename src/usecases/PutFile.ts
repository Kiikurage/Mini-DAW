import { ComponentKey } from "../Dependency/DIContainer.ts";
import type { Editor } from "../Editor/Editor.ts";
import type { EventBus } from "../EventBus.ts";
import type { MDFile } from "../models/MDFile.ts";

export const PutFileKey = ComponentKey<PutFile>("PutFile");

/**
 * ファイルをアプリケーションにロードする
 */
export function PutFile({ bus, editor }: { bus: EventBus; editor: Editor }) {
	return async (file: MDFile) => {
		bus.emitPhasedEvents("file.put", file);
		editor.hideWelcomeView();
	};
}

export type PutFile = ReturnType<typeof PutFile>;
