import SOUNDFONT_URL from "../soundfont/GeneralUser-GS/GeneralUser-GS.sf2?url";

export interface PreInstalledSouindFont {
	readonly name: string;
	readonly soundFontUrl: string;
	readonly creatorUrl: string;
	readonly licenseUrl: string;
}

export const PreInstalledSouindFonts: readonly PreInstalledSouindFont[] = [
	{
		name: "GeneralUser GS",
		soundFontUrl: SOUNDFONT_URL,
		creatorUrl: "https://schristiancollins.com/generaluser.php",
		licenseUrl:
			"https://github.com/mrbumpy409/GeneralUser-GS/blob/main/documentation/LICENSE.txt",
	},
];
