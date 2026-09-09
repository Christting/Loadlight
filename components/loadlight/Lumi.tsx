import type { Mood } from '@/lib/loadlight/types';

const stateCopy: Record<Mood, string> = {
  calm: 'Lumi feels calm',
  steady: 'Lumi feels steady',
  tired: 'Lumi looks tired',
  stressed: 'Lumi is carrying a lot',
  overwhelmed: 'Lumi feels overwhelmed',
  recovering: 'Lumi is making room to recover',
  focused: 'Lumi is focused on the plan',
  thinking: 'Lumi is thinking it through',
  relieved: 'Lumi feels relieved',
  sleepy: 'Lumi needs rest',
  hello: 'Lumi says hello',
};

const stateImage: Record<Mood, string> = {
  calm: 'calm.webp',
  steady: 'steady.webp',
  tired: 'tired.webp',
  stressed: 'stressed.webp',
  overwhelmed: 'overwhelmed.webp',
  recovering: 'recovering.webp',
  focused: 'focused.png',
  thinking: 'thinking.png',
  relieved: 'relieved.png',
  sleepy: 'sleepy.png',
  hello: 'hello.png',
};

export function Lumi({ state, size = 'large', message }: { state: Mood; size?: 'tiny' | 'small' | 'large'; message?: string }) {
  return (
    <figure className={`lumi-slot lumi-${size}`} aria-label={stateCopy[state]}>
      <img src={`/lumi/${stateImage[state]}`} alt={stateCopy[state]} />
      {message && <figcaption>{message}</figcaption>}
    </figure>
  );
}
