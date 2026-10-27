# Release setup

The package repository is `noldor/eslint-plugin-graphql`; npm is
`@noldor/eslint-plugin-graphql`. Development uses branches from current `master`,
English Conventional Commits, independent review and ordinary merge commits.

Require `Quality` and `PR title` on `master`, an up-to-date branch and resolved
discussions. Block force pushes and branch deletion; allow no bypass actors.
`Quality` depends on all Node.js 20/22/24 and ESLint 9/10 test jobs. Use only
ordinary merge commits. Follow the workspace `AGENTS.md` policy for enabling
auto-merge immediately after opening the PR; the required checks still gate merging.

The initial empty master commit is only the PR base. After the first reviewed PR
is merged and master passes Quality, publish the first package version (0.0.1)
using the npm account's normal authenticated CLI flow. Never paste credentials
into repository files. This initial publication requires npm login/2FA.

After first publication, configure npm trusted publishing for GitHub Actions:
owner `noldor`, repository `eslint-plugin-graphql`, workflow
`quality-and-release.yml`. The release job requests `id-token: write`; npm CLI
11.19 supports OIDC. A scoped `NPM_TOKEN` secret is an optional alternative.
Then set the repository Actions variable `NPM_PUBLISH_ENABLED` to `true` and
dispatch the workflow on master to establish/verify the initial tag.

Only checked master revisions release. Tags are immutable: initial v0.0.1, then
Conventional Commit SemVer increments (feat=minor, breaking=major, otherwise patch).
Publication sets the manifest version to the derived tag without committing a
version bump. On retry, the existing tag is reused; an already published npm
version must have the exact checked `gitHead`. Published versions are never
overwritten. Rerun the master workflow after correcting credentials or publisher
configuration. If master has advanced, do not publish the old workflow checkout.

Verify installation from the registry before updating consumers. `npm run check`
tests the rules and prints the npm archive manifest. Distribution must contain
only package.json, LICENSE, README.md, src/*.js and docs/*.md; no tests, credentials,
node_modules, lockfile or release automation.

References: [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/),
[publishing](https://docs.npmjs.com/cli/v11/commands/npm-publish/).
