import { PromiseState } from "../PromiseState.ts";
import { Stateful } from "../Stateful/Stateful.ts";
import { type GoogleAPIClient, GoogleDrive } from "./GoogleAPIClient.ts";

export namespace FS {
	export interface File {
		id: string;
		name: string;
	}

	export class Folder
		extends Stateful<{
			children: PromiseState<File[]>;
		}>
		implements File
	{
		private loadChildrenPromise: Promise<void> | null = null;

		constructor(
			public readonly id: string,
			public readonly name: string,
			private readonly client: GoogleAPIClient,
		) {
			super({
				get children() {
					void loadChildren();
					return PromiseState.pending();
				},
			});

			const loadChildren = () => this.loadChildren();
		}

		private async loadChildren() {
			if (this.loadChildrenPromise !== null) return;

			this.loadChildrenPromise = this.client
				.listFilesByFolder(this.id)
				.then((googleFiles) => {
					const children = googleFiles
						.map((child) => {
							if (child.mimeType === GoogleDrive.MimeType.FOLDER) {
								return new Folder(child.id, child.name, this.client);
							} else {
								return { id: child.id, name: child.name } as File;
							}
						})
						.sort((f1, f2) => {
							const isFolder1 = f1 instanceof Folder ? 0 : 1;
							const isFolder2 = f2 instanceof Folder ? 0 : 1;
							if (isFolder1 !== isFolder2) {
								return isFolder1 - isFolder2;
							}
							return f1.name.localeCompare(f2.name);
						});
					this.setState({ children });
				})
				.catch((error) => {
					this.setState({ children: PromiseState.rejected(error) });
				});
		}
	}
}
