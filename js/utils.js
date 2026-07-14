import jsonschema from 'jsonschema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// The package root, so the shipped config schema is found no matter the working directory
const packageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export let CONFIG;

// ----- Config -----

// Load a config from the given path, or discover ./config.json in the current directory
export function loadConfig(configPath) {
	let config;
	let configFileName = configPath;
	try {
		if (!configFileName && fs.existsSync('config.json')) {
			configFileName = 'config.json';
		}
		if (!configFileName || !fs.existsSync(configFileName)) {
			console.error("Error loading configuration file: no configuration file found. Provide a \"config.json\" in the current directory, or run \"game-pass-api init\" to create one.");
			process.exit(1);
		}
		console.log(`Loading configuration file "${configFileName}"...`);
		config = JSON.parse(fs.readFileSync(configFileName, 'utf8').replace(/^\uFEFF/, ''));
	} catch (error) {
		console.error("Error loading configuration file: " + (error.message ?? error));
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

function setupOutput() {
	// Create the output directory in the current working directory if it doesn't exist
	if (!fs.existsSync('output')) {
		fs.mkdirSync('output', { recursive: true });
	}
}
