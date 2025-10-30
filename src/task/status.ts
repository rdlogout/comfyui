import { api } from "src/lib/api";
import { getTask } from "src/lib/db";

export const syncStatus = async (id: string) => {
	const status = await getTask(id);
	if (!status) {
		console.log("task not found", id);
		return;
	}

	if (status.files) {
		const files = JSON.parse(status.files);
	}

	await api.client.updateTask({
		id,
		data: status,
	});
};
