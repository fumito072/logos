# Privacy Policy

Last updated: June 24, 2026

## Overview

Pinterest Logo Lab is a personal, internal development tool used to connect to the app owner's Pinterest account, read saved boards and pins, analyze visual preferences, and generate logo direction files for a personal brand project.

## Data Accessed

When the app owner authorizes the app, Pinterest Logo Lab may read:

- Pinterest boards
- Board sections
- Pins saved to boards or board sections
- Pin titles, descriptions, links, image metadata, and related board names

The app requests read-only scopes:

- `boards:read`
- `pins:read`

## Data Use

Pinterest data is used only to create a local visual preference profile and logo direction assets. The app does not post to Pinterest, modify Pinterest content, delete content, or send messages.

## Data Storage

OAuth tokens are stored locally in `.secrets/pinterest-token.json` on the app owner's machine. Pinterest export files are stored locally under `data/`. These paths are ignored by git and are not intended to be committed to GitHub.

## Data Sharing

Pinterest Logo Lab does not sell, rent, or share Pinterest account data with third parties. Data is processed locally by default. If the optional OpenAI analysis mode is enabled by setting `OPENAI_API_KEY`, selected board and pin metadata may be sent to OpenAI for preference analysis.

## Data Deletion

The app owner can delete local Pinterest data at any time by removing:

- `.secrets/pinterest-token.json`
- files under `data/`
- generated profile files under `output/`

The app owner can also revoke app access from Pinterest account settings.

## Contact

For questions about this tool, contact the repository owner:

https://github.com/fumito072/logos
