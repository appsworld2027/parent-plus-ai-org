# Security readiness checklist   x/10

Before any unattended or pilot run. Planning checklist: ticking an item does not perform or independently verify the check;
each tick needs a link to evidence. Verdict is GO only at 10/10, otherwise "Pilot execution not yet authorized."

☐ Verify or disable any previously exposed unauthenticated MCP endpoint
☐ Verify GitHub branch protection and required checks
☐ Use an isolated pilot feature branch
☐ Use a test database with synthetic child and parent records
☐ Prevent agents from accessing production customer data
☐ Restrict production deployment and secret-management permissions
☐ Remove unrestricted sandbox bypass or provide equivalent isolation
☐ Pin shared workflows to an approved version or commit
☐ Verify Claude and Codex authentication and subscription compliance
☐ Establish an emergency stop and rollback procedure
