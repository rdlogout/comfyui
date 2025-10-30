import { getTask } from "src/lib/db";
import { syncStatus } from "./status";

export const syncTask = async (id: string) => {
	const task = getTask(id);
	if (task?.prompt_id) return syncStatus(task.prompt_id);
};
