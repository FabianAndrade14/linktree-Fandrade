import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/videos.js';

const previousKey = process.env.YOUTUBE_API_KEY;
const previousFetch = global.fetch;
afterEach(() => {
  if (previousKey === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = previousKey;
  global.fetch = previousFetch;
});

function makeResponse() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

const mkVideo = (id, title, views, publishedAt, duration = 'PT10M') => ({
  id,
  snippet: {
    title, description: `Descripción de ${title}`,
    publishedAt, liveBroadcastContent: 'none',
    thumbnails: { high: { url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` } }
  },
  statistics: { viewCount: String(views) },
  contentDetails: { duration },
  status: { privacyStatus: 'public' }
});

function mockSuccessfulFetch() {
  const calls = [];
  global.fetch = async url => {
    const parsed = new URL(url);
    calls.push(parsed);
    assert.equal(parsed.searchParams.get('key'), 'SECRET-TEST-KEY');
    let data;
    switch (parsed.pathname) {
      case '/youtube/v3/channels':
        assert.equal(parsed.searchParams.get('forHandle'), '@ancientfabian14');
        data = { items: [{ snippet: { title: 'FARIAN' }, contentDetails: { relatedPlaylists: { uploads: 'UU123' } } }] };
        break;
      case '/youtube/v3/playlistItems':
        assert.equal(parsed.searchParams.get('playlistId'), 'UU123');
        data = { items: ['ABCDEFGHIJK', 'LMNOPQRSTUV', 'WXYZ0123456', 'aaaaabbbbb1', 'zzzzz111112'].map(id => ({ contentDetails: { videoId: id } })) };
        break;
      case '/youtube/v3/videos':
        data = { items: [
          mkVideo('ABCDEFGHIJK', 'Nuevo análisis de Dragon Ball', 100, '2026-11-10T10:00:00Z'),
          mkVideo('LMNOPQRSTUV', 'Final Fantasy VII', 1500, '2026-11-09T10:00:00Z', 'PT15M33S'),
          mkVideo('WXYZ0123456', 'Spider-Man', 500, '2026-11-07T10:00:00Z'),
          mkVideo('aaaaabbbbb1', 'Zelda', 1000, '2026-11-06T10:00:00Z'),
          { ...mkVideo('zzzzz111112', 'Secreto', 9999, '2026-11-10T12:00:00Z'), status: { privacyStatus: 'private' } }
        ] };
        break;
      default: throw new Error(`Unexpected ${parsed.pathname}`);
    }
    return { ok: true, json: async () => data };
  };
  return calls;
}

test('solo permite GET', async () => {
  const res = makeResponse();
  await handler({ method: 'POST' }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'GET');
});

test('si falta API key, responde 503 sin divulgar secretos', async () => {
  delete process.env.YOUTUBE_API_KEY;
  const res = makeResponse();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, 'API de YouTube sin configurar en el servidor');
});

test('recupera último video y 3 destacados únicos por recencia y reproducciones', async () => {
  process.env.YOUTUBE_API_KEY = 'SECRET-TEST-KEY';
  const calls = mockSuccessfulFetch();
  const res = makeResponse();
  await handler({ method: 'GET' }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 3);
  assert.equal(res.body.featured.id, 'ABCDEFGHIJK');
  assert.equal(res.body.featured.url, 'https://www.youtube.com/watch?v=ABCDEFGHIJK');
  assert.equal(res.body.recommendations.length, 3);
  assert.equal(new Set(res.body.recommendations.map(v => v.id)).size, 3);
  assert.ok(res.body.recommendations.every(v => v.id !== 'ABCDEFGHIJK' && v.id !== 'zzzzz111112'));
  assert.equal(res.body.recommendations.find(v => v.id === 'LMNOPQRSTUV').durationSeconds, 933);
  assert.match(res.headers['Cache-Control'], /s-maxage=1800/);
  assert.ok(!JSON.stringify(res.body).includes('SECRET-TEST-KEY'));
});

test('maneja error de YouTube sin dejar expuesta la clave', async () => {
  process.env.YOUTUBE_API_KEY = 'SECRET-TEST-KEY';
  global.fetch = async () => ({ ok: false, status: 403 });
  const res = makeResponse();
  const prev = console.error;
  console.error = () => {};
  try { await handler({ method: 'GET' }, res); }
  finally { console.error = prev; }
  assert.equal(res.statusCode, 502);
  assert.match(res.body.error, /temporalmente/);
});
