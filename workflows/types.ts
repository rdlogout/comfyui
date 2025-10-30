export type Dependency = {
	type: "model" | "custom_node";
	url: string;
	output?: string;
};

export type Input = {
	type: "number" | "text" | "image" | "audio" | "video";
	name: string;
	key: string;
	default?: string;
};

export type ProgressMapping = {
	[key: string]: number;
};

export type Workflow = {
	name: string;
	dependencies: Dependency[];
	inputs: Input[];
	progressMapping: ProgressMapping;
};
