// Facts for the home page. Source: CVs/Dmytro_Ilchenko_CV_MASTER.html (only confirmed facts)
// and the public LinkedIn profile.

export const links = {
  projects: '/projects',
  email: 'dimcore.dev@gmail.com',
  linkedin: 'https://www.linkedin.com/in/dimcore/',
  github: 'https://github.com/JustDimcore',
};

export const stats = [
  { value: '15', label: 'years in software engineering' },   // since mid-2011
  { value: '12', label: 'years of commercial game development in Unity / C#' },
  { value: '9', label: 'years of web development in TypeScript / Angular' },
];

export const skills: { title: string; items: string[] }[] = [
  { title: 'Languages', items: ['C#', 'TypeScript', 'JavaScript', 'C++', 'SQL', 'HTML', 'CSS / SCSS'] },
  {
    title: 'Game development',
    items: ['Unity', '.NET', 'ECS', 'Unity Physics', 'Multithreading', 'Editor tooling (IMGUI, Odin Inspector)', 'Node-based visual scripting', 'FMOD', 'Input systems'],
  },
  { title: 'Game UI', items: ['uGUI', 'NGUI', 'Doozy UI', 'MVVM / data binding'] },
  {
    title: 'Web',
    items: ['Angular', 'AngularJS', 'React', 'RxJS', 'NgRx', 'NGXS', 'Redux', 'Angular Material', 'Tailwind CSS', 'Bootstrap'],
  },
  { title: 'Backend & data', items: ['Node.js', 'Express.js', 'REST APIs', 'WebSockets', 'GraphQL', 'PostgreSQL', 'Google Auth'] },
  {
    title: '3D & graphics',
    items: ['Three.js', 'WebGL', 'Blender', 'Autodesk Fusion', 'VFX and animation pipelines', 'Asset optimization'],
  },
  {
    title: 'Architecture',
    items: ['OOP', 'SOLID', 'Design patterns', 'Modular architecture', 'State management', 'Profiling and optimization', 'Memory management'],
  },
  { title: 'Platforms', items: ['Android', 'iOS', 'Windows', 'macOS', 'Xbox'] },
  {
    title: 'Tools',
    items: ['Git', 'SVN', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Docker', 'Jest', 'Playwright', 'Cypress', 'Claude Code', 'Codex', 'GitHub Copilot'],
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
        dates: 'Oct 2022 – Sep 2026',
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
        dates: 'Feb 2021 – Oct 2022',
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
        place: 'Kharkiv region, Ukraine',
        dates: 'Apr 2014 – Jan 2021',
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
        dates: 'Oct 2021 – Jan 2026',
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
        dates: 'Jan 2019 – Oct 2021',
        points: [
          'Developed a project management system for a U.S. defense-sector company, combining issue tracking, a wiki/knowledge base, internal messaging and a company structure tree (similar to Jira + Confluence + a messenger).',
        ],
      },
      {
        role: 'Frontend Developer (Angular)',
        company: 'Juravli',
        place: 'Remote',
        dates: 'May 2022 – Aug 2022',
        points: ['Volunteer project — built a service for finding volunteers to help people affected by the war.'],
      },
      {
        role: 'Fullstack Developer (Angular / Node.js)',
        company: 'Plarium',
        place: 'Kharkiv region, Ukraine',
        dates: 'Jun 2018 – Nov 2018',
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
