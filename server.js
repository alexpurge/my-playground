import { createServer } from 'node:http';
import { URL } from 'node:url';

const port = Number(globalThis.process?.env?.PORT || 8787);

const writeJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(payload));
};

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return writeJson(res, 200, { ok: true, message: 'Server running. Webhook bridge removed; dashboard uses direct polling.' });
  }

  return writeJson(res, 404, { ok: false, message: 'Not found' });
});

server.listen(port, () => {
  console.log(`Dashboard helper server running on :${port}`);
});
