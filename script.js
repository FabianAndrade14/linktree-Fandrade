const songs = [
  { src: 'assets/audio/track1.mp3', title: 'Love from the Other Side', artist: 'Fall Out Boy' },
  { src: 'assets/audio/track2.mp3', title: 'Dream Catch Me', artist: 'Newton Faulkner' },
  { src: 'assets/audio/track3.mp3', title: 'Quiet Town', artist: 'The Killers' },
  { src: 'assets/audio/track4.mp3', title: 'Kakariko Village', artist: 'Sleeping Phoenix' }
];

const audio = new Audio();
const musicBtn = document.getElementById('musicBtn');
const musicIcon = musicBtn.querySelector('i');
const tooltip = document.getElementById('music-tooltip');
let currentSong = null;
let previousIndex = -1;
let tooltipTimeout;

function showTooltip(message) {
  clearTimeout(tooltipTimeout);
  tooltip.textContent = message;
  tooltip.classList.add('show');
  tooltipTimeout = setTimeout(() => tooltip.classList.remove('show'), 4000);
}

function setPlayingUI(playing) {
  musicBtn.classList.toggle('is-playing', playing);
  musicBtn.setAttribute('aria-pressed', String(playing));
  musicBtn.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
  musicIcon.className = playing ? 'bi bi-pause-fill' : 'bi bi-music-note-beamed';
}

function selectRandomSong() {
  let index = Math.floor(Math.random() * songs.length);
  if (songs.length > 1 && index === previousIndex) index = (index + 1) % songs.length;
  previousIndex = index;
  currentSong = songs[index];
  audio.src = currentSong.src;
}

musicBtn.addEventListener('click', async () => {
  if (!audio.paused) {
    audio.pause();
    setPlayingUI(false);
    showTooltip('Música en pausa');
    return;
  }

  // Reanuda la canción pausada. Solo elige otra cuando termina la anterior.
  if (!currentSong || audio.ended) selectRandomSong();

  try {
    await audio.play();
    setPlayingUI(true);
    showTooltip(`${currentSong.title} — ${currentSong.artist}`);
  } catch (error) {
    setPlayingUI(false);
    showTooltip('No se encontró el audio. Revisa assets/audio.');
    console.error('Error al reproducir audio:', error);
  }
});

audio.addEventListener('ended', () => {
  setPlayingUI(false);
  currentSong = null;
  showTooltip('Fin de la canción. Pulsa para escuchar otra.');
});
audio.addEventListener('error', () => {
  setPlayingUI(false);
  if (audio.src) showTooltip('No se pudo cargar esta pista.');
});

document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Videos dinámicos de YouTube ----------
// Este endpoint funciona al desplegar el proyecto en Vercel y configurar
// YOUTUBE_API_KEY como variable de entorno (nunca en el código del navegador).
const VIDEO_CACHE_KEY = 'farian:youtube-videos:v1';
const VIDEO_CACHE_MS = 30 * 60 * 1000;
const videoGrid = document.getElementById('videos-grid');
const videoMessage = document.getElementById('videos-message');

function validVideo(video) {
  return video && typeof video.id === 'string' && /^[\w-]{11}$/.test(video.id);
}

function safeThumbnail(video) {
  const url = String(video.thumbnail || '');
  return /^https:\/\/(?:i\.ytimg\.com|img\.youtube\.com)\//.test(url)
    ? url
    : `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
}

function formatDuration(seconds) {
  seconds = Math.max(0, Math.floor(Number(seconds) || 0));
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const secs = seconds % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : `${minutes}:${String(secs).padStart(2, '0')}`;
}

function publishedAgo(isoDate) {
  const ms = new Date(isoDate).getTime();
  if (!Number.isFinite(ms)) return '';
  const days = Math.max(0, Math.floor((Date.now() - ms) / 86400000));
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  if (days < 365) return `Hace ${Math.floor(days / 30)} mes(es)`;
  return `Hace ${Math.floor(days / 365)} año(s)`;
}

function makeVideoCard(video) {
  const link = document.createElement('a');
  link.className = 'video-card';
  link.href = `https://www.youtube.com/watch?v=${video.id}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `Ver ${video.title || 'video'} en YouTube`);

  const cover = document.createElement('span');
  cover.className = 'video-cover';

  const thumb = document.createElement('img');
  thumb.src = safeThumbnail(video);
  thumb.alt = '';
  thumb.loading = 'lazy';
  thumb.decoding = 'async';
  thumb.onerror = () => { thumb.style.display = 'none'; };
  cover.append(thumb);

  const play = document.createElement('span');
  play.className = 'video-play';
  play.setAttribute('aria-hidden', 'true');
  play.innerHTML = '<i class="bi bi-play-fill"></i>';
  cover.append(play);

  const duration = formatDuration(video.durationSeconds);
  if (duration) {
    const time = document.createElement('span');
    time.className = 'video-duration';
    time.textContent = duration;
    cover.append(time);
  }

  const info = document.createElement('span');
  info.className = 'video-text';
  const title = document.createElement('span');
  title.className = 'video-title';
  title.textContent = video.title || 'Nuevo video';
  const meta = document.createElement('span');
  meta.className = 'video-meta';
  const count = document.createElement('span');
  count.textContent = `${new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(video.views || 0)} visualizaciones`;
  const date = document.createElement('span');
  date.textContent = publishedAgo(video.publishedAt);
  meta.append(count, date);
  info.append(title, meta);
  link.append(cover, info);
  return link;
}

function displayVideos(data) {
  if (validVideo(data.featured)) {
    const video = data.featured;
    const featuredImage = document.getElementById('featured-thumbnail');
    const fallbackImage = () => {
      featuredImage.hidden = true;
      featuredImage.removeAttribute('src');
    };
    featuredImage.onerror = fallbackImage;
    featuredImage.src = safeThumbnail(video);
    featuredImage.hidden = false;

    const link = document.getElementById('featured-link');
    link.href = `https://www.youtube.com/watch?v=${video.id}`;
    link.setAttribute('aria-label', `Ver el video más reciente: ${video.title}`);
    document.getElementById('featured-title').textContent = video.title;
    document.getElementById('featured-label').textContent = 'MI ÚLTIMO VIDEO';
    document.getElementById('featured-description').textContent = `${publishedAgo(video.publishedAt)} · ${new Intl.NumberFormat('es-CO').format(video.views || 0)} visualizaciones`;
    document.getElementById('featured-action').textContent = 'Ver en YouTube';
  }

  videoGrid.replaceChildren();
  const recommendations = (Array.isArray(data.recommendations) ? data.recommendations : [])
    .filter(validVideo)
    .filter(v => v.id !== data.featured?.id)
    .slice(0, 3);
  for (const video of recommendations) videoGrid.append(makeVideoCard(video));
  videoGrid.setAttribute('aria-busy', 'false');
  videoMessage.textContent = recommendations.length ? '' : 'Encuentra más videos directamente en mi canal de YouTube.';
}

function videosFallback(message) {
  videoGrid.replaceChildren();
  videoGrid.setAttribute('aria-busy', 'false');
  videoMessage.textContent = message;
}

function readVideoCache() {
  try {
    const stored = JSON.parse(localStorage.getItem(VIDEO_CACHE_KEY) || 'null');
    return stored && validVideo(stored.data?.featured) ? stored : null;
  } catch { return null; }
}

async function loadYouTubeVideos() {
  const cached = readVideoCache();
  if (cached) {
    displayVideos(cached.data);
    if (Date.now() - cached.savedAt < VIDEO_CACHE_MS) return;
  }

  try {
    const response = await fetch('/api/videos', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!validVideo(data.featured)) throw new Error('No se encontraron videos públicos en el canal');
    displayVideos(data);
    try { localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* almacenamiento deshabilitado */ }
  } catch (error) {
    console.warn('[FARIAN] Videos dinámicos no disponibles:', error.message);
    if (cached) {
      videoMessage.textContent = 'Mostrando la última selección guardada; no fue posible actualizarla.';
    } else {
      videosFallback('Ahora mismo no pude cargar los videos. Puedes verlos desde el enlace de mi canal.');
    }
  }
}

loadYouTubeVideos();
