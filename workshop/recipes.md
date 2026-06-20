# Recipe gallery: ready-to-paste chains

**Goal:** Five working "chain it" recipes you can run in minutes. Each one points your agent at a real data source and gets structured data back. Use them as-is, or as seeds for your hackathon project.

**Time:** ~5 minutes each (pick 1-3 that match your project; you don't need to do all five)

> **Before you start:** You need the Apify MCP server connected. See [lesson-3-mcp.md](./lesson-3-mcp.md) to set it up. Every recipe below is a prompt you paste into your connected agent, no code required.

---

Each recipe follows the same shape: **the source -> the prompt -> what you get back -> an idea for going further.** "Going further" is where your agent would act on the data; that part is yours to build at the hackathon.

## Recipe 1: Price watch (Amazon)

**Source:** an Amazon product scraper Actor.

**Prompt:**

```
Use Apify to get the current price, rating, and review count for the
top 5 results on Amazon for "mechanical keyboard". Return it as a table.
```

**You get:** product titles, prices, ratings, review counts, links.

**Go further:** ask your agent to flag any result below a target price. In a production setup you'd schedule regular checks and act on price drops; the pattern here is get data, decide, act.

## Recipe 2: Local market scan (Google Maps)

**Source:** a Google Maps scraper Actor.

**Prompt:**

```
Use Apify to find coffee shops in Kreuzberg, Berlin. For each, give me
the name, rating, number of reviews, and whether they're open now.
Sort by rating.
```

**You get:** business listings with ratings, review counts, hours, contact info.

**Go further:** have the agent draft outreach to the top-rated ones, or compare two neighborhoods for a "where should I open X" decision.

## Recipe 3: Content radar (YouTube)

**Source:** the YouTube scraper from Lesson 1.

**Prompt:**

```
Use Apify to find YouTube videos about "AI agents" uploaded in the last
7 days with over 10,000 views. Summarize the common themes across them.
```

**You get:** fresh video metadata (titles, views, dates, channels) plus your agent's synthesis.

**Go further:** ask your agent to summarize the common themes across the results. In a production setup, you'd compile this into a recurring digest; the pattern here is gather, synthesize, decide.

## Recipe 4: Travel deal finder (Booking.com)

**Source:** a Booking.com scraper Actor.

**Prompt:**

```
Use Apify to find hotels in Lisbon for a 2-night stay next weekend
under €150/night with a rating above 8.5. List the top 5 with prices.
```

**You get:** hotel names, nightly prices, availability, ratings.

**Go further:** ask your agent to flag hotels that match your budget and criteria. In a production setup, you'd alert when a target drops in price; the pattern here is filter, rank, decide.

## Recipe 5: Lead and company research (LinkedIn)

**Source:** a LinkedIn company/jobs scraper Actor.

**Prompt:**

```
Use Apify to pull recent job postings from LinkedIn for "machine learning
engineer" roles at companies in Germany. Give me company, title, and
location for the 10 most recent.
```

**You get:** structured job or company data.

**Go further:** have the agent enrich each company (cross-reference with another Actor) and rank them against criteria you define.

---

## Finding more Actors

These five use popular Store Actors, but there are thousands more. To discover one for your own data source, ask your connected agent:

```
Use Apify to search the Store for an Actor that can scrape [your source].
What are my options?
```

If nothing fits your source, that's your signal to **build** one; head to [lesson-6-build-your-own.md](./lesson-6-build-your-own.md).

## Checkpoint

- [ ] Ran at least one recipe end-to-end and got live data back
- [ ] Tried the "go further" extension on one recipe
- [ ] Know how to search the Store for a new Actor

Stuck on what to do next? Head back to the [README](./README.md) for the full workshop map.
