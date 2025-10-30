import type { Dependency, Input } from "workflows/types";

const dependencies: Array<Dependency> = [
	{
		type: "custom_node",
		url: "https://github.com/Fannovel16/ComfyUI-Frame-Interpolation",
	},
	{
		type: "custom_node",
		url: "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite",
	},
	{
		type: "custom_node",
		url: "https://github.com/yolain/ComfyUI-Easy-Use",
	},
];

const inputs: Array<Input> = [
	{
		type: "video",
		name: "video",
		key: "2.inputs.video",
	},
	{
		type: "number",
		name: "factor",
		key: "7.inputs.value",
	},
];
