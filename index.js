// Description: Fetches Game Pass games and their properties per the configuration and writes them to the output folder
// Backwards-compatible entry point - the CLI (bin/cli.js) is the primary interface

import { loadConfig } from './js/utils.js';
import { run } from './js/gamePass.js';

try {
	await run(loadConfig());
} catch (error) {
	console.error("Error: " + (error?.message ?? error));
	process.exit(1);
}
