import type { Dependency, Input } from "workflows/types";

const dependencies: Array<Dependency> = [
	{
		type: "custom_node",
		url: "https://github.com/jax-explorer/ComfyUI-VideoBasicLatentSync",
	},
	{
		type: "custom_node",
		url: "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite",
	},
	{
		type: "model",
		url: "https://huggingface.co/ByteDance/LatentSync-1.6/blob/main/whisper/tiny.pt",
		output: "custom_nodes/comfyui-videobasiclatentsync/checkpoints/whisper/tiny.pt",
	},
	{
		type: "model",
		url: "https://huggingface.co/ByteDance/LatentSync-1.6/blob/main/config.json",
		output: "custom_nodes/comfyui-videobasiclatentsync/checkpoints/config.json",
	},
	{
		type: "model",
		url: "https://huggingface.co/ByteDance/LatentSync-1.6/blob/main/latentsync_unet.pt",
		output: "custom_nodes/comfyui-videobasiclatentsync/checkpoints/latentsync_unet.pt",
	},
	{
		type: "model",
		url: "https://huggingface.co/ByteDance/LatentSync-1.6/blob/main/stable_syncnet.pt",
		output: "custom_nodes/comfyui-videobasiclatentsync/checkpoints/stable_syncnet.pt",
	},
];

const inputs: Array<Input> = [
	{
		type: "video",
		name: "video",
		key: "6.inputs.string_b",
	},
	{
		type: "audio",
		name: "audio",
		key: "7.inputs.string_b",
	},
];
