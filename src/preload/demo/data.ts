/* eslint-disable */
// Fake data for DK_DEMO screenshot mode. Not shipped unless DK_DEMO=1.
// Every object here is a plain literal shaped to match exactly the fields the
// renderer reads (see the demo bridge). No network, no git, no GitHub.

import { avatars } from './avatars';

const now = Date.now();
const min = 60_000;
const hour = 60 * min;
const day = 24 * hour;
const ago = (ms: number) => new Date(now - ms).toISOString();

const users = {
  bot: { avatar_url: avatars.bot, login: 'dependabot[bot]', type: 'Bot' },
  jules: { avatar_url: avatars.jules, login: 'jules-rivera', type: 'User' },
  mei: { avatar_url: avatars.mei, login: 'mei-lin', type: 'User' },
  you: { avatar_url: avatars.you, login: 'egor-xyz', type: 'User' }
};

export type DemoProject = { filePath: string; groupId?: string; id: string; name: string };

export const groups = [
  { fullName: 'Frontend', icon: 'folder-close', id: 'g-frontend', name: 'Frontend' },
  { fullName: 'Platform', icon: 'folder-close', id: 'g-platform', name: 'Platform' }
];

export const projects: DemoProject[] = [
  { filePath: '/Users/egor/dev/web-dashboard', groupId: 'g-frontend', id: 'p-web', name: 'web-dashboard' },
  { filePath: '/Users/egor/dev/design-system', groupId: 'g-frontend', id: 'p-ds', name: 'design-system' },
  { filePath: '/Users/egor/dev/marketing-site', groupId: 'g-frontend', id: 'p-mkt', name: 'marketing-site' },
  { filePath: '/Users/egor/dev/api-gateway', groupId: 'g-platform', id: 'p-api', name: 'api-gateway' },
  { filePath: '/Users/egor/dev/auth-service', groupId: 'g-platform', id: 'p-auth', name: 'auth-service' },
  { filePath: '/Users/egor/dev/notifications-service', groupId: 'g-platform', id: 'p-notif', name: 'notifications-service' },
  { filePath: '/Users/egor/dev/mobile-app', id: 'p-mobile', name: 'mobile-app' },
  { filePath: '/Users/egor/dev/infra-terraform', id: 'p-infra', name: 'infra-terraform' },
  { filePath: '/Users/egor/dev/docs-site', id: 'p-docs', name: 'docs-site' }
];

const branchSummary = (current: string, extra: string[] = []) => {
  const all = ['main', ...extra];
  const branches: Record<string, any> = {};
  for (const name of all) {
    branches[name] = { commit: 'a1b2c3d', current: name === current, label: `origin/${name}`, name };
  }
  return { all: all.map((b) => `remotes/origin/${b}`).concat(all), branches, current, detached: false };
};

const empty: string[] = [];
const status = (ahead: number, behind: number, modified: string[] = []) => ({
  ahead,
  behind,
  conflicted: empty,
  created: empty,
  current: 'main',
  deleted: empty,
  files: modified.map((path) => ({ index: ' ', path, working_dir: 'M' })),
  isClean: modified.length === 0,
  modified,
  not_added: empty,
  renamed: empty,
  staged: empty
});

// Per-project git status. Worktrees only where we want to show the feature.
export const gitStatusById: Record<string, any> = {
  'p-web': {
    branchSummary: branchSummary('main', ['feature/checkout-redesign', 'fix/login-redirect', 'feature/dark-mode']),
    organization: 'Acme Corp',
    origin: 'git@github.com:acme/web-dashboard.git',
    // behind > 0 lights up the purple Pull button on the repo header.
    status: status(1, 3, ['src/pages/Checkout.tsx', 'src/theme.css']),
    success: true,
    worktrees: [
      { branch: 'main', isMain: true, path: '/Users/egor/dev/web-dashboard' },
      { branch: 'feature/checkout-redesign', isMain: false, path: '/Users/egor/dev/web-dashboard-checkout' },
      { branch: 'fix/login-redirect', isMain: false, path: '/Users/egor/dev/web-dashboard-login' },
      { branch: 'feature/dark-mode', isMain: false, path: '/Users/egor/dev/web-dashboard-darkmode' }
    ]
  },
  'p-ds': {
    branchSummary: branchSummary('main'),
    organization: 'Acme Corp',
    origin: 'git@github.com:acme/design-system.git',
    status: status(2, 0),
    success: true,
    worktrees: [{ branch: 'main', isMain: true, path: '/Users/egor/dev/design-system' }]
  },
  'p-api': {
    branchSummary: branchSummary('main', ['feature/rate-limiting']),
    organization: 'Acme Corp',
    origin: 'git@github.com:acme/api-gateway.git',
    // behind > 0 lights up the purple Pull button.
    status: status(0, 4),
    success: true,
    worktrees: [
      { branch: 'main', isMain: true, path: '/Users/egor/dev/api-gateway' },
      { branch: 'feature/rate-limiting', isMain: false, path: '/Users/egor/dev/api-gateway-ratelimit' }
    ]
  },
  'p-auth': {
    branchSummary: branchSummary('main', ['chore/rotate-keys']),
    organization: 'Acme Corp',
    origin: 'git@github.com:acme/auth-service.git',
    status: status(0, 0),
    success: true,
    worktrees: [{ branch: 'main', isMain: true, path: '/Users/egor/dev/auth-service' }]
  },
  'p-mobile': {
    branchSummary: branchSummary('main', ['feature/push-notifications']),
    organization: 'Acme Corp',
    origin: 'git@github.com:acme/mobile-app.git',
    status: status(1, 0),
    success: true,
    worktrees: [{ branch: 'main', isMain: true, path: '/Users/egor/dev/mobile-app' }]
  },
  'p-infra': {
    branchSummary: branchSummary('main', ['feature/rds-replicas']),
    organization: 'Acme Corp',
    origin: 'git@github.com:acme/infra-terraform.git',
    status: status(0, 0),
    success: true,
    worktrees: [{ branch: 'main', isMain: true, path: '/Users/egor/dev/infra-terraform' }]
  },
  'p-mkt': {
    branchSummary: branchSummary('main', ['feature/pricing-page']),
    organization: 'Acme Corp',
    origin: 'git@github.com:acme/marketing-site.git',
    status: status(0, 2),
    success: true,
    worktrees: [
      { branch: 'main', isMain: true, path: '/Users/egor/dev/marketing-site' },
      { branch: 'feature/pricing-page', isMain: false, path: '/Users/egor/dev/marketing-site-pricing' }
    ]
  },
  'p-notif': {
    branchSummary: branchSummary('main', ['fix/email-retry']),
    organization: 'Acme Corp',
    origin: 'git@github.com:acme/notifications-service.git',
    status: status(0, 0),
    success: true,
    worktrees: [
      { branch: 'main', isMain: true, path: '/Users/egor/dev/notifications-service' },
      { branch: 'fix/email-retry', isMain: false, path: '/Users/egor/dev/notifications-service-retry' }
    ]
  },
  'p-docs': {
    branchSummary: branchSummary('main'),
    organization: 'Acme Corp',
    origin: 'git@github.com:acme/docs-site.git',
    status: status(0, 0),
    success: true,
    worktrees: [{ branch: 'main', isMain: true, path: '/Users/egor/dev/docs-site' }]
  }
};

let runSeq = 5000;
const run = (o: {
  branch: string;
  conclusion?: null | string;
  event?: string;
  name: string;
  path: string;
  status?: string;
  title: string;
  when: number;
}) => {
  const id = (runSeq += 1);
  return {
    actor: users.you,
    conclusion: o.conclusion ?? null,
    created_at: ago(o.when),
    display_title: o.title,
    event: o.event ?? 'push',
    head_branch: o.branch,
    html_url: 'https://github.com/acme/repo/actions/runs/' + id,
    id,
    name: o.name,
    path: `.github/workflows/${o.path}`,
    run_number: 1200 + (id % 300),
    status: o.status ?? 'completed',
    updated_at: ago(Math.max(0, o.when - 3 * min))
  };
};

export const runsById: Record<string, any[]> = {
  'p-web': [
    run({ branch: 'main', conclusion: 'success', name: 'CI', path: 'ci.yml', title: 'Merge pull request #141 from acme/feature/analytics', when: 30 * min }),
    // Live pipeline so the deploy stages stay visible (settled/green runs fold
    // away under "Passing checks"): staging running, production waiting on it.
    run({ branch: 'main', conclusion: null, name: 'Deploy Staging', path: 'deploy-staging.yml', status: 'in_progress', title: 'Auto-deploy main to staging', when: 8 * min }),
    run({ branch: 'main', conclusion: null, name: 'Deploy Production', path: 'deploy-production.yml', status: 'queued', title: 'Release v3.8.0 to production', when: 7 * min, event: 'workflow_dispatch' }),
    run({ branch: 'main', conclusion: 'success', name: 'E2E', path: 'e2e.yml', title: 'End-to-end against staging (Playwright)', when: 20 * min }),
    run({ branch: 'main', conclusion: 'success', name: 'CodeQL', path: 'codeql.yml', title: 'Weekly security scan', when: 5 * hour, event: 'schedule' }),
    run({ branch: 'main', conclusion: 'failure', name: 'Nightly E2E', path: 'e2e-nightly.yml', title: 'Nightly end-to-end (full suite)', when: 6 * hour, event: 'schedule' }),
    run({ branch: 'feature/checkout-redesign', conclusion: null, name: 'CI', path: 'ci.yml', status: 'in_progress', title: 'Redesign checkout flow with saved payment methods', when: 12 * min, event: 'pull_request' }),
    run({ branch: 'feature/checkout-redesign', conclusion: 'success', name: 'Lint', path: 'lint.yml', title: 'Redesign checkout flow with saved payment methods', when: 14 * min, event: 'pull_request' }),
    run({ branch: 'feature/checkout-redesign', conclusion: 'success', name: 'Type Check', path: 'typecheck.yml', title: 'Redesign checkout flow with saved payment methods', when: 15 * min, event: 'pull_request' }),
    run({ branch: 'feature/checkout-redesign', conclusion: 'success', name: 'Bundle Size', path: 'bundlesize.yml', title: 'Redesign checkout flow with saved payment methods', when: 16 * min, event: 'pull_request' }),
    run({ branch: 'fix/login-redirect', conclusion: 'failure', name: 'CI', path: 'ci.yml', title: 'Fix infinite redirect on expired session', when: 40 * min, event: 'pull_request' }),
    run({ branch: 'feature/dark-mode', conclusion: 'success', name: 'CI', path: 'ci.yml', title: 'Add system-aware dark mode', when: 3 * hour, event: 'pull_request' }),
    run({ branch: 'feature/dark-mode', conclusion: null, name: 'Visual Regression', path: 'visual.yml', status: 'in_progress', title: 'Add system-aware dark mode', when: 6 * min, event: 'pull_request' })
  ],
  'p-ds': [
    run({ branch: 'main', conclusion: 'success', name: 'CI', path: 'ci.yml', title: 'Add Button size + tone variants', when: 3 * hour }),
    run({ branch: 'main', conclusion: 'success', name: 'Chromatic', path: 'chromatic.yml', title: 'Add Button size + tone variants', when: 3 * hour + 4 * min }),
    run({ branch: 'main', conclusion: null, name: 'Publish', path: 'publish.yml', status: 'queued', title: 'Publish @acme/design-system@2.4.0', when: 5 * min, event: 'workflow_dispatch' })
  ],
  'p-api': [
    run({ branch: 'main', conclusion: 'success', name: 'CI', path: 'ci.yml', title: 'Merge pull request #87 from acme/chore/deps', when: 90 * min }),
    run({ branch: 'main', conclusion: 'success', name: 'Deploy Staging', path: 'deploy-staging.yml', title: 'Auto-deploy main to staging', when: 80 * min }),
    run({ branch: 'feature/rate-limiting', conclusion: null, name: 'CI', path: 'ci.yml', status: 'in_progress', title: 'Add token-bucket rate limiting to public API', when: 8 * min, event: 'pull_request' }),
    run({ branch: 'feature/rate-limiting', conclusion: 'success', name: 'Integration Tests', path: 'test.yml', title: 'Add token-bucket rate limiting to public API', when: 9 * min, event: 'pull_request' }),
    run({ branch: 'feature/rate-limiting', conclusion: 'success', name: 'Contract Tests', path: 'contract.yml', title: 'Add token-bucket rate limiting to public API', when: 10 * min, event: 'pull_request' })
  ],
  'p-auth': [
    run({ branch: 'main', conclusion: 'success', name: 'CI', path: 'ci.yml', title: 'Rotate JWT signing keys and add rotation schedule', when: 20 * hour }),
    run({ branch: 'main', conclusion: 'success', name: 'Deploy Production', path: 'deploy.yml', title: 'Rotate JWT signing keys and add rotation schedule', when: 19.5 * hour, event: 'workflow_dispatch' }),
    run({ branch: 'chore/rotate-keys', conclusion: 'success', name: 'CI', path: 'ci.yml', title: 'Rotate JWT signing keys and add rotation schedule', when: 21 * hour, event: 'pull_request' })
  ],
  'p-mobile': [
    run({ branch: 'main', conclusion: 'success', name: 'iOS Build', path: 'ios.yml', title: 'Bump build number to 428', when: 4 * hour }),
    run({ branch: 'main', conclusion: 'success', name: 'Android Build', path: 'android.yml', title: 'Bump build number to 428', when: 4 * hour + 6 * min }),
    run({ branch: 'feature/push-notifications', conclusion: 'cancelled', name: 'Android Build', path: 'android.yml', title: 'Push notifications: APNs + FCM wiring', when: 55 * min, event: 'pull_request' }),
    run({ branch: 'feature/push-notifications', conclusion: 'success', name: 'iOS Build', path: 'ios.yml', title: 'Push notifications: APNs + FCM wiring', when: 58 * min, event: 'pull_request' })
  ],
  'p-infra': [
    run({ branch: 'main', conclusion: 'success', name: 'Terraform Apply', path: 'apply.yml', title: 'Scale RDS read replicas to 3', when: 7 * hour, event: 'workflow_dispatch' }),
    run({ branch: 'feature/rds-replicas', conclusion: 'success', name: 'Terraform Plan', path: 'plan.yml', title: 'Scale RDS read replicas to 3', when: 7.5 * hour, event: 'pull_request' })
  ],
  'p-mkt': [
    run({ branch: 'main', conclusion: 'success', name: 'Build & Deploy', path: 'deploy.yml', title: 'Update homepage hero copy', when: 5 * hour }),
    run({ branch: 'feature/pricing-page', conclusion: 'failure', name: 'Lighthouse', path: 'lighthouse.yml', title: 'New pricing page with annual toggle', when: 25 * min, event: 'pull_request' }),
    run({ branch: 'feature/pricing-page', conclusion: 'success', name: 'Build & Deploy', path: 'deploy.yml', title: 'New pricing page with annual toggle', when: 26 * min, event: 'pull_request' })
  ],
  'p-notif': [
    run({ branch: 'main', conclusion: 'success', name: 'CI', path: 'ci.yml', title: 'Add SMS provider failover', when: 8 * hour }),
    run({ branch: 'fix/email-retry', conclusion: null, name: 'CI', path: 'ci.yml', status: 'in_progress', title: 'Retry failed email sends with backoff', when: 4 * min, event: 'pull_request' })
  ],
  'p-docs': [
    run({ branch: 'main', conclusion: 'success', name: 'Build', path: 'build.yml', title: 'Document the new webhooks API', when: 11 * hour })
  ]
};

// A step spans [start, end] minutes-ago. A queued/in-progress step has no end.
const step = (name: string, o: { conclusion?: null | string; end?: number; start: number; status?: string }) => ({
  completed_at: o.end === undefined ? null : ago(o.end * min),
  conclusion: o.conclusion ?? null,
  name,
  started_at: o.start === Infinity ? null : ago(o.start * min),
  status: o.status ?? 'completed'
});

type JobState = 'failed' | 'passed' | 'running';

// A real CI DAG: build first, then test + lint in parallel, then deploy last.
// The graph derives columns from job time-overlap, so the staged start/end
// times below are what make it fan out horizontally instead of stacking.
const jobsFor = (runId: number, state: JobState) => {
  const running = state === 'running';
  const failed = state === 'failed';

  return [
    {
      // Stage 1 — 14m..12m ago.
      completed_at: ago(12 * min),
      conclusion: 'success',
      id: runId * 10 + 1,
      name: 'build',
      started_at: ago(14 * min),
      status: 'completed',
      steps: [
        step('Checkout', { conclusion: 'success', end: 13.5, start: 14 }),
        step('Install dependencies', { conclusion: 'success', end: 12.7, start: 13.5 }),
        step('Build', { conclusion: 'success', end: 12, start: 12.7 })
      ]
    },
    {
      // Stage 2a — 12m ago onward. Still running / failed / passed per state.
      completed_at: running ? null : ago(9 * min),
      conclusion: running ? null : failed ? 'failure' : 'success',
      id: runId * 10 + 2,
      name: 'test',
      started_at: ago(12 * min),
      status: running ? 'in_progress' : 'completed',
      steps: [
        step('Set up job', { conclusion: 'success', end: 11.8, start: 12 }),
        step('Restore cache', { conclusion: 'success', end: 11.4, start: 11.8 }),
        running
          ? step('Run unit tests', { start: 11.4, status: 'in_progress' })
          : step('Run unit tests', { conclusion: failed ? 'failure' : 'success', end: 9, start: 11.4 })
      ]
    },
    {
      // Stage 2b — parallel with test (overlapping window → same column).
      completed_at: ago(11 * min),
      conclusion: 'success',
      id: runId * 10 + 3,
      name: 'lint',
      started_at: ago(12 * min),
      status: 'completed',
      steps: [
        step('Set up job', { conclusion: 'success', end: 11.8, start: 12 }),
        step('ESLint', { conclusion: 'success', end: 11.3, start: 11.8 }),
        step('Prettier', { conclusion: 'success', end: 11, start: 11.3 })
      ]
    },
    {
      // Stage 3 — deploy to staging after tests pass. Skipped on failure,
      // queued while still running, its own column when it passed.
      completed_at: running || failed ? null : ago(8 * min),
      conclusion: failed ? 'skipped' : running ? null : 'success',
      id: runId * 10 + 4,
      name: 'deploy-staging',
      started_at: running || failed ? null : ago(9 * min),
      status: failed ? 'completed' : running ? 'queued' : 'completed',
      steps: failed
        ? [step('Deploy to staging', { conclusion: 'skipped', start: Infinity, status: 'completed' })]
        : running
          ? [step('Deploy to staging', { start: Infinity, status: 'queued' })]
          : [
              step('Configure credentials', { conclusion: 'success', end: 8.7, start: 9 }),
              step('Deploy to staging', { conclusion: 'success', end: 8, start: 8.7 })
            ]
    },
    {
      // Stage 4 — production deploy after staging. A later column still.
      completed_at: running || failed ? null : ago(7 * min),
      conclusion: failed ? 'skipped' : running ? null : 'success',
      id: runId * 10 + 5,
      name: 'deploy-production',
      started_at: running || failed ? null : ago(8 * min),
      status: failed ? 'completed' : running ? 'queued' : 'completed',
      steps: failed
        ? [step('Deploy to production', { conclusion: 'skipped', start: Infinity, status: 'completed' })]
        : running
          ? [step('Deploy to production', { start: Infinity, status: 'queued' })]
          : [
              step('Configure credentials', { conclusion: 'success', end: 7.7, start: 8 }),
              step('Deploy to production', { conclusion: 'success', end: 7.1, start: 7.7 }),
              step('Smoke test', { conclusion: 'success', end: 7, start: 7.1 })
            ]
    }
  ];
};

const failedConclusionSet = new Set(['action_required', 'cancelled', 'failure', 'startup_failure', 'timed_out']);

// Jobs mirror the run: an unfinished run is still running, a failed run shows
// its failing job, everything else is green.
export const jobsForRun = (runId: number) => {
  const r = Object.values(runsById).flat().find((x) => x.id === runId);
  const state: JobState = !r || !r.conclusion ? 'running' : failedConclusionSet.has(r.conclusion) ? 'failed' : 'passed';
  return jobsFor(runId, state);
};

const label = (id: number, name: string, color: string) => ({ color, id, name });

let pullSeq = 100;
const pull = (o: {
  branch: string;
  createdAgo: number;
  draft?: boolean;
  labels?: any[];
  mergedAgo?: number;
  number: number;
  state?: string;
  title: string;
  user: any;
}) => ({
  created_at: ago(o.createdAgo),
  draft: o.draft ?? false,
  head: { ref: o.branch },
  html_url: 'https://github.com/acme/repo/pull/' + o.number,
  id: (pullSeq += 1),
  labels: o.labels ?? [],
  merged_at: o.mergedAgo ? ago(o.mergedAgo) : null,
  number: o.number,
  state: o.state ?? 'open',
  title: o.title,
  updated_at: ago(Math.max(0, o.createdAgo - 30 * min)),
  user: o.user
});

export const pullsById: Record<string, any[]> = {
  'p-web': [
    pull({
      branch: 'feature/checkout-redesign',
      createdAgo: 6 * hour,
      labels: [label(1, 'feature', '0e8a16'), label(2, 'needs review', 'fbca04'), label(20, 'frontend', 'c5def5')],
      number: 142,
      title: 'Redesign checkout flow with saved payment methods',
      user: users.you
    }),
    pull({
      branch: 'fix/login-redirect',
      createdAgo: 40 * min,
      draft: true,
      labels: [label(3, 'bug', 'd73a4a'), label(21, 'priority: high', 'e11d21')],
      number: 143,
      title: 'Fix infinite redirect on expired session',
      user: users.mei
    }),
    pull({
      branch: 'feature/dark-mode',
      createdAgo: 3 * hour,
      labels: [label(22, 'feature', '0e8a16'), label(23, 'design', 'd4c5f9')],
      number: 144,
      title: 'Add system-aware dark mode with per-user override',
      user: users.jules
    }),
    // No worktree for this branch → renders as an orphan PR under the main
    // card. The "Review requested" tag keeps it visible and shows the bot pill.
    pull({
      branch: 'dependabot/npm_and_yarn/axios-1.7.9',
      createdAgo: 14 * hour,
      labels: [label(24, 'dependencies', '0366d6')],
      number: 138,
      title: 'chore(deps): bump axios from 1.6.8 to 1.7.9',
      user: users.bot
    })
  ],
  'p-api': [
    pull({
      branch: 'feature/rate-limiting',
      createdAgo: 3 * hour,
      labels: [label(4, 'enhancement', 'a2eeef'), label(25, 'backend', 'bfdadc')],
      number: 88,
      title: 'Add token-bucket rate limiting to public API',
      user: users.jules
    })
  ],
  'p-auth': [
    pull({
      branch: 'chore/rotate-keys',
      createdAgo: 21 * hour,
      labels: [label(5, 'security', 'b60205')],
      mergedAgo: 20 * hour,
      number: 55,
      state: 'closed',
      title: 'Rotate JWT signing keys and add rotation schedule',
      user: users.you
    })
  ],
  'p-mkt': [
    pull({
      branch: 'feature/pricing-page',
      createdAgo: 90 * min,
      labels: [label(9, 'marketing', 'fef2c0'), label(10, 'needs design review', 'd4c5f9')],
      number: 61,
      title: 'New pricing page with monthly/annual toggle',
      user: users.mei
    })
  ],
  'p-notif': [
    pull({
      branch: 'fix/email-retry',
      createdAgo: 30 * min,
      labels: [label(11, 'bug', 'd73a4a'), label(12, 'reliability', '0e8a16')],
      number: 74,
      title: 'Retry failed email sends with exponential backoff',
      user: users.you
    })
  ],
  'p-mobile': [
    pull({
      branch: 'feature/push-notifications',
      createdAgo: 2 * hour,
      labels: [label(6, 'feature', '0e8a16'), label(7, 'ios', '5319e7'), label(8, 'android', '3fb950')],
      number: 210,
      title: 'Push notifications: APNs + FCM wiring',
      user: users.jules
    })
  ]
};

// PRs you authored (tag "My") and PRs where review is requested of you.
export const authoredPRNumbers: Record<string, number[]> = {
  'p-auth': [55],
  'p-notif': [74],
  'p-web': [142]
};
export const reviewRequestedPRNumbers: Record<string, number[]> = {
  'p-api': [88],
  'p-mkt': [61],
  'p-mobile': [210],
  'p-web': [138, 144]
};

const check = (id: number, name: string, conclusion: null | string, statusV = 'completed') => ({
  conclusion,
  id,
  name,
  status: statusV
});

export const checksByPR: Record<number, any[]> = {
  55: [check(551, 'build', 'success'), check(552, 'test', 'success')],
  61: [check(611, 'Build & Deploy', 'success'), check(612, 'Lighthouse', 'failure')],
  74: [check(741, 'build', 'success'), check(742, 'test', 'success'), check(743, 'lint', null, 'in_progress')],
  88: [check(881, 'build', 'success'), check(882, 'integration', null, 'in_progress'), check(883, 'contract', 'success')],
  138: [check(1381, 'build', 'success'), check(1382, 'test', 'success')],
  142: [check(1421, 'build', 'success'), check(1422, 'e2e', 'success'), check(1423, 'lint', 'success'), check(1424, 'typecheck', 'success')],
  143: [check(1431, 'build', 'failure'), check(1432, 'lint', 'success')],
  144: [check(1441, 'build', 'success'), check(1442, 'visual', null, 'in_progress'), check(1443, 'lint', 'success')],
  210: [check(2101, 'ios', 'success'), check(2102, 'android', 'cancelled')]
};

// ---- Claude usage ----
const model = (m: string, tokens: number) => ({ model: m, tokens });

const usageWindow = (o: { models: any[]; pct: number; resetsInMs: number; tokens: number }) => ({
  active: true,
  cap: Math.round(o.tokens / Math.max(o.pct, 0.01)),
  models: o.models,
  pct: o.pct,
  reported: true,
  resetsAt: now + o.resetsInMs,
  startsAt: now - (7 * day - o.resetsInMs),
  tokens: o.tokens
});

export const claudeAccounts = [
  { dir: '/Users/egor/.claude', email: 'evgeni.s@trustic.ai', label: 'claude', org: 'TegoAI', plan: 'Max 20×' },
  { dir: '/Users/egor/.claude-b', email: 'egor@personal.dev', label: 'claude-b', org: 'Personal', plan: 'Max 5×' }
];

export const usageByDir: Record<string, any> = {
  '/Users/egor/.claude': {
    account: claudeAccounts[0],
    computedAt: now,
    fiveHour: usageWindow({
      models: [model('claude-opus-4-8', 1_840_000), model('claude-sonnet-5', 620_000)],
      pct: 0.41,
      resetsInMs: 2 * hour + 12 * min,
      tokens: 2_460_000
    }),
    reportedAt: now - 4 * min,
    week: usageWindow({
      models: [model('claude-opus-4-8', 18_400_000), model('claude-sonnet-5', 9_100_000), model('claude-haiku-4-5', 2_300_000)],
      pct: 0.63,
      resetsInMs: 3 * day + 6 * hour,
      tokens: 29_800_000
    })
  },
  '/Users/egor/.claude-b': {
    account: claudeAccounts[1],
    computedAt: now,
    fiveHour: usageWindow({
      models: [model('claude-sonnet-5', 340_000)],
      pct: 0.18,
      resetsInMs: 1 * hour + 5 * min,
      tokens: 340_000
    }),
    reportedAt: now - 9 * min,
    week: usageWindow({
      models: [model('claude-opus-4-8', 6_200_000), model('claude-sonnet-5', 4_400_000)],
      pct: 0.82,
      resetsInMs: 2 * day + 1 * hour,
      tokens: 10_600_000
    })
  }
};
