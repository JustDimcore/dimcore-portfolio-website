# Dmytro Ilchenko — personal page

A portfolio site: who I am, skills, experience and the games I worked on. The centrepiece is an
old CRT TV in 3D that plays clips of those games, one channel per project.

Built with [Astro](https://astro.build) (static pages) and [Three.js](https://threejs.org) (the TV).
Light and dark themes, phone to desktop.

## Run

```bash
npm install
npm run dev        # http://localhost:4321
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run check` | Type check (`astro check`) |
| `npm run build` | Static build into `dist/` |
| `npm run verify` | Build, then check the site in Chrome (see below) |
| `npm run video` | Prepare the clips in `public/video/` for streaming |
| `npm run model` | Prepare the TV model from `3d/` into `public/models/` |

## Pages

- `/` — intro with the TV, about, skills, experience, contact.
- `/projects` — the games. On desktop the TV is pinned beside the list and tunes in to the project
  you're reading; a click on it opens the trailer. On phones it sits above the list and behaves
  like the one on the home page.

Texts and facts live in `src/data/`: `profile.ts` (links, skills, experience, contacts) and
`projects.ts` (the games; the TV's channels are built from it in `channels.ts`).

## Videos and the model

Clips are short muted loops, 320×240. Put an `.mp4` into `public/video/`, point a project's
`video` at it and run `npm run video`: it moves the MP4 index to the front and cuts the clip into
chunks (`public/video/<name>/`), so the page streams a few seconds at a time.

The TV's sources (Blender file, textures, exported GLBs) are in `3d/`, which is kept out of git.
`npm run model` cuts the screen glass out as its own part and marks the channel knob's pivot; the
results in `public/models/` are what the site loads. Don't edit those by hand.

## Checking a change

`npm run verify` builds the site, serves it and runs a smoke test in the Chrome installed on this
machine: both pages load without errors on phone and desktop in both themes, no sideways scroll,
the header sits in the same place on both pages, and the TV keeps in step with the Projects list.
It prints a line per check and fails if any does.

## Deploy

Cloudflare serves `dist/` as Worker static assets (`wrangler.jsonc`).
