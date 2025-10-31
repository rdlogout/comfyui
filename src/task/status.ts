import { api } from "src/lib/api";
import { getTask } from "src/lib/db";

export const syncTaskStatus = async (id: string) => {
	const task = await getTask(id);
	if (!task) {
		console.log("task not found", id);
		return;
	}
	if (!task.prompt_id) {
		console.log("task not queued", id);
		return;
	}

	if (task.files) {
		const files = JSON.parse(task.files);
	}

	await api.client.updateTask({
		id,
		data: task,
	});
};
