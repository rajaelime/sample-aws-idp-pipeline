---
name: searching
description: "Search documents and knowledge graph for information. Combines hybrid search, graph traversal, and keyword graph lookup. Use when user asks questions, requests information lookup, needs explanations, summaries, or comparisons from uploaded documents."
whenToUse: "Any user question requiring information lookup. When in doubt, use this skill."
---

# Search Skill

Document search is always the first priority. Web search is a fallback only after document search returns insufficient results.

Do NOT mention internal search strategy or tool selection reasoning to the user. Just search and answer.

## Document Search

For most questions, search documents first:
1. `search___summarize` with the query
2. Extract `qa_ids` from the `sources` array in the result
3. `search___graph_traverse` with the same query + extracted `qa_ids`
4. Combine results and answer with citations

## Keyword Graph Search

When the user asks about a specific concept or keyword:
1. `search___graph_keyword` with the keyword/concept
2. Answer based on connected pages found

Can be used alone or combined with document search for comprehensive results.

## Web Search (fallback only)

Only after document search returned insufficient results:
1. `search` (DuckDuckGo) for web queries
2. `fetch_content` on 3+ URLs from results
3. Clearly distinguish document vs. web sources in the answer

## Tools

- `search___summarize` — hybrid search on uploaded documents
- `search___graph_traverse` — find related pages via entity connections (pass `qa_ids` from summarize results)
- `search___graph_keyword` — find pages by keyword similarity in the knowledge graph
- `search` — web search via DuckDuckGo (fallback)
- `fetch_content` — fetch full content from a web URL

## Citations

Use inline citations naturally within the text. For document results, reference the source document and section. For web results, include the URL.

Do not fabricate information or citations that don't exist in search results.
