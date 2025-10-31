import { syncNode } from "./node";
import { downloadModel } from "./model";
import { api } from "src/lib/api";
type Dependency = {
	id: string;
	url: string;
	type: "custom_node" | "model";
	output?: string;
};
export const syncDependencies = async (dependencies: Dependency[]) => {
	// if(!isA)
	console.log("Syncing dependencies");
	console.table(dependencies.map((s) => ({ type: s.type, output: s.output })));
	const customNodes = dependencies.filter((d) => d.type === "custom_node");
	const models = dependencies.filter((d) => d.type === "model");

	// console.log(customNodes, models);

	// throw new Error("Not implemented");

	const nodePromises = customNodes.map(async (node: Dependency) => {
		const resp = await syncNode(node.url);
		console.log({ resp });
		return { id: node.id, type: "custom_node", success: resp.success, message: resp.message };
	});
	const modelPromises = models.map(async (model: any) => {
		const resp = await downloadModel(model.url, model.output);
		return { id: model.id, type: "model", success: resp.success, message: resp.message };
	});
	const results = await Promise.all([...nodePromises, ...modelPromises]);
	const successResult = results.filter((r) => r.success);
	console.log("Successfully synced dependencies:");
	console.table(results.map((s) => ({ success: s.success, message: s.message, type: s.type })));
	await api.client.updateDependencies(successResult);
	// await server.machines.(results);
};
