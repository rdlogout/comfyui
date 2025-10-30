import type { Dependency, Input } from "workflows/types";

const dependencies: Array<Dependency> = [
	{
		type: "custom_node",
		url: "https://github.com/kijai/ComfyUI-MMAudio",
	},
	{
		type: "custom_node",
		url: "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite",
	},
	{
		type: "model",
		url: "https://huggingface.co/nvidia/bigvgan_v2_44khz_128band_512x",
		output: "model/mmaudio/bigvgan_v2_44khz_128band_512x",
	},
	{
		type: "model",
		url: "https://huggingface.co/Kijai/MMAudio_safetensors/blob/main/apple_DFN5B-CLIP-ViT-H-14-384_fp16.safetensors",
		output: "model/mmaudio/apple_DFN5B-CLIP-ViT-H-14-384_fp16.safetensors",
	},
	{
		type: "model",
		url: "https://huggingface.co/Kijai/MMAudio_safetensors/blob/main/mmaudio_large_44k_v2_fp16.safetensors",
		output: "model/mmaudio/mmaudio_large_44k_v2_fp16.safetensors",
	},
	{
		type: "model",
		url: "https://huggingface.co/Kijai/MMAudio_safetensors/blob/main/mmaudio_synchformer_fp16.safetensors",
		output: "model/mmaudio/mmaudio_synchformer_fp16.safetensors",
	},
	{
		type: "model",
		url: "https://huggingface.co/Kijai/MMAudio_safetensors/blob/main/mmaudio_vae_44k_fp16.safetensors",
		output: "model/mmaudio/mmaudio_vae_44k_fp16.safetensors",
	},
];

const inputs: Array<Input> = [
	{
		type: "video",
		name: "video",
		key: "91.inputs.video",
	},
	{
		type: "text",
		name: "prompt",
		key: "3.inputs.prompt",
	},
	{
		type: "number",
		name: "duration",
		key: "3.inputs.duration",
		default: "7.5",
	},
	{
		type: "text",
		name: "negative_prompt",
		key: "3.inputs.negative_prompt",
	},
];
