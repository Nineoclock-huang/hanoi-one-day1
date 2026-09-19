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
const warmed = new Set<string>();
export function warmImage(name: string, url = asset(name)) {
  if (warmed.has(name)) return;
  warmed.add(name);
  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = 'low';
  image.onerror = () => warmed.delete(name);
  image.src = url;
}
export function warmCafe() {
  const mobile = window.innerWidth <= 760;
  const size=mobile?448:768;
  for(const mood of ['', '-listening', '-happy', '-clarify'])warmImage(`clerk${mood}-${size}.webp`);
  warmImage('cafe-' + (mobile ? 'mobile' : 'desktop'), mobile ? cafeMobile : cafeDesktop);
}
