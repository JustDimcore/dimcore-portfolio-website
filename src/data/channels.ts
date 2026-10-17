import { projects } from './projects';

/** A channel on the TV: a project video and what to call it in the caption. */
export interface TvChannel {
  /** None for a project under NDA: the channel shows snow and "NO SIGNAL". */
  video?: string;
  title: string;
  /** Where to watch the full trailer. */
  link?: string;
}

const toChannel = ({ video, title, link }: (typeof projects)[number]): TvChannel => ({ video, title, link });

/** The home page TV: only projects there is something to show from. */
export const channels: TvChannel[] = projects.filter((p) => p.video).map(toChannel);

/** The Projects page TV: every project, the ones under NDA as static. */
export const projectChannels: TvChannel[] = projects.map(toChannel);
