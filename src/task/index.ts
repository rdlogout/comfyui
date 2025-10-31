import { getTask } from "src/lib/db";
import { syncTaskStatus } from "./status";
import { queueTask } from "./queue";
export { queueTask, syncTaskStatus };
type QueueTaskData = {
	id: string;
	prompt: any;
};
