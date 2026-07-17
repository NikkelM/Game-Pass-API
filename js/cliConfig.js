// Pure builders that turn parsed CLI options into a configuration object
// Kept separate from bin/cli.js so they can be unit tested, and they throw on invalid input so the CLI can report the error and exit

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const packageDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const schema = JSON.parse(fs.readFileSync(path.join(packageDir, 'config.schema.json'), 'utf8').replace(/^\uFEFF/, ''));

export const MARKETS = schema.properties.markets.items.enum;
export const LANGUAGES = schema.properties.language.enum;
export const PLATFORMS = schema.properties.platformsToFetch.items.enum;
export const OUTPUT_FORMATS = schema.properties.outputFormat.oneOf.map((option) => option.const);
// Only the flat, boolean includedProperties are settable via flags; the nested ones (images, pricing, ...) stay in the config or the wizard
export const BOOLEAN_PROPERTIES = Object.entries(schema.properties.includedProperties.properties)
	.filter(([, definition]) => definition.type === 'boolean')
	.map(([name]) => name);

function parseList(value) {
	return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

function normalizeEnumValue(value, allowed, label) {
	const match = allowed.find((candidate) => candidate.toLowerCase() === value.toLowerCase());
	if (!match) {
		const hint = allowed.length <= 10 ? `Valid values: ${allowed.join(', ')}.` : 'See the README for the list of valid values.';
		throw new Error(`invalid ${label} "${value}". ${hint}`);
	}
	return match;
}

function parseEnumList(value, allowed, label) {
	const list = parseList(value).map((entry) => normalizeEnumValue(entry, allowed, label));
	if (list.length === 0) {
		throw new Error(`provide at least one ${label}.`);
	}
	return [...new Set(list)];
}

// True if any config-building flag was provided on the command line (so we build from flags instead of a config file)
export function usedBuildingFlags(command) {
	return ['markets', 'platforms', 'language', 'format', 'properties', 'treatEmptyAsNull', 'keepComplete']
		.some((name) => command.getOptionValueSource(name) === 'cli');
}

// Build a full configuration object from parsed CLI options, defaulting anything not provided
export function buildConfig(options) {
	const includedProperties = {};
	const properties = options.properties ? parseEnumList(options.properties, BOOLEAN_PROPERTIES, 'property') : ['productTitle'];
	for (const property of properties) {
		includedProperties[property] = true;
	}

	const config = {
		$schema: 'config.schema.json',
		markets: options.markets ? parseEnumList(options.markets, MARKETS, 'market code') : ['US'],
		language: options.language ? normalizeEnumValue(options.language.trim(), LANGUAGES, 'language') : 'en-us',
		platformsToFetch: options.platforms ? parseEnumList(options.platforms, PLATFORMS, 'platform') : ['console', 'pc', 'eaPlay'],
		outputFormat: options.format ? normalizeEnumValue(options.format.trim(), OUTPUT_FORMATS, 'output format') : 'array',
		treatEmptyStringsAsNull: options.treatEmptyAsNull ?? true,
		keepCompleteProperties: options.keepComplete ?? false,
		includedProperties
	};
	if (options.out) {
		config.outputDirectory = options.out;
	}
	return config;
}
