import multer, { Multer } from "multer";
import path from "path";

interface MulterFieldConfig {
	dest: string;
	allowedExtensions: string[];
	maxSize?: number;
}

export function createMulter(config: MulterFieldConfig): Multer {
	return multer({
		dest: config.dest,
		limits: config.maxSize ? { fileSize: config.maxSize } : undefined,
		fileFilter: config.allowedExtensions.length > 0
			? (_req, file, cb) => {
				const ext = path.extname(file.originalname).toLowerCase();
				if (config.allowedExtensions.includes(ext)) {
					cb(null, true);
				} else {
					cb(new Error(`文件后缀名不合法，允许: ${config.allowedExtensions.join(", ")}`));
				}
			}
			: undefined,
	});
}

export const avatarMulter = createMulter({
	dest: "public/temp/avatars",
	allowedExtensions: [".png", ".jpg", ".jpeg"],
	maxSize: 2 * 1024 * 1024,
});

export const gameMapMulter = createMulter({
	dest: "public/gameMap",
	allowedExtensions: [".png", ".jpg", ".jpeg", ".fpmap"],
});
