import { api } from "src/lib/api";
import { comfyApi, COMFYUI_DIR } from "src/lib/comfyui";
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
		? task.files.map((file) => {
				const localFile = Bun.file(path.join(COMFYUI_DIR, file));
				return localFile;
				return new File([localFile], localFile.name!, {
					type: localFile.type,
				});
		  })
		: [];

	console.log({ files });

	await api.client.updateTask({
		id,
		data: {
			status: task.status,
			ended_at: task.ended_at,
			queued_at: task.queued_at,
			started_at: task.started_at,
			error: task.error,
			active_node_id: task.active_node_id,
			progress: task.progress,
			logs: task.logs,
			files,
		},
	});
};
