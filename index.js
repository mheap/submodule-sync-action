const core = require("@actions/core");
const github = require("@actions/github");
let { Octokit } = require("@octokit/rest");
Octokit = Octokit.plugin(require("octokit-commit-multiple-files"));

async function action() {
  const token = core.getInput("token", { required: true });
  const path = core.getInput("path", { required: true });
  const targetRef = core.getInput("ref", { required: true });
  const targetBranch = core.getInput("target_branch", { required: true });
  const prBranch = core.getInput("pr_branch", { required: true });
  const prBody = core.getInput("pr_body", { required: false });

  const octokit = new Octokit({ auth: token });

  const owner = github.context.repo.owner;
  const repo = github.context.repo.repo;

  const { data: mod } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    ref: targetBranch,
  });

  if (mod.type !== "submodule") {
    throw new Error(`The provided path is not a submodule: '${path}'`);
  }

  // If the submodule does not start with github.com, bail out

  const submoduleUrl = mod.submodule_git_url;
  const allowedPrefixes = [
    "https://github.com/",
    "git@github.com:"
  ]

  const matchingPrefixes = allowedPrefixes.filter(p => submoduleUrl.startsWith(p));

  if (matchingPrefixes.length == 0) {
    throw new Error(
      `Non-GitHub submodule found. Unable to process '${submoduleUrl}'`
    );
  }

  const prefix = matchingPrefixes[0];

  // Fetch the latest sha for the provided branch from that repo
  const [submoduleOwner, submoduleRepo] = submoduleUrl
    .replace(prefix, "")
    .replace(/\.git$/,"")
    .split("/", 2);

  const { data: ref } = await octokit.rest.git.getRef({
    owner: submoduleOwner,
    repo: submoduleRepo,
    ref: `heads/${targetRef}`,
  });

  // Is the new ref the same as the current one?
  if (mod.sha === ref.object.sha) {
    console.log("This submodule is already up to date");
    return;
  }

  // Is it the same as the ref on the PR branch?
  try {
    const { data: branchMod } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: prBranch,
    });

    if (branchMod.sha === ref.object.sha) {
      console.log("This submodule is already updated on the PR branch");
      return;
    }
  } catch (e) {
    // The prBranch may not exist, so catching this is fine
  }

  const message = `Update [${path}] submodule to [${submoduleOwner}/${submoduleRepo}@${targetRef}]`;
  console.log(message);

  const files = {};
  files[path] = {
    contents: ref.object.sha,
    mode: "160000",
    type: "commit",
  };

  const branchName = await octokit.rest.repos.createOrUpdateFiles({
    owner,
    repo,
    branch: prBranch,
    createBranch: true,
    changes: [
      {
        message,
        files,
      },
    ],
  });

  // Create a PR with this commit hash if it doesn't exist
  let pr = (
    await octokit.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${prBranch}`,
    })
  ).data[0];

  if (!pr) {
    console.log("Creating PR");
    pr = (
      await octokit.rest.pulls.create({
        owner,
        repo,
        title: `Automated submodule update (${path})`,
        body: prBody,
        head: prBranch,
        base: targetBranch,
      })
    ).data;
    console.log("PR created");
  } else {
    console.log("PR already exists. Not creating another");
  }
}

if (require.main === module) {
  try {
    action();
  } catch (e) {
    console.log(e);
    core.setFailed();
  }
}

module.exports = action;
