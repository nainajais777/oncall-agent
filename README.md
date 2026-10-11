# On-Call Agent
An AI agent that watches a Node.js API. When the API breaks, it reads the
logs, finds the bug, fixes the code, restarts the API and checks it works again.
Built for #neatHack (Oct 10–12, 2026).

## Why I'm building this
When an API breaks at night, it stays down until a developer wakes up,
reads the logs and finds the bug. Small teams don't have 24/7 on-call engineers.
This agent does the first response automatically: it finds the cause, applies a
small fix, verifies it, and leaves a report for the developer to review.

## My journey
I'm a full-stack developer (Node, React, web GIS) learning AI agents from
scratch during this hackathon. I'm writing down what I learn at each step below.

## What I learned
- **Day 1:** An AI agent is an LLM + tools (my own functions) + a loop that
  repeats until the task is done. The LLM only decides; my code does the work.
- **Day 2:**   ✏️ (all new)
  - **Retry with backoff:** 5xx errors are temporary, so retry and wait longer
    each time. 4xx errors are my mistake, so stop immediately.
  - **Model fallback:** if one model is busy, switch to another.
  - **Without tools, the LLM guesses.** With a `read_file` tool, it looked at the
    code and found the real bug.
  - **The LLM has no memory.** Every call, I resend the full conversation.
  - **Safety is enforced in my code, not by the LLM.** The agent can only read
    files inside `sample-api/`.
  - **The loop:** the agent decided by itself to list files first, then read the
    right one. `MAX_STEPS` stops it from looping forever and wasting money.