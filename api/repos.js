// GET /api/repos - Get repositories for user's installation
import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';

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
    // Get session and user
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Get user's installation
    const { data: installation, error: installError } = await supabase
      .from('installations')
      .select('installation_id')
      .eq('user_id', session.user_id)
      .single();

    if (installError || !installation) {
      return res.status(400).json({ error: 'No GitHub App installation found' });
    }

    // Get Octokit for this installation
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GITHUB_APP_ID,
        privateKey: process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        installationId: installation.installation_id,
      },
    });

    // Get repos accessible to this installation
    const { data } = await octokit.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });

    const repos = data.repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      default_branch: repo.default_branch,
    }));

    res.json({ repos });
  } catch (error) {
    console.error('Repos fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
}
