import { api } from "src/lib/services";
import { COMFYUI_DIR } from "src/lib/config";
import * as path from "path";
import { taskDB } from "src/lib/db";

export const syncTaskStatus = async (id: string) => {
	console.log("syncing task status", id);
	const task = taskDB.get(id);
	if (!task) {
		console.log("task not found", id);
		return;
	}
	if (!task.data?.prompt_id) {
		console.log("task not queued", id);
		return;
	}
	const data = task.data || {};

	const files = Array.isArray(data.files)
		? await Promise.all(
				data.files.map(async (file) => {
					const localFile = Bun.file(path.join(COMFYUI_DIR, file));
					// return localFile;
					const filename = localFile.name?.split("/").pop() || localFile.name;
					return new File([await localFile.arrayBuffer()], filename!, {
						type: localFile.type,
					});
				})
		  )
		: [];

	const dataToSend = {
		id,
		...data,
	} as Record<string, any>;
	let index = 0;
	for (const file of files) {
		dataToSend[`file_${index}`] = file;
		index++;
	}
	console.log({ dataToSend });

	await api.client.updateTask(dataToSend);
};
