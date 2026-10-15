/** A channel on the hero TV: a project video and what to call it in the caption. */
export interface TvChannel {
  video: string;
  title: string;
  /** Where to watch the full trailer. */
  link?: string;
}

// Projects I worked on, newest first. Videos are 640x480, muted loops.
export const channels: TvChannel[] = [
  { video: '/video/invokers.mp4', title: 'Invokers: Titan Legacy', link: 'https://youtu.be/Z-6WQJ7YP4g' },
  { video: '/video/raid.mp4', title: 'Raid: Shadow Legends', link: 'https://youtu.be/gmwbHdJLadE' },
  { video: '/video/soldier-inc.mp4', title: 'Soldiers Inc: Mobile Warfare', link: 'https://youtu.be/g8gEZ74HxcQ' },
  { video: '/video/nords.mp4', title: 'Nords: Heroes of the North', link: 'https://youtu.be/FUVT2KN-Af4' },
];
