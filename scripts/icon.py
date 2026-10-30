from pathlib import Path
from PIL import Image, ImageDraw

size = 512
image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((24, 24, 488, 488), radius=128, fill='#246f5b')
for offset in (0, 70, 140):
    y = 157 + offset
    if offset == 0:
        draw.line([(134, y), (256, y-67), (378, y), (256, y+67), (134, y)], fill='#ffffff', width=22, joint='curve')
    else:
        draw.line([(134, y), (256, y+67), (378, y)], fill='#ffffff', width=22, joint='curve')
Path('resources').mkdir(exist_ok=True)
image.save('resources/icon.png')
image.save('resources/icon.ico', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
