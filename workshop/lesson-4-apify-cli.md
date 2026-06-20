# Lesson 4: Install and use the Apify CLI

**Goal:** Install the Apify CLI, log in, and run an Actor directly from your terminal.

**Time:** ~10 minutes

---

## 1. Install the Apify CLI

You will need Node.js installed.

```bash
npm install -g apify-cli
```

Verify it installed:

```bash
apify --version
```

If the `apify` command isn't found, restart your terminal.

## 2. Log in

```bash
apify login
```

This opens a browser tab to authenticate. Complete the login and return to your terminal.

## 3. Run an actor from the CLI

You ran the YouTube Scraper in Lesson 1. Now try a different one -- the Instagram Scraper -- from the terminal:

```bash
apify call apify/instagram-scraper --input '{"usernames": ["natgeo"], "resultsLimit": 5}'
```

This runs the Actor and streams the results to your terminal. The same Actor, the same data, but now you're controlling it programmatically.

## 4. Run other actors and inspect inputs

You can run any Actor on the Apify Store this way. But how do you know what the `--input` JSON should look like?

You can inspect an Actor's input schema directly from the CLI. The command needs an Actor ID (the `owner/actor-name` format you see in the Store URL, not just a display name). Try it with the Instagram Scraper:

```bash
apify actors info apify/instagram-scraper --input
```

The `apify actors info` command shows you metadata about the Actor, including its required and optional input fields. Find other Actor IDs by searching the [Apify Store](https://apify.com/store) -- each Actor's page URL contains its ID. This is invaluable when you're scripting or teaching an agent how to use a specific tool.

Try running a different Actor now using what you found in the info:

```bash
# Example: Running the Website Content Crawler
apify call apify/website-content-crawler --input '{"startUrls": [{"url": "https://apify.com"}], "maxCrawlPages": 2}'
```

## 5. What just happened?

The Apify CLI is the command-line interface to everything on the platform:

- Run any Actor from the Store
- Deploy your own Actors
- Manage runs, datasets, and key-value stores
- Integrate Apify into scripts and CI/CD pipelines

Later, Agent Skills will teach your AI coding agent how to use these CLI commands to build and deploy Actors for you.

## 6. Checkpoint

- [ ] Apify CLI installed and authenticated
- [ ] Instagram Scraper ran successfully via CLI

When ready, open [lesson-5-agent-skills.md](./lesson-5-agent-skills.md).
