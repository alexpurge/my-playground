import http from 'node:http';

const PORT = Number(globalThis.process?.env?.PORT || 8787);

<<<<<<< HEAD
const writeJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
=======
const writeJson = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
>>>>>>> parent of a898c37 (Add Stripe webhook bridge and onboarding celebration flow)
  });
  res.end(JSON.stringify(payload));
};

<<<<<<< HEAD
const server = http.createServer((req, res) => {
=======
const server = createServer((req, res) => {
>>>>>>> parent of a898c37 (Add Stripe webhook bridge and onboarding celebration flow)
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
<<<<<<< HEAD
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    writeJson(res, 200, { ok: true, message: 'Server running.' });
    return;
  }

  writeJson(res, 404, {
    ok: false,
    message: 'Not found.',
  });
=======
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return writeJson(res, 200, { ok: true, message: 'Server running. Webhook bridge removed; dashboard uses direct polling.' });
  }

  return writeJson(res, 404, { ok: false, message: 'Not found' });
>>>>>>> parent of a898c37 (Add Stripe webhook bridge and onboarding celebration flow)
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
