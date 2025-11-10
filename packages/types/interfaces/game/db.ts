export interface GameMapInDb {
	id: string;
	name: string;
	author: string;
	version: string;
	hash: string;
	coverUrl: string;
	mapUrl: string;
	inuse: boolean;
}
