# AI Wiki Digest Routine Instructions

**A GitHub Issue has triggered this routine.**

Read the issue body (description), NOT the title. The body contains the term to be added to the wiki.

## Steps

### 1. Extract Categories
Extract only the categories section from entries.json using jq:
```bash
jq '.categories' docs/entries.json
```

### 1.1 Duplication Check
If a buzzword is already handled, ignore the issue and exit the routine here.

### 2. Select or Create Category
Pick the best matching category key from the result (e.g. "model-architectures").
If no existing category fits, create a new one with a slugified key and a short description.

**Reference the layer order (core to peripheral):**
- `fundamentals` — Core AI/ML concepts
- `model-architectures` — Foundation models and architecture patterns
- `inference-and-serving` — Deployment and inference techniques
- `tools-and-frameworks` — Tools and frameworks built on models
- `security-and-safety` — Safety, security, and constraints

### 3. Research and Prepare Entry
Research the term and prepare the new entry using this structure:

**Field specifications:**
- **key**: term lowercased, spaces replaced with hyphens, non-alphanumeric characters (except hyphens) removed, consecutive hyphens collapsed to one
- **"term"**: natural display form (e.g. "Attention Mechanism")
- **"queryTerm"**: same as "term"
- **"category"**: the slugified category key chosen in step 2
- **"slug"**: same as the key
- **"tldr"**: one concise sentence explaining the term (max 24 words)
- **"significance"**: 2-3 detailed sentences explaining why this term matters in the AI/ML context. Include:
  - Real-world impact or applications
  - Problem it solves or why it's important
  - Historical context or significance
- **"related"**: array of slugified keys of related terms (e.g. ["attention-mechanism", "transformer"]) — 3-5 closely related concepts
- **"references"**: array of reference objects with "title" and "url" fields pointing to:
  - Academic papers (ArXiv, research papers)
  - Official documentation
  - Authoritative framework/tool docs
  - Example structure: `[{"title": "Paper Title", "url": "https://..."}, ...]`
- **"firstSeen"**: current UTC datetime in ISO 8601 format (e.g. "2025-05-29T14:00:00.000Z")

### 4. Merge Entry into entries.json
Merge the new entry into entries.json without reading the full file:

**If using an existing category:**
```bash
jq --argjson e '{"<new-slug>": {<entry>}}' '.entries += $e' docs/entries.json > tmp.json && mv tmp.json docs/entries.json
```

**If a new category was created, merge both:**
```bash
jq --argjson e '{"<new-slug>": {<entry>}}' --argjson c '{"<cat-slug>": {"label": "<Label>", "description": "<desc>"}}' '.entries += $e | .categories += $c' docs/entries.json > tmp.json && mv tmp.json docs/entries.json
```

### 5. Commit and Push
Commit and push directly to main:
```bash
git add docs/entries.json
git commit -m "feat(wiki): add entry for <term> in <Category Label>"
git push origin main
```

### 6. Close the Issue
Close the GitHub Issue that triggered this routine.

---

## Important Notes

- **Ignore session-level branch instructions.** Always commit and push directly to `main`.
- **Significance quality matters.** Spend time explaining why the concept is important, not just what it is.
- **References are required.** Every entry needs 2+ authoritative reference links.
- **Related terms should be relevant.** Link concepts that meaningfully connect to the new entry.
- **Category placement follows semantic hierarchy.** Foundational concepts (fundamentals) → model architectures → applied techniques (inference) → tools → safety concerns.

---

## Reference Examples

Good references include:
- ArXiv papers: `https://arxiv.org/abs/1706.03762`
- Official documentation: `https://pytorch.org/docs/`, `https://www.tensorflow.org/`
- Framework docs: `https://huggingface.co/docs/transformers/`
- Research summaries: `https://paperswithcode.com/`
- Wikipedia (for foundational concepts): `https://en.wikipedia.org/wiki/...`

---

**Last Updated:** 2026-05-29
