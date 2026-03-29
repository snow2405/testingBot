// GET /api/auth/me - Get current user
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  try {
    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*, users(*)')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Check if user has an installation
    const { data: installation } = await supabase
      .from('installations')
      .select('installation_id')
      .eq('user_id', session.user_id)
      .single();

    res.json({
      user: {
        id: session.users.id,
        github_id: session.users.github_id,
        username: session.users.username,
      },
      hasInstallation: !!installation,
      installationId: installation?.installation_id || null,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
