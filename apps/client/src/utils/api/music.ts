import axios from "axios";
import { __MONOPOLYSERVER__ } from "@src/../global.config";
import { Music } from "@src/interfaces/bace";

const musicList: Music[] = [
	{
		id: crypto.randomUUID(),
		name: "BGM1-Suno (AI)",
		url: "music/BGM1-Suno (AI).mp3",
	},
];

export const getMusicList = async () => {
	return { musicList };
};
