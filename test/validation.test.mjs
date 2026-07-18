// Description: Offline tests for schema validation of the configuration file

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { validateConfigResult } from '../js/utils.js';

// A minimal valid config; helpers return mutated copies for the reject cases
const base = () => ({
	$schema: 'config.schema.json',
	markets: ['US'],
	language: 'en-us',
	platformsToFetch: ['console', 'pc', 'eaPlay'],
	outputFormat: 'array',
	includedProperties: { productTitle: true }
});
const without = (key) => { const c = base(); delete c[key]; return c; };
const accepts = (config) => validateConfigResult(config).errors.length === 0;

describe('config schema validation', () => {
	it('accepts a minimal valid config', () => {
		assert.ok(accepts(base()));
	});

	it('accepts the optional top-level fields', () => {
		const config = base();
		config.outputDirectory = 'out';
		config.treatEmptyStringsAsNull = false;
		config.keepCompleteProperties = true;
		assert.ok(accepts(config));
	});

	for (const key of ['markets', 'language', 'platformsToFetch', 'outputFormat', 'includedProperties']) {
		it(`rejects a config missing the required "${key}"`, () => {
			assert.ok(!accepts(without(key)));
		});
	}

	it('rejects an unknown top-level key (additionalProperties: false)', () => {
		const config = base();
		config.bogusKey = true;
		assert.ok(!accepts(config));
	});

	it('rejects an invalid market code', () => {
		const config = base();
		config.markets = ['XX'];
		assert.ok(!accepts(config));
	});

	it('rejects an invalid language code', () => {
		const config = base();
		config.language = 'xx-yy';
		assert.ok(!accepts(config));
	});

	it('rejects an invalid platform', () => {
		const config = base();
		config.platformsToFetch = ['switch'];
		assert.ok(!accepts(config));
	});

	it('rejects an invalid outputFormat', () => {
		const config = base();
		config.outputFormat = 'nope';
		assert.ok(!accepts(config));
	});

	it('rejects an empty includedProperties (minProperties)', () => {
		const config = base();
		config.includedProperties = {};
		assert.ok(!accepts(config));
	});
});
