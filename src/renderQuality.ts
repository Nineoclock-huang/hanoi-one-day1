// Cap raster work on high-DPI phones; retain the same buildings and landmarks.
export function renderQuality(width: number, pixelRatio: number) {
  void width;
  return { pixelRatio: Math.min(pixelRatio || 1, 1.5), shadowSize: 2048 };
}
