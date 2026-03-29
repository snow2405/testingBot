// GET /api/install/callback - GitHub App installation callback
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { installation_id, setup_action } = req.query;

  if (!installation_id) {
    return res.redirect(`${process.env.APP_URL}/connect?error=no_installation_id`);
  }

  // Get user from state parameter or session cookie
  // For simplicity, we'll get it from the token query param
  const token = req.query.state;

  if (!token) {
    // No session - redirect to login first
    return res.redirect(`${process.env.APP_URL}/login?next=install&installation_id=${installation_id}`);
  }

  try {
    // Get user from session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return res.redirect(`${process.env.APP_URL}/login?error=invalid_session`);
    }

    // Store installation
    const { error: installError } = await supabase
      .from('installations')
      .upsert({
        user_id: session.user_id,
        installation_id: parseInt(installation_id),
      }, {
        onConflict: 'installation_id',
      });

    if (installError) {
      console.error('Installation save error:', installError);
      return res.redirect(`${process.env.APP_URL}/connect?error=save_failed`);
    }

    res.redirect(`${process.env.APP_URL}/dashboard?installed=true`);
  } catch (error) {
    console.error('Install callback error:', error);
    res.redirect(`${process.env.APP_URL}/connect?error=unknown`);
  }
}
