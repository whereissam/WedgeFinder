# Lesson 3: Connect your agent with MCP

**Goal:** Give your AI assistant access to live web data by connecting Apify's MCP server.

**Time:** ~15 minutes

---

MCP (Model Context Protocol) is a standard way for an AI assistant to call external tools. Apify runs a hosted MCP server, so once you connect it, your assistant can run any Apify Actor and pull back live web data on its own.

## 1. Get your API token

1. Sign in at [console.apify.com](https://console.apify.com)
2. Click your avatar (top-right) -> **Settings** -> **API & Integrations**
3. Copy your **Personal API token** and keep this tab open

> Treat this token like a password. Don't paste it into a public chat or share your screen with it visible.

## 2. Connect the MCP server

Choose the option that matches your setup.

### Option A: Coding agent (Claude Code, Cursor, Codex)

Follow the instructions at **[mcp.apify.com](https://mcp.apify.com)**. That page provides the exact configuration block for your specific tool.

Before copying your config, make sure these are enabled:

1. **Preloaded Actors:** click "Add Actors" and add **RAG Web Browser** and **Google Maps Scraper**
2. **Custom tools:** enable **Actor discovery** so your agent can search the Store for other tools

Then paste the config block into your tool's MCP settings.

> If you aren't logged in on the mcp.apify.com page, find your API token in the Apify Console under [Settings -> Integrations](https://console.apify.com/settings/integrations).

### Option B: Chat app (Claude, ChatGPT)

1. Open **Settings** -> **Connectors**
2. Click **Add custom connector**
3. Name it `Apify` and paste the URL `https://mcp.apify.com`
4. Complete the authorization -- your browser will redirect to Apify's login page. If your assistant asks for a token instead, paste the one from step 1.

> Menu labels change as these products update. You're looking for wherever your assistant lets you add a custom MCP server.

## 3. Verify the connection

Open a **new** chat (connectors only work in chats started after you connect) and ask:

```
What tools do you have available?
```

Your assistant should list Apify scraping tools. If it doesn't, go back to step 2 and reconnect -- check the URL and that you completed the authorization.

## 4. Run your first MCP query

```
Use Apify to find the top 5 most-viewed YouTube videos about "AI agents"
from the last month. Give me titles, view counts, and links.
```

The first time, your assistant may ask permission to use the connector. Say yes.

Try a different domain:

```
Use Apify to get the current top 10 hotels in Lisbon on Booking.com
with their nightly price and rating.
```

## 5. Add any actor to your agent

With **Actor discovery** enabled, your agent can use any of the 2,000+ Actors in the Store on demand. Try using the Google Maps tool without preloading it:

```
Use Apify to find 3 coffee shops in Prague using Google Maps.
Show me their names and ratings.
```

### How it works behind the scenes

When you ask for something from a source that isn't preloaded, the agent takes these steps:

1. **Search:** calls `apify.store.search` to find a matching Actor in the Store
2. **Select:** inspects the Actor's details and picks the best one
3. **Run:** calls `apify.actor.run` to execute it on the platform
4. **Deliver:** returns the structured data

This happens automatically. Your agent handles the discovery, you just ask.

## 6. Checkpoint

- [ ] API token copied
- [ ] MCP server connected (Option A or B)
- [ ] Agent verified the connection by listing tools
- [ ] YouTube and Booking.com queries returned live data
- [ ] Agent found and ran a Google Maps Actor through natural language

When ready, open [lesson-4-apify-cli.md](./lesson-4-apify-cli.md). If you don't code, skip to [recipes.md](./recipes.md) for ready-to-use prompts instead.
