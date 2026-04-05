# The Axiom — Development Environment

## 11. CI/CD Pipeline (active)

### Stack
- GitHub Actions — CI/CD orchestration
- EAS Build — compile iOS + Android binaries
- EAS Update — OTA JS updates without App Store review
- EAS Submit — automated store submission (future)

### Expo / EAS
- Account: tuckerbrady
- Project ID: 1e67df2a-c3f1-45dd-817c-e1949a2b6da5
- Project URL: https://expo.dev/accounts/tuckerbrady/projects/the-axiom

### GitHub Secrets required (Settings → Secrets → Actions)
- EXPO_TOKEN — generate at expo.dev/settings/access-tokens

### Pipeline triggers
- Every push/PR → CI runs: lint, typecheck, unit tests, security audit
- Master merge → CD runs: EAS OTA update
- Master merge with [build] in commit message → EAS binary build

### Test structure
- Unit tests: __tests__/unit/ (Jest)
- Integration tests: __tests__/integration/ (React Native Testing Library)
- E2E tests: .maestro/flows/ (Maestro — run manually or in CI against preview build)

### Coverage targets
- Statements: 80% minimum
- Functions: 80% minimum
- Branches: 70% minimum
