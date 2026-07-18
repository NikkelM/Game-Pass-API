// Description: Verifies the init wizard assembles and writes a schema-valid config (prompts mocked)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { validateConfigResult } from '../js/utils.js';

test('the wizard writes a schema-valid configuration file', async (t) => {
	// Mock @inquirer/prompts so the wizard runs without a TTY, answering by prompt message
	t.mock.module('@inquirer/prompts', {
		namedExports: {
			search: async ({ message }) => {
				if (message.includes('Market')) return 'US';
				if (message.includes('Language')) return 'en-us';
				return '';
			},
			checkbox: async ({ message }) => {
				if (message.includes('platforms')) return ['console', 'pc', 'eaPlay'];
				if (message.includes('properties')) return ['productTitle'];
				return [];
			},
			select: async ({ message }) => {
				if (message.includes('structured')) return 'array';
				return 'array';
			},
			input: async ({ message }) => {
				if (message.includes('Output directory')) return 'output';
				return '';
			},
			confirm: async ({ message }) => {
				if (message.includes('Treat empty')) return true;
				// add another market / keep complete / fetch now / overwrite
				return false;
			}
		}
	});

	const { runWizard } = await import('../js/wizard.js');

	const outputPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gpa-wiz-')), 'config.json');
	await runWizard(outputPath);

	assert.ok(fs.existsSync(outputPath), 'the wizard should write the config file');
	const written = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

	assert.deepEqual(written.markets, ['US']);
	assert.equal(written.language, 'en-us');
	assert.deepEqual(written.platformsToFetch, ['console', 'pc', 'eaPlay']);
	assert.equal(written.outputFormat, 'array');
	assert.deepEqual(written.includedProperties, { productTitle: true });
	assert.ok(!('outputDirectory' in written), 'the default output directory should be omitted');
	assert.equal(validateConfigResult(written).errors.length, 0, 'the written config should validate against the schema');

	fs.rmSync(path.dirname(outputPath), { recursive: true, force: true });
});
