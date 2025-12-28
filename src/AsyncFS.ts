import { PromiseState } from "./PromiseState.ts";
import { Stateful } from "./Stateful/Stateful.ts";

export namespace AsyncFS {
	export interface Delegate {
		listFilesByFolder(folderId: string): Promise<
			readonly {
				readonly id: string;
				readonly name: string;
				readonly isFolder: boolean;
			}[]
		>;
	}

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
			private readonly client: Delegate,
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
				.then((files) => {
					const children = files
						.map((file) => {
							if (file.isFolder) {
								return new Folder(file.id, file.name, this.client);
							} else {
								return file;
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
