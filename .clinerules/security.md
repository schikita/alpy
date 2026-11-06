# Security Rules

## Sensitive Files
- DO NOT read, modify, or output the contents of:
  - `.env` files
  - `*.pem`, `*.key` files
  - Any file containing `API_KEY`, `SECRET`, `TOKEN`, or `PASSWORD`
- DO NOT commit sensitive files.

## Practices
- Use environment variables for all secrets.
- Never log credentials or secrets in output.