export const cameraTransitionDuration = (reducedMotion: boolean) => reducedMotion ? 0 : 720;

export function easeInOutCubic(progress: number) {
  const value=Math.max(0,Math.min(1,progress));
  return value<.5?4*value*value*value:1-Math.pow(-2*value+2,3)/2;
}
