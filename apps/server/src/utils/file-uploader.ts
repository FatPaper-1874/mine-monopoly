import COS from "cos-nodejs-sdk-v5";
import { env } from "@mine-monopoly/env";
import fs from "fs";
import path from "path";

type UploadFile = {
	filePath: string;
	name: string;
	targetPath: string;
};

const tcBucketName = env("TC_BUCKET_NAME", "");
const tcRegion = env("TC_REGION", "");
const tcId = env("TC_ID", "");
const tcKey = env("TC_KEY", "");

const isUsingCOS = !!(tcBucketName && tcRegion && tcId && tcKey);

const cos = isUsingCOS
	? new COS({
			SecretId: tcId!,
			SecretKey: tcKey!,
	  })
	: undefined;

export async function uploadFile(file: UploadFile) {
	return new Promise<string>((resolve, reject) => {
		if (isUsingCOS && cos) {
			cos.uploadFile(
				{
					Bucket: tcBucketName! /* 填入您自己的存储桶，必须字段 */,
					Region: tcRegion! /* 存储桶所在地域，例如 ap-beijing，必须字段 */,
					Key: `${file.targetPath}${file.name}` /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */,
					FilePath: file.filePath /* 必须 */,
					SliceSize: 1024 * 1024 * 5 /* 触发分块上传的阈值，超过5MB使用分块上传，非必须 */,
				},
				function (err, data) {
					if (err) {
						reject(err.message);
					} else {
						resolve(data.Location);
					}
				}
			);
		} else {
			try {
				const monopolyServerHost = `${env("PROTOCOL")}://${env("FATPAPER_DOMAIN")}:${env<number>("SERVER_PORT")}`;
				const newTargetPath = `${monopolyServerHost}/static/${file.targetPath}/${file.name}`;
				saveFileToLocal(file, `./public/${file.targetPath}/${file.name}`);
				resolve(newTargetPath);
			} catch (e: any) {
				reject(e);
			}
		}
	});
}

export async function uploadFiles(files: UploadFile[]) {
	return new Promise<string[]>((resolve, reject) => {
		if (isUsingCOS && cos) {
			cos.uploadFiles(
				{
					files: files.map((f) => ({
						Bucket: tcBucketName! /* 填入您自己的存储桶，必须字段 */,
						Region: tcRegion! /* 存储桶所在地域，例如 ap-beijing，必须字段 */,
						Key: `${f.targetPath}${f.name}` /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */,
						FilePath: f.filePath,
					})),
					SliceSize: 1024 * 1024 * 5 /* 触发分块上传的阈值，超过5MB使用分块上传，非必须 */,
				},
				function (err, data) {
					if (err) {
						reject(err.message);
					} else {
						resolve(data.files.map((f) => f.data.Location));
					}
				}
			);
		} else {
			const newTargetPathArr = [];
			try {
				const monopolyServerHost = `${env("PROTOCOL")}://${env("FATPAPER_DOMAIN")}:${env<number>("SERVER_PORT")}`;
				for (const file of files) {
					const newTargetPath = `${monopolyServerHost}/static/${file.targetPath}/${file.name}`;
					saveFileToLocal(file, `./public/${file.targetPath}/${file.name}`);
					newTargetPathArr.push(newTargetPath);
				}
				resolve(newTargetPathArr);
			} catch (e: any) {
				reject(e);
			}
		}
	});
}

export async function deleteFiles(filePaths: string[]) {
	return new Promise((resolve, reject) => {
		if (isUsingCOS && cos) {
			cos.deleteMultipleObject(
				{
					Bucket: tcBucketName! /* 填入您自己的存储桶，必须字段 */,
					Region: tcRegion! /* 存储桶所在地域，例如 ap-beijing，必须字段 */,
					Objects: filePaths.map((f) => ({ Key: f })) /* 存储在桶里的对象键（例如1.jpg，a/b/test.txt），必须字段 */,
				},
				function (err, data) {
					if (err) {
						reject(err.message);
					} else {
						resolve("success");
					}
				}
			);
		} else {
			try {
				for (const filePath of filePaths) {
					deleteFileFromLocal(`./public/${filePath}`);
				}
				resolve("success");
			} catch (e: any) {}
		}
	});
}

function saveFileToLocal(file: UploadFile, targetPath: string) {
	const targetDir = path.dirname(targetPath);
	fs.mkdirSync(targetDir, { recursive: true });
	fs.renameSync(file.filePath, targetPath);
	return targetPath;
}

function deleteFileFromLocal(filePath: string) {
	fs.unlinkSync(filePath);
}
