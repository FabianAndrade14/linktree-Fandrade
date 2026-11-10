# FARIAN — Linktree con videos automáticos

Basado en el Linktree anterior de FARIAN. Conserva los enlaces y el reproductor; agrega:

- **Mi último video:** el video público más reciente de `@ancientfabian14` (se actualiza automáticamente).
- **También te puede gustar:** tres videos seleccionados entre las 30 publicaciones más recientes. La selección combina **visualizaciones** y **recencia**; no es una recomendación personalizada de YouTube.
- **Carga inteligente:** caché de 30 minutos y respaldo de enlaces cuando falla la API.
- **Seguridad:** la clave de YouTube nunca aparece en el código del navegador.

## Instalar en Vercel

1. Conserva tu carpeta original `assets/` junto a los archivos nuevos. El ZIP no incluye tus fotos ni archivos de música, porque no estaban en el proyecto compartido.
2. Sube el contenido del ZIP a la **raíz** del repositorio que publicas en Vercel. El archivo `api/videos.js` debe estar en una carpeta `api/` en la raíz (no dentro de `assets/`).
3. En [Google Cloud Console](https://console.cloud.google.com/), crea o selecciona un proyecto, **habilita YouTube Data API v3** y crea una clave de API. Restringe su uso a **YouTube Data API v3**. Para una clave usada desde Vercel Functions, no configures una restricción de sitio web (referrer) porque las solicitudes salen del servidor; si usas restricciones de IP necesitarás una IP de salida fija.
4. En **Vercel → tu proyecto → Settings → Environment Variables**, crea `YOUTUBE_API_KEY` con esa clave (sin comillas). Opcionalmente configura `YOUTUBE_CHANNEL_HANDLE=@ancientfabian14`.
5. Haz **Redeploy** después de agregar la variable de entorno.
6. Abre `https://TU_DOMINIO/api/videos`: debe aparecer un JSON con `featured` y `recommendations`. Después abre el Linktree normalmente.

**Importante:** Abrir `index.html` con doble clic o servirlo mediante un servidor estático local no ejecuta `api/videos.js`. Para probar el endpoint localmente, usa `vercel dev` con las variables de entorno configuradas. El frontend mostrará un mensaje y conservará el enlace a YouTube si el endpoint no está disponible.

## Personalización

- Cambiar canal: edita `YOUTUBE_CHANNEL_HANDLE` en Vercel.
- Cambiar número de tarjetas: modifica `.slice(0, 3)` en `api/videos.js` y `script.js`.
- Cambiar criterios de selección: función `chooseRecommendations()` en `api/videos.js`.
- Cambiar frecuencia: `s-maxage=1800` (servidor) y `VIDEO_CACHE_MS` (navegador).
- Mantén en tu repositorio `assets/img/Profile.jpg`, `assets/img/deku.ico` y `assets/audio/track1.mp3` hasta `track4.mp3`.

## Sin clave o con problemas en YouTube

El sitio **no se rompe**: deja visible el bloque estático de presentación (sin marcarlo como último video) y el acceso directo al canal. Los videos dinámicos solo funcionan después de la configuración de API.

## Pruebas

Ejecuta `npm test` con Node.js 20+.
