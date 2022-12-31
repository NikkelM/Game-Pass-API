# Get all Game Pass games

This script fetches all games that are currently available on the Xbox Game Pass for a given platform (you can choose any combination of `Console`, `PC`, `EAPlay`) and market (e.g. `US` or `DE`) and writes their complete properties as provided by the Microsoft API to a file called `gameProperties_{platform}_{market}.json`.