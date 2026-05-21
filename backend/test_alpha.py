from PIL import Image, ImageDraw, ImageEnhance
import pytesseract

img = Image.new('RGBA', (400, 200), color=(255, 255, 255, 0)) # Transparent background
d = ImageDraw.Draw(img)
d.text((10,10), "Rx: Azithromycin 500mg\n1 tablet daily for 5 days.", fill=(0,0,0, 255)) # Black text

# Convert directly to 'L'
img_L = img.convert('L')
img_L.save('test_transparent_L.jpg')

print("OCR Result:", repr(pytesseract.image_to_string(img_L).strip()))