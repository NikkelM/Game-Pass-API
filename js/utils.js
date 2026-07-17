import jsonschema from 'jsonschema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { confirm } from '@inquirer/prompts';

// The package root, so the shipped config schema is found no matter the working directory
const packageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export let CONFIG;

// ----- Saving a config -----

// Write a flag-built config to disk for reuse, stripping any secret fields so they are never persisted
// Prompts before overwriting an existing file in an interactive shell; refuses to overwrite non-interactively
export async function saveConfigToFile(config, outputPath, secretFields = []) {
	const toWrite = { ...config };
	for (const field of secretFields) {
		delete toWrite[field];
	}
	if (fs.existsSync(outputPath)) {
		if (!process.stdin.isTTY) {
			throw new Error(`"${outputPath}" already exists - remove it, or pass --save-config <path> with a different path.`);
		}
		const overwrite = await confirm({ message: `"${outputPath}" already exists. Overwrite it?`, default: false });
		if (!overwrite) {
			console.log('The existing configuration file was not changed.');
			return;
		}
	}
	fs.writeFileSync(outputPath, JSON.stringify(toWrite, null, 2));
	console.log(`Wrote configuration to "${outputPath}".`);
}

// ----- Config -----

// Load a config from the given path, or discover ./config.json in the current directory, then validate it against the shipped schema
export function loadConfig(configPath) {
	let configFileName = configPath;
	if (!configFileName) {
		if (fs.existsSync('config.json')) {
			console.log("Loading configuration file \"config.json\"...");
			configFileName = 'config.json';
		} else {
			console.error("Error loading configuration file: no \"config.json\" found in the current directory. Run \"game-pass-api init\" to create one, or pass --config <path>.");
			process.exit(1);
		}
	} else if (!fs.existsSync(configFileName)) {
		console.error(`Error loading configuration file: no configuration file found at "${configFileName}".`);
		process.exit(1);
	} else {
		console.log(`Loading configuration file "${configFileName}"...`);
	}

	let config;
	try {
		config = JSON.parse(fs.readFileSync(configFileName, 'utf8').replace(/^\uFEFF/, ''));
	} catch (error) {
		console.error(`Error parsing configuration file "${configFileName}" as JSON: ${error.message ?? error}`);
		process.exit(1);
	}

	validateConfig(config);
	return config;
}

// Validate a config against the shipped schema, returning the raw jsonschema result
export function validateConfigResult(config) {
	const validator = new jsonschema.Validator();
	return validator.validate(config, JSON.parse(fs.readFileSync(path.join(packageDir, 'config.schema.json'), 'utf8').replace(/^\uFEFF/, '')));
}

// Validate a config against the schema, exiting the process on failure
export function validateConfig(config) {
	console.log("Validating configuration file...");
	const result = validateConfigResult(config);
	if (result.errors.length > 0) {
		console.error("Error validating configuration file: " + result.errors.map((error) => error.stack).join('; '));
		process.exit(1);
	}
	console.log("Configuration file validated successfully!\n");
}

export function initConfig(config) {
	CONFIG = config;
	setupOutput();
}

// ----- Output -----

// Build an OS-native path inside the output directory (in the current working directory)
export function outputPath(...segments) {
	return path.join(CONFIG.outputDirectory ?? 'output', ...segments);
}

function setupOutput() {
	// Create the output directory in the current working directory if it doesn't exist
	if (!fs.existsSync(outputPath())) {
		fs.mkdirSync(outputPath(), { recursive: true });
	}
}
