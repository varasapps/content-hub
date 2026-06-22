# ✿ My Content Hub

A cute, simple personal dashboard for organizing my day and tracking my UGC work.

## Features
- **To-do lists** for Today / This Week / This Month
  - *Today* resets at midnight (tasks stay, checkmarks clear) and logs your completion to the heatmap
  - *Week* resets every Monday, *Month* resets on the 1st
- **Completion heatmap** — see how much of each day you actually finished, plus a streak counter
- **Brand tracker** — posts done, posts owed, rate per post → auto-calculates what you've earned and what to expect
- **Income targets** — three accumulating tiers; each tier's goal includes everything below it, totals calculate automatically

All data is saved privately in your browser (localStorage). No account, no server needed.

## Run locally
```bash
cd content-hub
python3 -m http.server 8000
# then open http://localhost:8000
```

## Tech
Plain HTML + CSS + JavaScript. No build step, no dependencies — which means it deploys anywhere (Vercel, Netlify, GitHub Pages) as a static site.
