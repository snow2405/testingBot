// GET /api/jobs/[id] - Get job status
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
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing job ID' });
  }

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

    // Get job (ensure it belongs to this user)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user_id)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      id: job.id,
      status: job.status,
      repo: `${job.repo_owner}/${job.repo_name}`,
      prompt: job.prompt,
      pr_url: job.pr_url,
      error: job.error,
      created_at: job.created_at,
    });
  } catch (error) {
    console.error('Job fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
}
