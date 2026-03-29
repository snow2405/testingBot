import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { api, getToken } from '../api';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useOutletContext();
  
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [prompt, setPrompt] = useState('');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      navigate('/login');
      return;
    }

    if (user && !user.hasInstallation) {
      navigate('/connect');
      return;
    }

    loadData();
  }, [user]);

  // Poll for job updates
  useEffect(() => {
    const pendingJobs = jobs.filter(j => j.status === 'pending' || j.status === 'running');
    if (pendingJobs.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const data = await api.getJobs();
        setJobs(data.jobs);
      } catch (error) {
        console.error('Failed to poll jobs:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs]);

  const loadData = async () => {
    try {
      const [reposData, jobsData] = await Promise.all([
        api.getRepos(),
        api.getJobs(),
      ]);
      setRepos(reposData.repos);
      setJobs(jobsData.jobs);
      if (reposData.repos.length > 0) {
        setSelectedRepo(reposData.repos[0].full_name);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRepo || !prompt.trim()) return;

    setSubmitting(true);
    try {
      const { jobId } = await api.createPR(selectedRepo, prompt);
      setJobs([{ 
        id: jobId, 
        status: 'pending', 
        repo: selectedRepo, 
        prompt, 
        created_at: new Date().toISOString() 
      }, ...jobs]);
      setPrompt('');
    } catch (error) {
      console.error('Failed to create PR:', error);
      alert('Failed to create PR: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page dashboard-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading repositories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <div className="dashboard-grid">
        {/* Create PR Card */}
        <div className="card create-pr-card">
          <h2>Create Pull Request</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="repo">Repository</label>
              <select 
                id="repo"
                value={selectedRepo} 
                onChange={(e) => setSelectedRepo(e.target.value)}
                disabled={submitting}
              >
                {repos.map(repo => (
                  <option key={repo.id} value={repo.full_name}>
                    {repo.full_name} {repo.private ? '🔒' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="prompt">Prompt</label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what changes you want the AI to make to the README..."
                rows={4}
                disabled={submitting}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting || !prompt.trim()}
            >
              {submitting ? 'Creating...' : 'Create PR'}
            </button>
          </form>
        </div>

        {/* Jobs List Card */}
        <div className="card jobs-card">
          <h2>Recent Jobs</h2>
          
          {jobs.length === 0 ? (
            <p className="empty-state">No jobs yet. Create your first PR above!</p>
          ) : (
            <div className="jobs-list">
              {jobs.map(job => (
                <div key={job.id} className={`job-item status-${job.status}`}>
                  <div className="job-header">
                    <span className={`status-badge ${job.status}`}>
                      {job.status === 'pending' && '⏳'}
                      {job.status === 'running' && '🔄'}
                      {job.status === 'done' && '✅'}
                      {job.status === 'failed' && '❌'}
                      {job.status}
                    </span>
                    <span className="job-repo">{job.repo}</span>
                  </div>
                  <p className="job-prompt">{job.prompt}</p>
                  {job.pr_url && (
                    <a 
                      href={job.pr_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="pr-link"
                    >
                      View Pull Request →
                    </a>
                  )}
                  {job.error && (
                    <p className="job-error">Error: {job.error}</p>
                  )}
                  <span className="job-time">
                    {new Date(job.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
