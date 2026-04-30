import fs from "fs/promises";
import path from "path";

export interface ValidatedFile {
	fileName: string;
	filePath: string;
}

export async function validateAndRename(
	newName: string,
	file: Express.Multer.File,
	allowedExtensions: string[],
): Promise<ValidatedFile> {
	const ext = path.extname(file.originalname).toLowerCase();

	if (!ext || !allowedExtensions.includes(ext)) {
		try {
			await fs.unlink(file.path);
		} catch {
			// temp file may not exist
		}
		throw new Error(`文件后缀名不合法，允许: ${allowedExtensions.join(", ")}`);
	}

	const fileName = newName + ext;
	const filePath = file.path + ext;

	await fs.rename(file.path, filePath);
	return { fileName, filePath };
}
