---
name: fantaf1_deploy_compat
description:
  Compatibility wrapper for the current FantaF1 release flow. Retained only to
  keep the legacy skill path resolvable while redirecting execution to the
  active develop-to-main protocol.
---

# Instructions: FantaF1 Deploy Compatibility Wrapper

This file is retained only as a compatibility wrapper for historical skill
paths.

Active rule:

- the only supported release protocol is `develop -> main`
- the authoritative procedure lives in `AGENTS.md`
- the active operational skill is
  `.gemini/skills/fantaf1-deploy/SKILL.md`

When this compatibility path is invoked:

1. stop using this file as an independent protocol source;
2. delegate execution to the active `fantaf1-deploy` skill;
3. follow the current `deploya` workflow only;
4. do not reintroduce deprecated branch or environment variants.
