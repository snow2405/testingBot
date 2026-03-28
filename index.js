const { Octokit } = require("@octokit/rest");
const { createAppAuth } = require("@octokit/auth-app");
const fs = require("fs");

// CONFIG
const APP_ID = "3210911";
const INSTALLATION_ID = "119732199";
const PRIVATE_KEY = fs.readFileSync("waldo-snow2405.2026-03-28.private-key.pem", "utf8");

async function run() {
  const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: APP_ID,
      privateKey: PRIVATE_KEY,
      installationId: INSTALLATION_ID,
    },
  });

  const owner = "snow2405";
  const repo = "testingBot";

  // 1. Get default branch
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const baseBranch = repoData.default_branch;

  // 2. Get latest commit SHA (or initialize if empty)
  let baseSha;
  try {
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${baseBranch}`,
    });
    baseSha = refData.object.sha;
  } catch (error) {
    if (error.status === 409) {
      // Repository is empty, create initial commit
      console.log("Repository is empty. Creating initial commit...");
      
      // Create initial README content
      const initialContent = "# testingBot\n\nInitial commit by bot 🤖";
      const encoded = Buffer.from(initialContent).toString("base64");
      
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: "README.md",
        message: "Initial commit",
        content: encoded,
        branch: baseBranch,
      });
      
      // Now get the SHA
      const { data: refData } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`,
      });
      baseSha = refData.object.sha;
      console.log("✅ Initial commit created");
    } else {
      throw error;
    }
  }

  // 3. Create new branch
 const newBranch = `bot/readme-${Date.now()}`;

  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranch}`,
    sha: baseSha,
  });

  // 4. Get README (if exists)
  let content = "";
  let fileSha = null;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: "README.md",
      ref: newBranch,
    });
    content = Buffer.from(data.content, "base64").toString("utf8");
    fileSha = data.sha;
  } catch (e) {
    content = "# Auto-generated README\n";
  }

  // 5. Modify content
  const newContent = content + "\n\nUpdated by bot 🚀";

  // 6. Create/update README
  const encoded = Buffer.from(newContent).toString("base64");

  const updateParams = {
    owner,
    repo,
    path: "README.md",
    message: "Bot: update README",
    content: encoded,
    branch: newBranch,
  };
  
  if (fileSha) {
    updateParams.sha = fileSha;
  }

  await octokit.repos.createOrUpdateFileContents(updateParams);

  // 7. Create PR
  await octokit.pulls.create({
    owner,
    repo,
    title: "Bot: Update README",
    head: newBranch,
    base: baseBranch,
    body: "Automated change by GitHub App",
  });

  console.log("✅ PR created");
}

run();