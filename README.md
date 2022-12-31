# Game Pass API

This script fetches all games that are currently available on the Xbox Game Pass for a given platform (you can choose any combination of `Console`, `PC`, `EAPlay`) and market (e.g. `US` or `DE`) and writes their complete properties as provided by the Microsoft API to a file called `gameProperties_{platform}_{market}.json`.

The data is then cleaned up to only contain information that is useful/required by the user.