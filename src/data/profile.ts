// Facts for the home page. Source: CVs/Dmytro_Ilchenko_CV_MASTER.html (only confirmed facts)
// and the public LinkedIn profile.

export const links = {
  projects: '/projects',
  email: 'dimcore.dev@gmail.com',
  linkedin: 'https://www.linkedin.com/in/dimcore/',
  github: 'https://github.com/JustDimcore',
};

export const stats = [
  { value: '14+', label: 'years in software engineering' },
  { value: '12+', label: 'years of commercial game development in Unity / C#' },
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

export const experience = [
  {
    years: '2022 – 2026',
    role: 'Unity Developer',
    company: 'HitZone',
    summary: 'Invokers: Titan Legacy — combat on ECS, a VFX pipeline for the art team, node-based scripting for ~1,000 character abilities, editor tools.',
  },
  {
    years: '2021 – 2022',
    role: 'Unity Developer',
    company: 'Room 8 Studio',
    summary: 'An Xbox port of an existing title in about six months; led a team of 4 on a mobile learning game.',
  },
  {
    years: '2018 – 2026',
    role: 'Frontend Developer (Angular)',
    company: 'Freelance',
    summary: 'A project management system for a U.S. defense-sector company, a supply chain tool, a volunteer service for people affected by the war.',
  },
  {
    years: '2014 – 2021',
    role: 'Unity / Frontend Developer',
    company: 'Plarium',
    summary: 'Raid: Shadow Legends, Stormfall: Rise of Balur, Soldiers Inc: Mobile Warfare, Nords: Heroes of the North; internal tools in Angular and Node.js.',
  },
  {
    years: '2011',
    role: 'Full-stack JavaScript / Python Developer',
    company: 'Edom',
    summary: 'Worked as a front-end (HTML/CSS/JS) and back-end (Python) developer. Developed the web client and the server for a security systems map.',
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
