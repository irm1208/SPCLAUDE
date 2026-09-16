# Root `.env` Loading Design

## Goal

Make the API server and primary Vite application load the repository-root `.env` file during local package-script execution.

## Design

- Update the API server's `dev` script to start Node with `--env-file=../../.env` before running `tsx`.
- Update the primary frontend's `dev`, `build`, and `serve` scripts to start Vite through Node with the same root env file.
- Keep command-line and platform-provided environment variables authoritative. Node's native env-file handling only supplies values that are not already present.
- Do not expose server secrets to browser code. Vite will only expose variables following its public-variable rules; existing explicit compile-time definitions remain unchanged.
- Keep the existing root `.env` location unchanged. Update `start.sh` to export
  `API_PORT="${API_PORT:-8080}"` before launching the API so a root `.env`
  `PORT` value used by other tools cannot move the API away from the port used
  by the development proxy.

## Error Handling

Local commands should fail immediately if the expected root `.env` file is missing. `start.sh` already creates the file before launching either application, while direct package-script users receive a clear Node startup error instead of silently running without configuration.

## Verification

- Confirm both package scripts can read a harmless root `.env` value while an already-exported shell value takes precedence.
- Run the affected package type checks.
- Inspect the final diff to ensure no `.env` values or secrets were committed.
