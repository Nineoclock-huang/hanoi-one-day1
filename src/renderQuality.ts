// Cap raster work on high-DPI phones; retain the same buildings and landmarks.
export function renderQuality(width: number, pixelRatio: number) {
  const mobile = width <= 760;
  return { pixelRatio: Math.min(pixelRatio || 1, mobile ? 1 : 1.5), shadowSize: mobile ? 1024 : 2048, frameInterval: mobile ? 50 : 33 };
}
