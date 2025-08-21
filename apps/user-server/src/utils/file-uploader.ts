import COS from "cos-nodejs-sdk-v5";
import {
	__TC_BUCKET_NAME__,
	__TC_REGION__,
	__TC_ID__,
	__TC_KEY__,
	__FATPAPERUSERSERVERHOST__,
} from "../../global.config";
import fs from "fs";
import path from "path";

type UploadFile = {
	filePath: string;
	name: string;
	targetPath: string;
};

const isUsingCOS = !!(__TC_BUCKET_NAME__ && __TC_REGION__ && __TC_ID__ && __TC_KEY__);

const cos = isUsingCOS
	? new COS({
			SecretId: __TC_ID__,
			SecretKey: __TC_KEY__,
	  })
	: undefined;

export async function uploadFile(file: UploadFile) {
	return new Promise<string>((resolve, reject) => {
		if (isUsingCOS && cos) {
			cos.uploadFile(
				{
					Bucket: __TC_BUCKET_NAME__ /* 填入您自己的存储桶，必须字段 */,
					Region: __TC_REGION__ /* 存储桶所在地域，例如 ap-beijing，必须字段 */,
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
				const newTargetPath = `${__FATPAPERUSERSERVERHOST__}/static/${file.targetPath}/${file.name}`;
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
						Bucket: __TC_BUCKET_NAME__ /* 填入您自己的存储桶，必须字段 */,
						Region: __TC_REGION__ /* 存储桶所在地域，例如 ap-beijing，必须字段 */,
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
				for (const file of files) {
					const newTargetPath = `${__FATPAPERUSERSERVERHOST__}/static/${file.targetPath}/${file.name}`;
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
					Bucket: __TC_BUCKET_NAME__ /* 填入您自己的存储桶，必须字段 */,
					Region: __TC_REGION__ /* 存储桶所在地域，例如 ap-beijing，必须字段 */,
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
			} catch (e: any) {
				reject(e);
			}
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
