// Games I worked on, newest first. Source: the CV and my notes; projects under NDA go without
// names or videos. Videos are 320x240 with no sound (see npm run video).

export interface Project {
  title: string;
  studio: string;
  years: string;
  genre: string;
  platforms: string;
  role: string;
  /** None for projects under NDA: the TV shows snow and "NO SIGNAL" for them. */
  video?: string;
  /** Where to watch the full trailer. */
  link?: string;
  /** The game itself: its official page or store listing. */
  site?: { label: string; url: string };
  summary: string;
  points: string[];
  stack: string[];
  nda?: boolean;
}

// What all four Plarium games had in common (the CV); each adds what I did on it.
const plarium = 'A mobile client built on an in-house MVVM architecture, with NGUI or Unity UI.';

export const projects: Project[] = [
  {
    title: 'Invokers: Titan Legacy',
    studio: 'HitZone',
    years: '2022 – 2026',
    genre: 'Online action RPG',
    platforms: 'iOS, Android, Desktop',
    role: 'Unity Developer',
    video: '/video/invokers.mp4',
    link: 'https://youtu.be/Z-6WQJ7YP4g',
    site: { label: 'Google Play', url: 'https://play.google.com/store/apps/details?id=hitzone.anima.spirit.guardians' },
    summary: 'Combat, the tools the team built it with, and the meta-game around it. Launched in July 2026.',
    points: [
      'Core gameplay and combat mechanics on ECS, and a system that manages combat visual effects.',
      'A VFX pipeline for the art team: an effect takes hours instead of days, with less help from developers.',
      'A node-based visual scripting system for abilities: ~300 characters and ~1,000 abilities were set up with it.',
      'Unity Editor tools for the art and design teams to configure characters, VFX, SFX and animations.',
      'The meta-game layer, the meta-game and battle HUD, cameras for battles and the campaign map, FMOD sound and keyboard and gamepad input.',
    ],
    stack: ['Unity', 'C#', 'ECS', 'IMGUI', 'Odin Inspector', 'uGUI', 'FMOD'],
  },
  {
    title: 'An older game, ported to Xbox',
    studio: 'Room 8 Studio',
    years: '2021 – 2022',
    genre: 'Console port',
    platforms: 'Xbox, other consoles, desktop',
    role: 'Unity Developer',
    summary: 'An older project brought back to a working state and ported to Xbox. The game also shipped on other consoles and desktop.',
    points: ['Restored the project and delivered the Xbox port in about 6 months.'],
    stack: ['Unity', 'C#', 'Xbox'],
    nda: true,
  },
  {
    title: 'A mobile game for learning English',
    studio: 'Room 8 Studio',
    years: '2021 – 2022',
    genre: 'Educational game',
    platforms: 'iOS, Android',
    role: 'Unity Developer, team lead',
    summary: 'A game-like app for learning English on phones.',
    points: ['Led a team of 4 developers.'],
    stack: ['Unity', 'C#', 'iOS', 'Android'],
    nda: true,
  },
  {
    title: 'Raid: Shadow Legends',
    studio: 'Plarium',
    years: '2014 – 2021',
    genre: 'Turn-based RPG',
    platforms: 'iOS, Android',
    role: 'Unity Developer',
    video: '/video/raid.mp4',
    link: 'https://youtu.be/gmwbHdJLadE',
    site: { label: 'Plarium', url: 'https://plarium.com/en/game/raid-shadow-legends/' },
    summary: plarium,
    points: ['Meta-game logic.', 'UI on uGUI with a custom MVVM framework.'],
    stack: ['Unity', 'C#', 'uGUI', 'MVVM'],
  },
  {
    title: 'Stormfall: Rise of Balur',
    studio: 'Plarium',
    years: '2014 – 2021',
    genre: 'MMO strategy',
    platforms: 'iOS, Android',
    role: 'Unity Developer',
    video: '/video/stormfall.mp4',
    link: 'https://youtu.be/oK0ld-35WwE',
    site: { label: 'Plarium', url: 'https://plarium.com/en/game/stormfall-rise-of-balur/' },
    summary: plarium,
    points: ['UI logic on NGUI and NData.', 'The game map.', 'Animation in the game sector.'],
    stack: ['Unity', 'C#', 'NGUI', 'NData'],
  },
  {
    title: 'Soldiers Inc: Mobile Warfare',
    studio: 'Plarium',
    years: '2014 – 2021',
    genre: 'MMO strategy',
    platforms: 'iOS, Android',
    role: 'Unity Developer',
    video: '/video/soldier-inc.mp4',
    link: 'https://youtu.be/g8gEZ74HxcQ',
    site: { label: 'Plarium', url: 'https://plarium.com/en/game/soldiers-inc-mobile-warfare/' },
    summary: plarium,
    points: ['Core gameplay.', 'UI logic on uGUI with a custom MVVM framework.', 'The 3D scene of the game sector.'],
    stack: ['Unity', 'C#', 'uGUI', 'MVVM'],
  },
  {
    title: 'Nords: Heroes of the North',
    studio: 'Plarium',
    years: '2014 – 2021',
    genre: 'Strategy',
    platforms: 'iOS, Android',
    role: 'Unity Developer',
    video: '/video/nords.mp4',
    link: 'https://youtu.be/FUVT2KN-Af4',
    site: { label: 'Plarium', url: 'https://plarium.com/en/game/nords-heroes-of-the-north/' },
    summary: plarium,
    points: ['UI logic on uGUI with a custom MVVM framework.', 'Battle playback, in the spirit of Heroes of Might and Magic.'],
    stack: ['Unity', 'C#', 'uGUI', 'MVVM'],
  },
];
