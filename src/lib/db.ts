import { Database } from "bun:sqlite";
const db = new Database("comfyui.sqlite");

type Task = {
	id: string;
	prompt_id?: string;
	status?: string;
	progress?: number;
	queued_at?: string;
	started_at?: string;
	ended_at?: string;
	error?: string;
	active_node_id?: string;
	logs?: string;
	files?: string;
	name?: string;
	endpoint?: string;
	created_at?: string;
	updated_at?: string;
};

db.run(`
		CREATE TABLE IF NOT EXISTS tasks (
			id TEXT PRIMARY KEY,
			prompt_id TEXT,
			status TEXT,
			progress REAL DEFAULT 0,
			queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			started_at TIMESTAMP,
			ended_at TIMESTAMP,
			error TEXT,
			active_node_id TEXT,
			logs TEXT,
			files TEXT,
			name TEXT,
			endpoint TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`);

//prompt id , task id and then the db id

export const insertTask = (id: string): boolean => {
	//check if the task already exists
	const existingTask = getTask(id);
	if (existingTask?.prompt_id) return true;
	db.run(`INSERT INTO tasks (id) VALUES (?)`, [id]);
	return true;
};

const getTaskByPromptId = (prompt_id: string): Task | undefined => {
	return db.query("SELECT * FROM tasks WHERE prompt_id = ?").get(prompt_id) as Task | undefined;
};

export const updateTaskByPromptId = (prompt_id: string, data: Omit<Task, "id">) => {
	const task = getTaskByPromptId(prompt_id);
	if (!task) return false;
	updateTask(task.id, data);
	return true;
};

export const updateTask = (
	id: string,
	obj: {
		prompt_id?: string;
		status?: string;
		progress?: number;
		queued_at?: string;
		started_at?: string;
		ended_at?: string;
		error?: string;
		active_node_id?: string;
		logs?: string;
		files?: string;
		name?: string;
		endpoint?: string;
	}
) => {
	const fields = [];
	const values = [];
	const placeholders = [];

	// Build dynamic query based on provided fields
	Object.entries(obj).forEach(([key, value]) => {
		if (value !== undefined) {
			fields.push(key);
			values.push(value);
			placeholders.push(`?`);
		}
	});

	if (fields.length === 0) return;

	// Add updated_at
	fields.push("updated_at");
	values.push("CURRENT_TIMESTAMP");

	// Try to update existing record
	const updateFields = fields.map((field) => `${field} = ?`).join(", ");
	const updateResult = db.run(`UPDATE tasks SET ${updateFields} WHERE id = ?`, [...values, id]);
	console.log({ updateResult });
};

export const getTask = (id: string): Task => {
	let task = db.query("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
	if (!task) {
		db.run(`INSERT INTO tasks (id) VALUES (?)`, [id]);
		task = { id };
	}
	return task;
};

export const updatePromptId = (id: string, prompt_id: string): boolean => {
	const task = getTask(id);
	if (task.prompt_id) {
		console.log("task already has prompt id", id, task.prompt_id);
		return false;
	}
	updateTask(id, { prompt_id });
	console.log("task is updated with prompt id", id, prompt_id);
	return true;
};
