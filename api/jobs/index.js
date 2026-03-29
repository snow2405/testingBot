// GET /api/jobs - Get all jobs for user
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

    // Get all jobs for user
    const { data: jobs, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', session.user_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (jobError) {
      return res.status(500).json({ error: 'Failed to fetch jobs' });
    }

    res.json({
      jobs: jobs.map(job => ({
        id: job.id,
        status: job.status,
        repo: `${job.repo_owner}/${job.repo_name}`,
        prompt: job.prompt,
        pr_url: job.pr_url,
        error: job.error,
        created_at: job.created_at,
      })),
    });
  } catch (error) {
    console.error('Jobs fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
