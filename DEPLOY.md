# Putting The Decision Atlas online with GitHub Pages

The book is already published at https://lordwateroff.github.io/decision-atlas/ from the repository https://github.com/lordwateroff/decision-atlas. This guide explains how it works and how to do it again from scratch.

## Why this address lasts

The address belongs to your GitHub account (lordwateroff). It stays the same as long as the account and the repository keep their names. GitHub Pages is free for public repositories.

## How updates work

1. Change files in the `site` folder.
2. Commit and push to the `main` branch.
3. GitHub Actions runs the tests in `tests/`. If they pass, it publishes the `site` folder. Watch progress in the repository's Actions tab. It takes about one minute.

## Doing it from scratch on a new account

1. Create a free account at github.com.
2. Click New repository. Name it `decision-atlas`. Choose Public. Click Create repository.
3. On the new repository page, click "uploading an existing file". Drag in everything from this project except `node_modules`, `dist` and `shots`. Make sure the hidden `.github` folder is included; if your file browser hides it, use the GitHub Desktop app or the `git` command instead. Click Commit changes.
4. Open Settings, then Pages. Under Build and deployment, set Source to GitHub Actions.
5. Open the Actions tab and wait for the green check mark.
6. Your book is at `https://YOUR-USERNAME.github.io/decision-atlas/`.

## After the address changes: regenerate the card

1. Open `tools/config.json` and set `bookUrl` to the new address.
2. In a terminal, start a local server from the project folder: `python3 -m http.server 4174 --directory site`
3. In a second terminal: `cd tools`, then `npm install`, then `node render.mjs http://127.0.0.1:4174/ card`
4. The script prints what the QR code decodes to. It must match `bookUrl`.
5. Scan the card in `dist/` with your own phone before uploading it.

## Other commands

- `node --test tests/logic.test.js` checks every worked number in the book.
- `node tools/render.mjs http://127.0.0.1:4174/` rebuilds the PDF, defense guide PDF, cover and card.
- `node tools/shoot.mjs http://127.0.0.1:4174/` takes phone and desktop screenshots and reports any sideways overflow.
