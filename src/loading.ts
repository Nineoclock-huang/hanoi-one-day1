import cafeMobile from '../public/optimized/cafe-800.webp';
import cafeDesktop from '../public/optimized/cafe-1600.webp';
let cityModule: Promise<typeof import('./cityRenderer')> | undefined;
export function loadCity() {
  return cityModule ??= import('./cityRenderer').catch(error => {
    cityModule = undefined;
    throw error;
  });
}
export const asset = (name: string) => `${import.meta.env.BASE_URL}optimized/${name}`;
export function lacSpriteName(mood: 'neutral' | 'listening' | 'happy' | 'clarify' | 'impatient', size: 448 | 768) {
  const pose = mood === 'impatient' ? 'clarify' : mood;
  return `lac-cozy${pose === 'neutral' ? '' : `-${pose}`}-${size}.webp`;
}
export function danSpriteName(mood: 'neutral' | 'listening' | 'happy' | 'clarify' | 'impatient', size: 448 | 768) {
  const pose = mood === 'clarify' ? 'impatient' : mood;
  return `dan-cozy${pose === 'neutral' ? '' : `-${pose}`}-${size}.webp`;
}
const warmed = new Set<string>();
export function warmImage(name: string, url = asset(name),priority:'high'|'low'='low') {
  if (warmed.has(name)) return;
  warmed.add(name);
  const image = new Image();
  image.decoding = priority==='high'?'sync':'async';
  image.fetchPriority = priority;
  image.onerror = () => warmed.delete(name);
  image.src = url;
}
export function warmCafe(includeRush=false) {
  const mobile = window.innerWidth <= 760;
  const size=mobile?448:768;
  warmImage(lacSpriteName('neutral', size),undefined,'high');
  for(const mood of ['listening', 'happy', 'clarify'] as const) warmImage(lacSpriteName(mood, size));
  if(includeRush){warmImage(danSpriteName('neutral',size),undefined,'high');for(const mood of ['listening', 'happy', 'impatient'] as const)warmImage(danSpriteName(mood,size));}
  warmImage('cafe-' + (mobile ? 'mobile' : 'desktop'), mobile ? cafeMobile : cafeDesktop);
}
