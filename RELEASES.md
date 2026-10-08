# Releases

## 1.0.0

- Runs on Node 24 instead of Node 20. Self-hosted runners need a version
  that supports the `node24` runtime. `v0` stays on Node 20.
- Reads the trivy db SHA256 from `ghcr.io` instead of the GitHub Packages
  API, which the aquasecurity org restricts with an IP allow list (#136).
  Cache keys are unchanged.
- `gh-token` is no longer used. It is still accepted and logs a notice, so
  it can be removed at leisure.

## 0.1.0

- Initial release
