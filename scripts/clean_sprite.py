from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter


root = Path(__file__).resolve().parents[1]
source = root / "public" / "lac-clerk-clean.png"
output = root / "public" / "lac-clerk-final.png"
qa_light = root / ".sites-runtime" / "lac-qa-light.png"
qa_dark = root / ".sites-runtime" / "lac-qa-dark.png"

rgba = np.array(Image.open(source).convert("RGBA"))
rgb = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGB2BGR)
height, width = rgb.shape[:2]

mask = np.full((height, width), cv2.GC_PR_BGD, dtype=np.uint8)
mask[rgba[:, :, 3] == 0] = cv2.GC_BGD

# The person occupies the central portrait silhouette. These high-confidence
# regions teach GrabCut the foreground without forcing the surrounding glow in.
mask[int(height * .13):int(height * .92), int(width * .28):int(width * .72)] = cv2.GC_PR_FGD
mask[int(height * .38):height, int(width * .08):int(width * .92)] = cv2.GC_PR_FGD
mask[int(height * .28):int(height * .82), int(width * .37):int(width * .63)] = cv2.GC_FGD

background_model = np.zeros((1, 65), np.float64)
foreground_model = np.zeros((1, 65), np.float64)
cv2.grabCut(rgb, mask, None, background_model, foreground_model, 10, cv2.GC_INIT_WITH_MASK)

foreground = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
foreground = cv2.morphologyEx(foreground, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
alpha = Image.fromarray(foreground).filter(ImageFilter.GaussianBlur(.7))

result = Image.fromarray(rgba[:, :, :3], "RGB").convert("RGBA")
result.putalpha(alpha)
result.save(output)

qa_light.parent.mkdir(parents=True, exist_ok=True)
for color, path in [((244, 234, 217, 255), qa_light), ((55, 35, 30, 255), qa_dark)]:
    backdrop = Image.new("RGBA", result.size, color)
    backdrop.alpha_composite(result)
    backdrop.save(path)

print(output)
