/**
 * GET /api/videos
 * Vercel Function. Consulta datos públicos del canal de FARIAN usando YouTube Data API v3.
 * La clave solo se lee en el servidor desde YOUTUBE_API_KEY.
 */

const API_ROOT = 'https://www.googleapis.com/youtube/v3';
const HANDLE = process.env.YOUTUBE_CHANNEL_HANDLE || '@ancientfabian14';
const VIDEO_ID = /^[\w-]{11}$/;

async function youtubeRequest(endpoint, query, apiKey) {
  const url = new URL(`${API_ROOT}/${endpoint}`);
  Object.entries({ ...query, key: apiKey }).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const result = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(9000)
  });
  if (!result.ok) {
    // No registrar URL ni API key en los logs.
    throw new Error(`YouTube ${endpoint}: HTTP ${result.status}`);
  }
  return result.json();
}

function getDurationSeconds(isoString = '') {
  // Duración ISO 8601 que devuelve YouTube: PT1H23M45S
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(isoString);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

function makeVideo(item) {
  const id = item.id;
  if (!VIDEO_ID.test(id) || item.status?.privacyStatus !== 'public') return null;
  if (item.snippet?.liveBroadcastContent === 'upcoming') return null;

  const images = item.snippet?.thumbnails || {};
  const thumbnail = images.maxres?.url || images.standard?.url || images.high?.url || images.medium?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const safeThumbnail = /^https:\/\/(?:i\.ytimg\.com|img\.youtube\.com)\//.test(thumbnail)
    ? thumbnail
    : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return {
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: String(item.snippet?.title || 'Video de FARIAN'),
    thumbnail: safeThumbnail,
    publishedAt: item.snippet?.publishedAt || null,
    description: String(item.snippet?.description || '').slice(0, 250),
    views: Number(item.statistics?.viewCount || 0),
    durationSeconds: getDurationSeconds(item.contentDetails?.duration)
  };
}

function chooseRecommendations(videos, featuredId, nowMs = Date.now()) {
  // «Relevantes» significa populares y relativamente recientes dentro de las
  // últimas 30 publicaciones; no son recomendaciones personalizadas de YouTube.
  return videos
    .filter(video => video.id !== featuredId)
    .map(video => {
      const age = Math.max(0, (nowMs - new Date(video.publishedAt || 0).getTime()) / 86400000);
      const popularity = Math.log10(video.views + 1);
      const recency = Math.exp(-age / 120);
      return { video, score: popularity * .7 + recency * 1.5 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ video }) => video);
}

export default async function handler(request, response) {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Método no permitido' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return response.status(503).json({ error: 'API de YouTube sin configurar en el servidor' });
  }

  try {
    const channelData = await youtubeRequest('channels', {
      part: 'contentDetails,snippet',
      forHandle: HANDLE
    }, apiKey);

    const channel = channelData.items?.[0];
    const playlistId = channel?.contentDetails?.relatedPlaylists?.uploads;
    if (!playlistId) throw new Error('El canal no se pudo resolver o no tiene lista de publicaciones');

    const playlistData = await youtubeRequest('playlistItems', {
      part: 'contentDetails',
      playlistId,
      maxResults: 30
    }, apiKey);

    const ids = [...new Set((playlistData.items || [])
      .map(item => item.contentDetails?.videoId)
      .filter(id => VIDEO_ID.test(id || '')))];

    if (!ids.length) {
      response.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=600');
      return response.status(200).json({ channel: HANDLE, featured: null, recommendations: [], updatedAt: new Date().toISOString() });
    }

    const videoData = await youtubeRequest('videos', {
      part: 'snippet,statistics,contentDetails,status',
      id: ids.join(','),
      maxResults: 50
    }, apiKey);

    const videos = (videoData.items || [])
      .map(makeVideo)
      .filter(Boolean)
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    const featured = videos[0] || null;
    const recommendations = featured ? chooseRecommendations(videos, featured.id) : [];
    response.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=600');
    return response.status(200).json({
      channel: channel.snippet?.title || HANDLE,
      featured,
      recommendations,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[api/videos] No fue posible cargar el canal:', error.message);
    response.setHeader('Cache-Control', 'no-store');
    return response.status(502).json({ error: 'YouTube no está disponible temporalmente' });
  }
}
