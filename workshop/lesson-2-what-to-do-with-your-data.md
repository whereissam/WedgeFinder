# Lesson 2: What to do with your data

**Goal:** Learn what happens to your data after an Actor runs, and how you can export it, fetch it via API, or chain Actors together so one scraper feeds into another.

**Time:** ~15 minutes

---

## 1. Recap: Where your data lives

In Lesson 1 you ran the YouTube Scraper and saw results in the **Dataset** tab. Every Actor run produces a dataset. You can view, export, and interact with it from the Apify Console.

## 2. Export it

You can download data in two formats:

1. Open [console.apify.com](https://console.apify.com) -> **Actors** -> **My Actors** (or **Last runs**)
2. Find your YouTube Scraper run from Lesson 1
3. Open the **Dataset** tab
4. Click **Export** and choose **JSON** or **CSV**

JSON preserves nested data and works in code. CSV opens in any spreadsheet app.

## 3. Access it via API

Every dataset has a unique API endpoint. You can fetch it from any script, app, or automation tool.

1. In the Dataset tab, click **API**
2. Copy the "Get dataset items" endpoint (it looks like `https://api.apify.com/v2/datasets/...`)
3. Click the "Test endpoint" button and a new tab will open.

Note: a live API token will be included in the URL. You can create and select one with limited permissions.

## 4. Chain Actors together

The real power of the platform is chaining: one Actor finishes and automatically triggers another. Apify supports this through its **Integrations** tab, which offers a few different kinds of connections.

Click the **Integrations** tab on any Actor's page and you'll find ready-made connections to services like Google Drive, Slack, and Gmail -- you can export datasets, send notifications, or trigger external workflows when a run finishes.

For chaining one Actor directly into another, the target Actor needs to accept a `datasetId` or `runId` as input (this is called being "integration-ready"). Many Actors in the Store support this, and they appear in the integration catalog when you click **Add integration**. If an Actor doesn't appear, it doesn't support automatic chaining.

The key insight is: data flows through datasets, and any Actor can read any dataset. Later in the workshop you'll use the CLI and MCP to chain Actors from your terminal or through your AI agent.

## 5. What just happened

You now know three ways to use data from an Actor: download it as a file, fetch it over HTTP as JSON, or chain it into another Actor. Chaining is the most powerful -- it lets you compose multiple scrapers without writing code between them.

## 6. Checkpoint

- [ ] Exported data as JSON or CSV from the console
- [ ] Accessed the dataset via its API URL
- [ ] Understand how Actor chaining works (datasets as the bridge between Actors)
- [ ] Know when to use export vs API vs chaining

When ready, open [lesson-3-mcp.md](./lesson-3-mcp.md).
