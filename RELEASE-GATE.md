# Release Gate & Push Runbook

## Rollback Gate (Vercel)

| Trigger | Action |
|---|---|
| 5xx rate > 5% in 10min window AND total requests >= 100 | Manual revert |
| 5 consecutive 5xx responses within 2min | Manual revert |
| After any revert | 30min cooldown before next deploy |

Vercel has no native auto-rollback. Phase 1 is manual monitoring.

### Manual Rollback Procedure

```bash
# 1. List recent deployments
vercel ls --scope jun-kims-projects-0c5b30a7

# 2. Identify the last healthy deployment (status: READY, before current)
#    Copy the deployment ID (e.g., dpl_abc123)

# 3. Rollback to that deployment
vercel rollback <DEPLOYMENT_ID> --scope jun-kims-projects-0c5b30a7

# 4. Wait 30min cooldown, analyze root cause, then redeploy
```

Phase 2 (TODO): Automate via Vercel Checks API + GitHub Actions workflow.
Monitoring source: Vercel Analytics dashboard or external uptime service.

## Push Order

### Step 1: Publish @opencanon/canon to npm

```bash
cd /Users/junkim/opencanon-canon
npm run build && npm test          # must pass
npm publish --access public        # requires OTP
npm view @opencanon/canon@0.2.0    # verify published
```

If `npm publish` returns 403 "version already exists": the version is already on npm.
Skip publish, run `npm view @opencanon/canon@0.2.0` to confirm, and continue.

### Step 2: Verify web resolves new version

```bash
cd /Users/junkim/opencanon
rm -rf node_modules package-lock.json
npm install                        # must resolve @opencanon/canon@^0.2.0
npm run build                      # must pass
```

### Step 3: Push opencanon-canon to GitHub

```bash
cd /Users/junkim/opencanon-canon
git remote add origin git@github.com:0xjunkim/opencanon-canon.git
git push -u origin main --tags     # pushes main + v0.2.0 tag
```

### Step 4: Push opencanon (web) to GitHub

```bash
cd /Users/junkim/opencanon
git push origin main               # Vercel auto-deploys on push to main
```

### Step 5: Post-deploy verification

```bash
# 1. CLI resolves from npm
npx --yes @opencanon/canon --version  # should print 0.2.0

# 2. Web responds
curl -sS -o /dev/null -w "%{http_code}" https://opencanon.co/  # 200

# 3. API endpoints respond
curl -sS https://opencanon.co/api/registry  # 200, JSON body
```

## Failure Recovery

| Failure | Recovery |
|---|---|
| npm publish fails (non-403) | Fix issue, re-publish. No downstream impact. |
| npm publish 403 (already exists) | Version already on npm. Skip publish, continue to step 2. |
| Web `npm install` fails | Check npm registry availability. Retry. |
| Web build fails on deploy | Vercel auto-keeps previous deployment. Fix, re-push. |
| 5xx spike post-deploy | Manual rollback per procedure above. |
| Tag pushed but code broken | `git revert` + new commit + new tag. Never force-push. |

## z2a-instance-app-canon

On hold. Do NOT push until engine v2 work is complete.
