from PIL import Image, ImageDraw, ImageEnhance
import pytesseract
import io

img = Image.new('RGB', (400, 200), color=(255, 255, 255))
d = ImageDraw.Draw(img)
d.text((10,10), "Rx: Azithromycin 500mg\n1 tablet daily for 5 days.", fill=(0,0,0))

# Without enhance
print("WITHOUT ENHANCE:")
print(repr(pytesseract.image_to_string(img).strip()))

# With enhance
img_enhanced = img.convert('L')
img_enhanced = ImageEnhance.Contrast(img_enhanced).enhance(2.0)
img_enhanced = ImageEnhance.Sharpness(img_enhanced).enhance(2.0)
print("WITH ENHANCE:")
print(repr(pytesseract.image_to_string(img_enhanced, config='--psm 6').strip()))

