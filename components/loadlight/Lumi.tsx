import type { Mood } from '@/lib/loadlight/types';

const stateCopy: Record<Mood, string> = {
  calm: 'Lumi feels calm',
  steady: 'Lumi feels steady',
  tired: 'Lumi looks tired',
  stressed: 'Lumi is carrying a lot',
  overwhelmed: 'Lumi feels overwhelmed',
  recovering: 'Lumi is making room to recover',
};

export function Lumi({ state, size = 'large', message }: { state: Mood; size?: 'tiny' | 'small' | 'large'; message?: string }) {
  return (
    <figure className={`lumi-slot lumi-${size}`} aria-label={stateCopy[state]}>
      <img src={`/lumi/${state}.webp`} alt={stateCopy[state]} />
      {message && <figcaption>{message}</figcaption>}
    </figure>
  );
}
