# Specification: Implementation of 'deploya-staging' and 'fantaf1_deploy_staging' Skill

## Overview
Implement a new operational command `deploya-staging` and a corresponding Gemini skill `fantaf1_deploy_staging` to automate the deployment process to the `staging` environment. The primary workflow involves merging `develop` into `staging`, following all established quality and certification procedures.

## Functional Requirements
- **Command `deploya-staging`**: Create a trigger for the automated staging deployment flow.
- **Skill `fantaf1_deploy_staging`**: Create a dedicated skill in `.gemini/skills/` that replicates the `fantaf1-deploy` logic but targets the `staging` branch.
- **Workflow Constraints**:
    - The source branch MUST be `develop`.
    - The target branch MUST be `staging`.
    - Mandatory execution of the Full CI Suite (lint, test, build).
    - Mandatory Local Smoke Test before merge.
- **CI/CD Alignment**: Ensure GitHub Actions workflows are adapted to handle the `staging` branch if not already configured.

## Non-Functional Requirements
- **Safety**: No direct pushes to `staging`; all changes must pass through a Pull Request flow.
- **Consistency**: Maintain identical quality gates (CI checks) between `main` and `staging`.

## Acceptance Criteria
- [ ] Command `deploya-staging` correctly triggers the staging deploy flow.
- [ ] New skill `fantaf1_deploy_staging` is created and functional.
- [ ] GitHub Actions correctly validate the `staging` branch.
- [ ] Documentation updated to reflect the new staging deployment process.

## Out of Scope
- Modifying the production deployment flow (`deploya`).
- Creating new deployment environments outside of Render.
