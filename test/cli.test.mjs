// Description: Subprocess tests for the CLI command wrappers (bin/cli.js) and the config-loading guards (no network)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, '..', 'bin', 'cli.js');

// Run the CLI in a throwaway working directory, optionally seeding files first
function runCli(args, files = {}) {
	const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'gpa-cli-'));
	try {
		for (const [name, contents] of Object.entries(files)) {
			fs.writeFileSync(path.join(cwd, name), contents);
		}
		const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8' });
		return { code: result.status, out: (result.stdout ?? '') + (result.stderr ?? '') };
	} finally {
		fs.rmSync(cwd, { recursive: true, force: true });
	}
}

describe('CLI command wrappers', () => {
	it('--version prints the package version', () => {
		const { code, out } = runCli(['--version']);
		assert.equal(code, 0);
		assert.match(out.trim(), /^\d+\.\d+\.\d+/);
	});

	it('--help lists every command', () => {
		const { code, out } = runCli(['--help']);
		assert.equal(code, 0);
		for (const command of ['run', 'init']) {
			assert.match(out, new RegExp(command));
		}
	});

	it('an unknown command exits non-zero', () => {
		const { code } = runCli(['definitelyNotACommand']);
		assert.notEqual(code, 0);
	});
});

describe('CLI configuration guards', () => {
	it('exits with a friendly message when no config file is found', () => {
		const { code, out } = runCli([]);
		assert.equal(code, 1);
		assert.match(out, /no "config\.json" found/);
	});

	it('reports a malformed config file as invalid JSON', () => {
		const { code, out } = runCli([], { 'config.json': '{ not valid json ' });
		assert.equal(code, 1);
		assert.match(out, /Error parsing configuration file/);
	});

	it('rejects an unknown top-level config key', () => {
		const config = { markets: ['US'], language: 'en-us', platformsToFetch: ['console'], outputFormat: 'array', includedProperties: { productTitle: true }, bogusKey: true };
		const { code, out } = runCli([], { 'config.json': JSON.stringify(config) });
		assert.equal(code, 1);
		assert.match(out, /Error validating configuration file/);
	});

	it('strips a UTF-8 BOM before parsing the config', () => {
		// A BOM-prefixed config that parses but fails schema validation reaches validation, not a load/parse error, proving the BOM was stripped
		const config = { markets: ['XX'], language: 'en-us', platformsToFetch: ['console'], outputFormat: 'array', includedProperties: { productTitle: true } };
		const { code, out } = runCli([], { 'config.json': '\uFEFF' + JSON.stringify(config) });
		assert.equal(code, 1);
		assert.doesNotMatch(out, /Error parsing configuration file/);
		assert.match(out, /Error validating configuration file/);
	});

	it('errors when --config points at a nonexistent file', () => {
		const { code, out } = runCli(['run', '--config', 'nope.json']);
		assert.equal(code, 1);
		assert.match(out, /no configuration file found/);
	});
});
