// Gets a new Spotify refresh token for the Now Playing proxy.
//
// Run it with the proxy's env file, which holds SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET:
//   node --env-file=<path to proxy-server/.env> get-spotify-token.cjs
//
// It prints a Spotify sign-in link and waits on http://127.0.0.1:3000/callback, which must be
// listed as a redirect URI in the Spotify app. After you approve, it swaps the code for a
// refresh token and saves it to ~/.spotify-refresh-token, readable only by you. The token is
// never printed. Delete that file once the token is in Vercel.

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const PORT = 3000;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = ['user-read-currently-playing', 'user-read-playback-state', 'user-read-recently-played'];
const TOKEN_FILE = path.join(os.homedir(), '.spotify-refresh-token');

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET.');
    console.error('Run: node --env-file=<path to proxy-server/.env> get-spotify-token.cjs');
    process.exit(1);
}

const state = crypto.randomBytes(16).toString('hex');
const authUrl = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    state,
    show_dialog: 'true',
});

const exchangeCode = async (code) => {
    const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }).toString(),
    });
    const tokens = await response.json().catch(() => ({}));
    if (!response.ok || !tokens.refresh_token) {
        const reason = [tokens.error, tokens.error_description].filter(Boolean).join(': ') || response.statusText;
        throw new Error(`Spotify refused the code (${response.status} ${reason})`);
    }
    return tokens;
};

// Removes whatever is at the path (a symlink is removed, not followed), then creates the
// file fresh with owner-only permissions, so the token is never readable by anyone else.
const saveToken = (token) => {
    fs.rmSync(TOKEN_FILE, { force: true });
    fs.writeFileSync(TOKEN_FILE, token, { mode: 0o600, flag: 'wx' });
};

const reply = (res, status, message, onSent) => {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', Connection: 'close' });
    res.end(`${message}\n`, onSent);
};

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, REDIRECT_URI);
    if (url.pathname !== '/callback') return reply(res, 404, 'Not found.');
    if (url.searchParams.get('state') !== state) return reply(res, 400, 'This link is from another run. Use the newest link in the terminal.');

    const authError = url.searchParams.get('error');
    const code = url.searchParams.get('code');
    const finish = (exitCode) => () => {
        process.exitCode = exitCode;
        server.close();
    };
    try {
        if (authError) throw new Error(`Spotify sign-in was not approved (${authError})`);
        if (!code) throw new Error('Spotify sent no code');
        const tokens = await exchangeCode(code);
        saveToken(tokens.refresh_token);
        console.log(`\nSaved the refresh token to ${TOKEN_FILE}`);
        console.log(`Scopes granted: ${tokens.scope}`);
        console.log('\nNext: put it in the proxy on Vercel, then delete the file:');
        console.log(`  vercel env update SPOTIFY_REFRESH_TOKEN production --yes --cwd <path to proxy-server> < ${TOKEN_FILE}`);
        console.log(`  rm ${TOKEN_FILE}`);
        reply(res, 200, 'Done. The refresh token is saved. You can close this tab and go back to the terminal.', finish(0));
    } catch (error) {
        console.error(`\n${error.message}`);
        reply(res, 500, `${error.message}. Check the terminal.`, finish(1));
    }
});

server.on('error', (error) => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${PORT} is busy. Close whatever is using it and run this again.` : error.message);
    process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('Open this link, sign in to Spotify and approve:\n');
    console.log(authUrl);
    console.log(`\nWaiting on ${REDIRECT_URI} ...`);
});
