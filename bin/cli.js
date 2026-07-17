#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';

import { loadConfig } from '../js/utils.js';
import { run } from '../js/gamePass.js';
import { runWizard } from '../js/wizard.js';

const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

const program = new Command();

program
	.name('game-pass-api')
	.description('Fetch all games on Xbox Game Pass (Console, PC and EA Play) with configurable properties, driven by a config.json.')
	.version(pkg.version);

program
	.command('run', { isDefault: true })
	.description('Fetch Game Pass data using a configuration file')
	.option('-c, --config <path>', 'path to a config.json (defaults to ./config.json)')
	.option('--from <dir>', 're-format previously-saved completeGameProperties_*.json files in <dir> instead of fetching (needs an earlier run with keepCompleteProperties)')
	.option('-o, --out <dir>', 'directory to write output files to (overrides outputDirectory; default: output)')
	.addHelpText('after', '\nThe configuration comes from a config.json in the current directory (or --config <path>).\nRun "game-pass-api init" to create one interactively, or see the README and config.schema.json for every option.')
	.action(async (options) => {
		// Start the interactive wizard when invoked with no options and no config to load, but only in an interactive shell so scripts still get the friendly no-config error
		if (!options.config && !options.from && !options.out && !fs.existsSync('config.json') && process.stdin.isTTY) {
			await runWizard('config.json');
			return;
		}
		const config = loadConfig(options.config);
		if (options.out) {
			config.outputDirectory = options.out;
		}
		await run(config, { fromDirectory: options.from });
	});

program
	.command('init')
	.description('Interactively create a configuration file')
	.option('-o, --output <path>', 'where to write the configuration file', 'config.json')
	.action(async (options) => {
		await runWizard(options.output);
	});

program.showHelpAfterError('(run with --help to see available commands)');

try {
	await program.parseAsync(process.argv);
} catch (error) {
	console.error('Error: ' + (error?.message ?? error));
	process.exit(1);
}
