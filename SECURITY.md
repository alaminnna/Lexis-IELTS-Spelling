# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅        |

## Reporting

Please **do not** open public issues for security bugs.

Email: **ikalamin0@gmail.com** (or DM via https://alaminnna.ami.bd)

Include: description, steps to reproduce, impact, and if possible a PoC.

We aim to respond within 48h and patch within 7 days. You will be credited if desired.

## Scope

- XSS via word input / profile name (we sanitize via `sanitizeName`/`simpleSanitize`)
- Storage tampering / localStorage bypass
- PWA / SW cache poisoning

Thanks for keeping Lexis safe!
