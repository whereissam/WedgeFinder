# Lesson 5: Install Agent Skills

**Goal:** Understand what Agent Skills are and install the two Apify skills into your coding tool.

**Time:** ~10 minutes

---

## 1. What are agent skills?

Agent Skills are structured instruction files that teach your AI coding agent domain-specific knowledge about a platform or workflow. They tell the agent which tools to use, which patterns to follow, and which best practices to apply, without you having to explain it every time.

When you install an Apify Agent Skill, your coding agent learns how to use the Apify CLI, which Actors to call for different scraping tasks, and how to build and deploy new Actors from scratch.

Apify ships two skills:

| Skill | What it teaches your agent |
| --- | --- |
| **Ultimate Scraper** (a.k.a. Apify Central) | How to scrape any major platform using existing Apify Actors -- Google, Instagram, Hacker News, Amazon, and dozens more |
| **Actor Development** | How to build, test, and deploy new Apify Actors from a single prompt -- project scaffolding, scraper logic, schemas, and deployment |

## 2. Install both skills

Agent Skills are installed via `npx skills`, an npm-based tool for fetching and registering skill files with your coding agent.

Run this in your terminal:

```bash
npx skills add apify/agent-skills
```

Select both the Ultimate Scraper and the Actor Development skills when prompted.

Once installed, confirm your agent can see them:

> What Apify Agent Skills are available to me?

## 3. How the skills work

When you ask your agent to scrape something, the Ultimate Scraper skill tells it:

- Which Apify Actor handles that platform
- How to structure the input
- Which CLI command to run

When you ask your agent to build an Actor, the Actor Development skill tells it:

- How to scaffold the project
- Which files to create (input schema, output schema, scraper logic, metadata)
- How to test locally
- How to deploy with `apify push`

Your agent already knows how to write code. These skills give it the Apify-specific knowledge to turn code into deployed, running Actors.

## 4. MCP vs. agent skills: Which one to use?

You now have two ways to connect your agent to Apify:

- **MCP:** Best for quick data retrieval. Use it when you want the agent to grab some data from the web and bring it into your current conversation.
- **Agent Skills:** Best for coding and building. Use these when you want the agent to use the Apify CLI, automate complex data pipelines, or build and deploy new Actors (which you'll do in the next lesson).

## 5. Practical exercise: Research a topic

Let's test the **Ultimate Scraper** skill with a focused task. Ask your agent:

> Use Apify to search Google for 3 recent articles about "building AI agents in 2025". Give me the title, source, and a one-sentence summary for each.

The skill tells your agent which tool to call and how to structure the Google Search input. You should get three results with clean summaries within a minute.

## 6. Checkpoint

- [ ] Both skills installed and confirmed by the agent
- [ ] Google Search returned articles with summaries

When ready, open [lesson-6-build-your-own.md](./lesson-6-build-your-own.md).
