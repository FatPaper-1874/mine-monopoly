import * as protobuf from "protobufjs";
import { GameMap } from "./game-map";

export type ProtoFileType = {
	id: string;
	name: string;
	filetype: string;
	buffer: Uint8Array;
};

export function dataToProtoBuffer(
	id: string,
	jsonData: string,
	modelFiles: ProtoFileType[],
	imageFiles: ProtoFileType[]
): Uint8Array {
	const modelFileItems = modelFiles.map((f) => ({
		id: f.id,
		name: f.name,
		filetype: f.filetype,
		content: f.buffer,
	}));

	const imageFileItems = imageFiles.map((f) => ({
		id: f.id,
		name: f.name,
		filetype: f.filetype,
		content: f.buffer,
	}));

	const message = GameMap.create({
		id,
		jsonData,
		modelFiles: modelFileItems,
		imageFiles: imageFileItems,
	});

	const buffer = GameMap.encode(message).finish();
	return buffer;
}

export async function loadFromProto(
	buffer: Uint8Array
): Promise<{ id: string; jsonData: string; modelFiles: ProtoFileType[]; imageFiles: ProtoFileType[] }> {
	const decoded = GameMap.decode(new Uint8Array(buffer));

	const modelFiles: ProtoFileType[] = (decoded.modelFiles || []).map((f: any) => ({
		id: f.id,
		name: f.name,
		filetype: f.filetype,
		buffer: f.content,
	}));

	const imageFiles: ProtoFileType[] = (decoded.imageFiles || []).map((f: any) => ({
		id: f.id,
		name: f.name,
		filetype: f.filetype,
		buffer: f.content,
	}));

	return {
		id: decoded.id,
		jsonData: decoded.jsonData,
		modelFiles,
		imageFiles,
	};
}
