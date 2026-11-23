# RayoFormato

Convertidor de archivos gratis en español: documentos, PDF, imágenes, audio y video.
Sitio: https://rayoprojects.com · Operado por Rayomaking (México).

## Cómo funciona

- Sitio estático (HTML, CSS y JavaScript), sin servidor propio: todas las conversiones ocurren en el navegador del usuario y los archivos no se suben.
- Se publica con Cloudflare Workers (static assets) cada vez que hay un cambio en la rama `main`.
- Las bibliotecas (pdf.js, pdf-lib, jsPDF, Tesseract, JSZip, etc.) se cargan bajo demanda desde cdnjs/jsdelivr.

## Estructura

- `*.html`: una página por herramienta; `guias/`: artículos.
- `common.js`, `docs.js`, `pdftools.js`, `images.js`, `audio.js`, `video.js`, `workflow.js`, `visa.js`, `report.js`: lógica de cada sección.
- `style.css`, `icons.svg`, `brand/`, favicons: diseño e identidad.
- `_redirects`: redirecciones 301 de páginas unidas.
- `sitemap.xml`, `robots.txt`, `ads.txt`: SEO y AdSense.

## Al publicar cambios

- No modificar `ads.txt` ni el script de AdSense en el `<head>`.
- Al cambiar CSS o JS, subir la versión `?v=` en todas las páginas para que se actualice la caché.
