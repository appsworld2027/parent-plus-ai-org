# Private repository connectivity (functional prerequisite)

The four AppsWorld repositories are private as of 26 November 2026. The authenticated audit returned HTTP 403 for branch protection and rulesets. Founder direction: defer branch protection and security hardening; prioritize a working autonomous delivery system. Do not make repositories public or purchase services to work around this.

The dependency is: product caller → AI Org reusable workflow → handbook checkout → router and loop controller. The caller's GITHUB_TOKEN is restricted to its own repository. For a separate private handbook checkout, provide a fine-grained credential named AI_ORG_HANDBOOK_TOKEN with Contents: read on parent-plus-ai-org only, and explicitly map it from each product caller. Same-repository jobs use the repository GITHUB_TOKEN. The token is used only at checkout and is not persisted in Git config.

The central repository must allow reusable workflows to be called by private repositories owned by the same user (Actions settings / Access). This change requires the owner's access decision and is not performed by this code. A collaborator on a calling repository may indirectly see workflow logs. Do not create a general repo-scoped write token or put any token in source/terminal output.

Run the read-only handbook-connectivity workflow from each product at a pinned AI Org SHA before enabling autonomous product work. It proves real cross-repository checkout and role-router availability without a model call, issue mutation or deployment. A green same-repository test alone does not establish that cross-repo access works.

After authentication is verified, run the canonical synthetic trial and record the exact evidence, then progress actual delivery in accordance with the founder's free-provider/data-use and release policy. Do not confuse a model trial, a local mock test, or a connectivity pass with a completed feature. Existing background and release controls are unchanged.
