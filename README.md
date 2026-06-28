# ⚾ Kingsmen Softball

A mobile-friendly **slow-pitch softball team manager**. Runs entirely in the
browser — no server, no accounts, no internet required. All data lives on your
device, and you can back it up to a file anytime.

Built as a single-page app with plain HTML/CSS/JavaScript so it just works:
open `index.html` and go.

## Features

| Area | What you can do |
| --- | --- |
| **Roster** | Add players with jersey #, positions, division (M/F for co-ed rules), bats/throws, and active/inactive status. Tap a player for full season metrics. |
| **Coaches** | Track head/assistant coaches, managers, scorekeepers with contact info. |
| **Check-In** | Per-game attendance for **players _and_ coaches** — In / Maybe / Out, with live counts and one-tap "all players in." |
| **Games** | Schedule games (date, opponent, home/away, field), see a running **W-L record**, and review final box scores. |
| **Lineup** | Batting-order builder (▲▼ to reorder); prioritizes checked-in players. |
| **Field positions** | Per-game defensive assignments for all 10 slow-pitch spots (P, C, 1B, 2B, 3B, SS, LF, LCF, RCF, RF), with a duplicate-player warning. |
| **Live (play-by-play)** | Real-time **scoreboard + base diamond + outs**. Record each batter (1B/2B/3B/HR/BB/SF/K/OUT/FC/ROE), then set exactly where the batter **and every base runner** ends up — 1st / 2nd / 3rd / Home / Out — so runs, RBIs and outs are tracked play by play. Inning-by-inning line score, on-deck batter, and **Undo**. |
| **Stats** | Season leaderboards, team batting totals, and a sortable per-player table — AVG / OBP / SLG / OPS plus H, HR, RBI, R, BB, K and more. Season totals roll up automatically from every completed game. |
| **Backup** | Export/import all data as a JSON file (Settings ⚙️). Reset when you want a clean slate. |
| **Installable** | Add to Home Screen on a phone — works offline as a PWA. |

## How stats work

- During a live game, each at-bat updates that game's **box score** instantly.
- When you **End Game**, it's saved as *final*.
- **Season stats are derived** by summing every final game — so editing or
  deleting a game always keeps totals correct. Rate stats use standard formulas:
  - `AVG = H / AB`
  - `OBP = (H + BB) / (AB + BB + SF)`
  - `SLG = Total Bases / AB`
  - `OPS = OBP + SLG`

## Running it

**Locally:** open `index.html` in any modern browser. To enable the
offline/installable PWA features, serve it over HTTP instead of `file://`:

```bash
# from the project folder
python3 -m http.server 8000
# then visit http://localhost:8000
```

**Hosting:** it's fully static — drop it on GitHub Pages, Netlify, Vercel, or
any static host. No build step.

## Data & privacy

Everything is stored in your browser's `localStorage` on the device you use.
Nothing is sent anywhere. Use **Settings → Export Backup** regularly (and before
clearing browser data or switching phones) so you don't lose your season.

## Project structure

```
index.html              app shell + tab bar
css/styles.css          all styling (dark, mobile-first)
js/store.js             localStorage persistence + state
js/utils.js             DOM helpers, modal, toast
js/stats.js             stat math + season aggregation
js/players.js           roster + player metrics
js/coaches.js           coaching staff
js/checkin.js           per-game attendance
js/games.js             schedule, lineup builder, box scores
js/live.js              live scorekeeping
js/statsview.js         leaderboards + season table
js/settings.js          team info, backup/restore
js/app.js               router/bootstrap
sw.js, manifest...      PWA/offline support
```

## Ideas for later

Pitch counts aren't relevant for slow-pitch, but you could add: fielding stats,
multi-team/league support, photo avatars, CSV export, game notes per inning, or
cloud sync. The data layer (`js/store.js`) is the single place to extend.
