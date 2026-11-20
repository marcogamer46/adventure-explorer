# Adventure Explorer — site

A visual, presentable study guide for the Adventure workbench.

## Contents

- `index.html` — the full site
- `style.css` — design system + layout
- `app.js` — interactive case boards, nav, scroll effects
- `walkthrough.js` — the line-by-line code walkthrough of `src/student/`
- `README.md` — this file

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Publish to GitHub Pages

This folder is a standalone package. From this folder:

```bash
git init
git add .
git commit -m "Adventure Explorer guide"
gh repo create adventure-explorer --public --source=. --push
gh api -X POST repos/{owner}/adventure-explorer/pages \
  -f source[branch]=main -f source[path]=/
```

Then your site lives at:
`https://<username>.github.io/adventure-explorer/`
