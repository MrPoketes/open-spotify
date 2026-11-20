# Contributing to Open Spotify

Thanks for helping. This guide covers reporting a problem, setting up the project, and getting a
pull request accepted.

## Report a problem or suggest a feature

Open an issue and pick the bug report or feature request form. Search the existing issues first;
if yours is already there, add what you know to it.

Report security problems privately through
[GitHub security advisories](https://github.com/MrPoketes/open-spotify/security/advisories/new),
never in a public issue.

## Set up the project

You need Node 24 or later, pnpm 11, and Spotify Premium.

1. Install the dependencies and start the app with hot reload:

   ```sh
   pnpm install
   pnpm dev
   ```

2. Create your own Spotify Client ID. Open Spotify has no shared Client ID, because a Spotify
   development app allows only five users
   ([decision 0003](docs/decisions/0003-bring-your-own-client-id.md)). Follow the steps under
   **Requirements** in the [README](README.md#requirements), then paste the Client ID into the
   app on first launch. To skip pasting it every time you reset your data, set the
   `OPEN_SPOTIFY_CLIENT_ID` environment variable before `pnpm dev`; it pre-fills the field.

3. Keep an official Spotify app open on any device. Open Spotify controls playback through
   Spotify Connect and plays no audio itself
   ([decision 0002](docs/decisions/0002-playback-through-spotify-connect.md)).

You do not need a Spotify account to run the tests: they use fake data.

## Check your change

```sh
pnpm check         # lint, format check, typecheck, and tests
pnpm package:dir   # build, then package an unpacked app in release/
pnpm test:e2e      # launch that app against fake Spotify
```

All three must pass before you open a pull request. `pnpm lint:fix` and `pnpm format` fix most
lint and format errors for you.

If your change alters how the main view looks, run `pnpm screenshots` after `pnpm package:dir` to
retake the README screenshots in `docs/images/`. They show fake data, so you need no account.
The images come out slightly different on every run and every OS, so commit them only when the
UI really changed.

## Write the code

Read [AGENTS.md](AGENTS.md) before you change anything. Its rules apply to everyone, people and
agents alike: where code goes, the no-slop rules, how to use Effect, styling with theme tokens,
and what makes a good test. [docs/architecture.md](docs/architecture.md) explains how the main
process, preload, and renderer fit together, and [docs/design.md](docs/design.md) sets how the UI
looks and behaves.

## Open a pull request

A pull request is accepted when:

- it does one thing, and closes the issue that asked for it. Open the issue before you build, so
  the change can be agreed on first;
- its description fills in every section of the
  [pull request template](.github/pull_request_template.md), including the decisions you made and
  the behaviour each new test protects;
- every behaviour it adds or bug it fixes has a test, written as `AGENTS.md` describes;
- it follows the rules in `AGENTS.md`;
- every new dependency is pinned to an exact version and justified in the description;
- the required checks pass: `check`, `package` on Linux, Windows, and macOS, and `agent-review`.

Open Spotify is built by a team of AI agents ([docs/agents](docs/agents/README.md)), and a
reviewer agent reviews every pull request against `AGENTS.md`. It posts its findings as a comment
and sets the `agent-review` status. Reviews of pull requests from outside contributors are
started by hand, so the first one may take a few days. Fix every finding marked blocking and
push. A review covers only the commit it read, so every push needs a new one. Pull requests are
squash-merged into `main`.

By contributing, you agree that your work is released under the [MIT License](LICENSE).
