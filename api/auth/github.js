// POST /api/auth/github - Initiate GitHub OAuth
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL}/api/auth/callback`;
  const scope = 'read:user user:email';

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

  res.json({ url: authUrl });
}
