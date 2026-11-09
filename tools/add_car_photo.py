"""Prepara la foto de un coche nuevo para Garage Legends.

Uso:
    python tools/add_car_photo.py RUTA_FOTO.jpg id-del-coche [desplazamiento_vertical]

Recorta la foto a 16:9, la guarda como img/cars/<id>.webp (1280x720) y la miniatura
img/cars/<id>-s.webp (480x270). El desplazamiento vertical (0 = arriba, 1 = abajo,
por defecto 0.55) sirve para centrar mejor el coche. Después añade el coche en js/data.js
con el mismo id y, si quieres que funcione sin conexión, añade las dos rutas en sw.js.
"""
import sys
from pathlib import Path
from PIL import Image

def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    src, car_id = sys.argv[1], sys.argv[2]
    oy = float(sys.argv[3]) if len(sys.argv) > 3 else 0.55
    out = Path(__file__).resolve().parent.parent / 'img' / 'cars'
    im = Image.open(src).convert('RGB')
    w, h = im.size
    tw, th = w, round(w * 9 / 16)
    if th > h:
        th, tw = h, round(h * 16 / 9)
    x, y = round((w - tw) / 2), round((h - th) * oy)
    crop = im.crop((x, y, x + tw, y + th))
    crop.resize((1280, 720), Image.LANCZOS).save(out / f'{car_id}.webp', 'WEBP', quality=78, method=6)
    crop.resize((480, 270), Image.LANCZOS).save(out / f'{car_id}-s.webp', 'WEBP', quality=72, method=6)
    print('Listo:', out / f'{car_id}.webp')

if __name__ == '__main__':
    main()
