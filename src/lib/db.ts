import { Database } from "bun:sqlite";
import { DB_PATH } from "./config";
const db = new Database(DB_PATH);

type Task = {
	id: string;
	data: {
		prompt_id?: string;
		status?: "queued" | "running" | "completed" | "failed";
		progress?: number;
		queued_at?: string;
		started_at?: string;
		ended_at?: string;
		error?: string;
		progress_map?: Record<string, number>;
		active_node_id?: string;
		logs?: string;
		files?: string[];
		name?: string;
		endpoint?: string;
		created_at?: string;
		updated_at?: string;
	};
};

db.run(`
		CREATE TABLE IF NOT EXISTS tasks (
			id TEXT PRIMARY KEY,
			prompt_id TEXT,
			data TEXT
		)
	`);

//prompt id , task id and then the db id

type KeyType = "id" | "prompt_id";

class TaskDB {
	get(id: string, key: KeyType = "id"): Task | undefined {
		const task = db.query(`SELECT * FROM tasks WHERE ${key} = ?`).get(id) as Task | undefined;
		if (!task) return undefined;
		if (task.data) task.data = JSON.parse((task.data as string) || "{}");
		return task;
	}
	private insert(id: string): Task {
		const existingTask = this.get(id);
		if (existingTask?.data?.prompt_id) return existingTask;
		db.run(`INSERT INTO tasks (id) VALUES (?)`, [id]);
		return { id, data: {} };
	}

	updateById(id: string, data: Task["data"] = {}): boolean {
		const task = this.insert(id);
		if (!task.data) task.data = {};
		Object.assign(task.data, data);
		db.run(`UPDATE tasks SET data = ? WHERE id = ?`, [JSON.stringify(task.data), id]);
		return true;
	}

	updateByPromptId(prompt_id: string, data: Task["data"] = {}): boolean {
		const task = this.get(prompt_id, "prompt_id");
		if (!task) return false;
		return this.updateById(task.id, data);
	}
}

export const taskDB = new TaskDB();
