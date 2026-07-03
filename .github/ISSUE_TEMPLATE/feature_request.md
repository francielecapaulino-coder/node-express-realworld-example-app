---
name: Feature Request
description: Suggest an idea for this project
title: "[FEATURE]: "
labels: ["enhancement", "needs-triage"]
assignees: ""

---

## Feature Description
<!-- A clear and concise description of the feature you want to add. -->

## Problem Statement
<!-- What problem does this feature solve? What pain point does it address? -->

## Proposed Solution
<!-- Describe the solution you'd like to see implemented. -->

## API Changes (if applicable)
<!-- Describe any new endpoints, modified endpoints, or breaking changes -->

```typescript
// Example API contract
interface NewEndpoint {
  // interface definition
}
```

## Acceptance Criteria
- [ ] User can [do something]
- [ ] API returns [expected response]
- [ ] Performance: [X req/s]
- [ ] Error handling properly implemented
- [ ] Tests written and passing

## UI Changes (if applicable)
<!-- Describe any user interface changes -->
- [ ] New pages/components
- [ ] Navigation changes
- [ ] Form updates

## Database Changes (if applicable)
<!-- Describe any database schema changes -->
- [ ] New tables/fields
- [ ] Migration scripts
- [ ] Data seeding

## Impact Assessment
- **Risk Level**: [Low/Medium/High]
- **Breaking Changes**: [Yes/No]
- **Migration Required**: [Yes/No]
- **Documentation Updates Required**: [Yes/No]

## Definition of Done Checklist
- [ ] Feature implemented according to acceptance criteria
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Documentation updated
- [ ] API documentation updated (OpenAPI)
- [ ] PR created and linked to this issue
- [ ] Code reviewed by team
- [ ] Ready for deployment

## Priority & Timeline
- **Priority**: [Critical/High/Medium/Low]
- **Target Release**: [v1.0.0, v1.1.0, etc.]
- **Estimated Effort**: [Days/Weeks]

## Additional Notes
<!-- Add any other context or screenshots about the feature request here. -->

## References
- Links to related issues
- Links to external resources
- Design mockups or wireframes

---

## Issue Tracking

GitHub Issues are enabled for this repository — use them directly:

### Workflow
1. **PREREQUISITES:** Open an issue (using the templates in `.github/ISSUE_TEMPLATE/`) before starting work.
2. **REQUIREMENTS:** Reference the issue number in every related commit.
3. **CLOSURE:** Close the issue when the linked PR merges.

### Commit Reference Pattern:
```bash
# Good examples:
feat(auth): add rate limiting (#12)
fix(middleware): resolve async handler (#13)
docs(api): update swagger endpoints (#14)
```

> Historical note: this repo previously had Issues disabled and used a `LOCAL-XXX` file-based
> workaround (`docs/agent/LOCAL-ISSUES.md`). That file is now archived; it is no longer the
> tracking system.