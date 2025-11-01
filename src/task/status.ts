import { api } from "src/lib/api";
import { COMFYUI_DIR } from "src/lib/config";
import * as path from "path";
import { getTask } from "src/lib/db";

export const syncTaskStatus = async (id: string) => {
	console.log("syncing task status", id);
	const task = getTask(id);
	if (!task) {
		console.log("task not found", id);
		return;
	}
	if (!task.prompt_id) {
		console.log("task not queued", id);
		return;
	}
	if (task.files) task.files = JSON.parse(task.files);

	const files = Array.isArray(task.files)
		? await Promise.all(
				task.files.map(async (file) => {
					const localFile = Bun.file(path.join(COMFYUI_DIR, file));
					// return localFile;
					const filename = localFile.name?.split("/").pop() || localFile.name;
					return new File([await localFile.arrayBuffer()], filename!, {
						type: localFile.type,
					});
				})
		  )
		: [];

	console.log({ files });
	const dataToSend = {
		id,
		status: task.status,
		ended_at: task.ended_at,
		queued_at: task.queued_at,
		started_at: task.started_at,
		error: task.error,
		active_node_id: task.active_node_id,
		progress: task.progress,
		logs: task.logs,
	} as Record<string, any>;
	let index = 0;
	for (const file of files) {
		dataToSend[`file_${index}`] = file;
		index++;
	}
	console.log({ dataToSend });

	await api.client.updateTask(dataToSend);
};
