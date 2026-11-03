#!/usr/bin/env python3
"""
Extrae y optimiza los assets del cliente (mockup PDF + elementos gráficos) hacia src/assets/.
Los originales del cliente NO se versionan. Indicar su carpeta con la variable ENOTURISMO_ORIGEN.

Uso: ENOTURISMO_ORIGEN=/ruta/a/la/carpeta python3 scripts/extraer-assets.py   (requiere pdfimages de poppler y Pillow)
"""
import glob, os, subprocess, tempfile
from pathlib import Path
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

ORIGEN = Path(os.environ.get("ENOTURISMO_ORIGEN", "originales-cliente")).expanduser()
DESTINO = Path(__file__).resolve().parent.parent / "src/assets"


def recortar(im: Image.Image) -> Image.Image:
    """Recorta el margen transparente."""
    im = im.convert("RGBA")
    return im.crop(im.getbbox())


def guardar_webp(im: Image.Image, ruta: Path, ancho_max: int, calidad: int = 80) -> None:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    if im.width > ancho_max:
        im = im.resize((ancho_max, round(im.height * ancho_max / im.width)), Image.LANCZOS)
    im.save(ruta, "WEBP", quality=calidad, method=6)
    print(f"  {ruta.relative_to(DESTINO.parent.parent)}  {im.size}  {ruta.stat().st_size // 1024} KB")


def fotos() -> None:
    print("Fotos (PDF del mockup)")
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["pdfimages", "-png", "-f", "1", "-l", "1", str(ORIGEN / "Mockup/Enoturismo Inicio.pdf"), f"{tmp}/img"], check=True)
        # índice dentro del PDF -> (nombre, ancho máximo)
        mapa = {
            0: ("hero", 2000),
            1: ("vina-casa-rozas", 900),
            2: ("ecohotel-antuco", 900),
            5: ("alte-tour", 861),
            10: ("barricas", 900),
        }
        for idx, (nombre, ancho) in mapa.items():
            im = Image.open(f"{tmp}/img-{idx:03d}.png").convert("RGB")
            guardar_webp(im, DESTINO / f"fotos/{nombre}.webp", ancho, 78)


def logos() -> None:
    print("Logos")
    for n, nombre in {1: "logo-color", 5: "logo-blanco", 6: "logo-blanco-horizontal"}.items():
        im = recortar(Image.open(ORIGEN / f"Elementos gráficos/Logo/Enoturismo Biobío-{n:02d}.png"))
        guardar_webp(im, DESTINO / f"logo/{nombre}.webp", 900, 90)


def iconos() -> None:
    print("Iconos")
    nombres = {1: "vina", 2: "gastronomia", 3: "alojamiento", 4: "tour", 5: "transporte", 6: "otro", 9: "instagram"}
    for n, nombre in nombres.items():
        im = recortar(Image.open(ORIGEN / f"Elementos gráficos/Home/Home-{n:02d}.png"))
        guardar_webp(im, DESTINO / f"iconos/{nombre}.webp", 360, 90)


def decoracion() -> None:
    print("Hojas decorativas")
    # Home-07: hero (esquina superior izquierda). Home-08: footer (esquina inferior derecha, sin texto).
    # La hoja magenta de transición hero→"Explora" NO viene entre los archivos: se aproxima con SVG (TransicionHoja.astro).
    for n, nombre in {7: "hojas-hero", 8: "hojas-footer"}.items():
        im = recortar(Image.open(ORIGEN / f"Elementos gráficos/Home/Home-{n:02d}.png"))
        guardar_webp(im, DESTINO / f"deco/{nombre}.webp", 1200, 88)


if __name__ == "__main__":
    if not ORIGEN.exists():
        raise SystemExit(f"No existe la carpeta de origen: {ORIGEN} (definir ENOTURISMO_ORIGEN)")
    fotos(); logos(); iconos(); decoracion()
