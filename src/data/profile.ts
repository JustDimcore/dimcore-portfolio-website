// Facts for the home page. Source: CVs/Dmytro_Ilchenko_CV_MASTER.html (only confirmed facts)
// and the public LinkedIn profile.

export const links = {
  projects: '/projects',
  email: 'dimcore.dev@gmail.com',
  linkedin: 'https://www.linkedin.com/in/dimcore/',
  github: 'https://github.com/JustDimcore',
  /** 30-minute call, booked on Calendly. */
  call: 'https://calendly.com/dimcore-dev/30min',
};

/** The core of the stack: highlighted wherever they appear in the skills. */
export const coreSkills = new Set(['C#', '.NET', 'Unity', 'TypeScript', 'JavaScript', 'Angular']);

/** Skills as a spec sheet: games, web and what's shared, one line per area. */
export const skills: { title: string; rows: { area: string; items: string[] }[] }[] = [
  {
    title: 'Games',
    rows: [
      { area: 'Engine', items: ['Unity', 'C#', '.NET', 'ECS', 'Unity Physics', 'Multithreading'] },
      { area: 'UI', items: ['uGUI', 'NGUI', 'Doozy UI', 'MVVM / data binding'] },
      { area: 'Tools', items: ['Unity Editor tools (IMGUI, Odin Inspector)', 'WPF'] },
      { area: 'Audio & input', items: ['FMOD', 'Input systems'] },
      { area: 'Platforms', items: ['Android', 'iOS', 'Windows', 'macOS', 'Xbox'] },
    ],
  },
  {
    title: 'Web',
    rows: [
      { area: 'Frontend', items: ['TypeScript', 'JavaScript', 'Angular', 'AngularJS', 'React', 'HTML', 'CSS / SCSS'] },
      { area: 'State', items: ['RxJS', 'NgRx', 'NGXS', 'Redux'] },
      { area: 'UI', items: ['Angular Material', 'Tailwind CSS', 'Bootstrap'] },
      { area: 'Backend & data', items: ['Node.js', 'Express', 'REST', 'WebSockets', 'GraphQL', 'PostgreSQL'] },
      { area: 'Testing', items: ['Jest', 'Playwright', 'Cypress'] },
    ],
  },
  {
    title: 'Everywhere',
    rows: [
      { area: '3D', items: ['Three.js', 'WebGL', 'Blender', 'Autodesk Fusion', 'VFX pipelines'] },
      { area: 'Engineering', items: ['OOP', 'SOLID', 'Design patterns', 'Profiling and optimization'] },
      { area: 'Tools', items: ['Git', 'SVN', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Docker'] },
      { area: 'AI', items: ['Claude Code', 'Codex', 'GitHub Copilot', 'AI-driven SDLC'] },
    ],
  },
];

export interface Job {
  role: string;
  company: string;
  place?: string;
  dates: string;
  /** The project or titles the job was about. */
  project?: string;
  points: string[];
}

// Wording as in the CV; two tracks, as the CV splits them.
export const experience: { track: string; jobs: Job[] }[] = [
  {
    track: 'Games · Unity / C#',
    jobs: [
      {
        role: 'Unity Developer',
        company: 'HitZone',
        place: 'Kraków, Poland',
        dates: '2022 – 2026',
        project: 'Invokers: Titan Legacy — multi-platform online Action RPG, launched in July 2026 on iOS, Android and Desktop',
        points: [
          'Developed core gameplay and combat mechanics using the ECS architecture.',
          'Designed and implemented a combat visual effects (VFX) management system.',
          'Built a VFX assembly and configuration pipeline for the art team, cutting effect creation time from several days to several hours and reducing developer involvement.',
          'Implemented a node-based visual scripting system for configuring and tuning character abilities, used to set up ~300 characters and ~1,000 abilities.',
          'Built custom Unity Editor tools used by the art and design teams to configure game entities (characters, VFX, SFX, animations) using IMGUI and Odin Inspector.',
          'Developed the meta-game layer using a state-management approach.',
          'Built UI components for the meta-game and battle HUD (uGUI).',
          'Implemented camera control logic for battles and the campaign map.',
          'Maintained the FMOD sound system integration and implemented keyboard/gamepad input bindings.',
        ],
      },
      {
        role: 'Unity Developer',
        company: 'Room 8 Studio',
        place: 'Kharkiv, Ukraine',
        dates: '2021 – 2022',
        points: [
          'NDA — restored an older project and delivered its Xbox port within ~6 months (the title also shipped on other console platforms and desktop).',
          'NDA — mobile English-learning game/app (iOS, Android); led a team of 4 developers.',
          'Contributed to a cross-platform online game project delivered across mobile and desktop platforms.',
          'Built a custom MVVM/data-binding framework.',
        ],
      },
      {
        role: 'Unity Developer / Frontend Developer',
        company: 'Plarium',
        place: 'Kharkiv, Ukraine',
        dates: '2014 – 2021',
        project: 'Android/iOS: Raid: Shadow Legends (100M+ downloads), Stormfall: Rise of Balur (20M+ downloads), Soldiers Inc: Mobile Warfare (10M+ downloads), Nords: Heroes of the North',
        points: [
          'Developed mobile clients for hardcore MMO RTS and Turn-Based RPG games using an in-house MVVM architecture and various UI approaches (NGUI, Unity UI).',
          'Built internal development tools for the team using WPF, Angular, AngularJS, TypeScript and Node.js.',
          'Stack: Unity, C#/.NET; additionally WPF, JavaScript, TypeScript, Angular, AngularJS, Node.js.',
        ],
      },
    ],
  },
  {
    track: 'Web · TypeScript / JavaScript',
    jobs: [
      {
        role: 'Frontend Developer (Angular)',
        company: 'via Upwork',
        place: 'Remote',
        dates: '2021 – 2026',
        points: [
          'Built a supply chain management tool for a goods manufacturer to coordinate products with contractors.',
          'Optimized the application using modern framework approaches.',
          'Migrated the entire frontend codebase to a new Angular version.',
          'Built a project harness for AI agents.',
        ],
      },
      {
        role: 'Frontend Angular Developer',
        company: 'Eagle6',
        place: 'Remote (via Upwork)',
        dates: '2019 – 2021',
        points: [
          'Developed a project management system for a U.S. defense-sector company, combining issue tracking, a wiki/knowledge base, internal messaging and a company structure tree (similar to Jira + Confluence + a messenger).',
        ],
      },
      {
        role: 'Frontend Developer (Angular)',
        company: 'Juravli',
        place: 'Remote',
        dates: '2022',
        points: ['Volunteer project — built a service for finding volunteers to help people affected by the war.'],
      },
      {
        role: 'Fullstack Developer (Angular / Node.js)',
        company: 'Plarium',
        place: 'Kharkiv, Ukraine',
        dates: '2018',
        points: [
          'Architected and built an image cataloging solution enabling seamless asset sharing between designers and programmers (Angular, Node.js, Google Auth).',
        ],
      },
      {
        role: 'Full-stack JavaScript / Python Developer',
        company: 'Edom',
        dates: '2011',
        points: [
          'Worked as a front-end (HTML/CSS/JS) and back-end (Python) developer.',
          'Developed the web client and the server for a security systems map.',
        ],
      },
    ],
  },
];

export const education = [
  { school: 'Kharkiv National University of Radio Electronics', degree: "Master's degree, System Programming", years: '2010 – 2015' },
];

export const languages = [
  { name: 'Ukrainian', level: 'Native' },
  { name: 'Russian', level: 'Native' },
  { name: 'English', level: 'Upper-Intermediate (B2)' },
  { name: 'Polish', level: 'Basic, learning' },
];

export const contacts = [
  { label: 'Email', text: links.email, href: `mailto:${links.email}` },
  { label: 'LinkedIn', text: 'linkedin.com/in/dimcore', href: links.linkedin },
  { label: 'GitHub', text: 'github.com/JustDimcore', href: links.github },
];

/** Shown under the role while looking for work; remove it (null) once hired. */
export const availability: { status: string; details: string[] } | null = {
  status: 'Open to new roles',
  details: ['Unity or frontend', 'Kraków / remote'],
};

/** CVs to download (public/cv/, printed to PDF from CVs/<name>.html). */
export const cvs = [
  { role: 'Unity Developer', note: 'Games · Unity, C#, .NET', href: '/cv/Dmytro_Ilchenko_CV_Unity.pdf' },
  { role: 'Frontend Developer', note: 'Web · TypeScript, Angular, React', href: '/cv/Dmytro_Ilchenko_CV_Frontend.pdf' },
];
