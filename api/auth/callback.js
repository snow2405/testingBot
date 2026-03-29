// GET /api/auth/callback - GitHub OAuth callback
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;

  if (!code) {
    return res.redirect(`${process.env.APP_URL}/login?error=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.redirect(`${process.env.APP_URL}/login?error=${tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const userData = await userResponse.json();

    // Upsert user in Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        github_id: userData.id,
        username: userData.login,
        access_token: accessToken,
      }, {
        onConflict: 'github_id',
      })
      .select()
      .single();

    if (userError) {
      console.error('User upsert error:', userError);
      return res.redirect(`${process.env.APP_URL}/login?error=db_error`);
    }

    // Create session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        token: sessionToken,
        expires_at: expiresAt.toISOString(),
      });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return res.redirect(`${process.env.APP_URL}/login?error=session_error`);
    }

    // Redirect with session token
    res.redirect(`${process.env.APP_URL}/dashboard?token=${sessionToken}`);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect(`${process.env.APP_URL}/login?error=unknown`);
  }
}
