/**
 * AI coding tools (5 Nov 2026): ranked post ideas about AI coding CLIs and product tracking, from Ashish via another
 * bot, written up in the StatMuse voice (lead with the fact, little first person). Sources are public only: public
 * repos, docs and npm pages, never the private tracker repo. Public facts were checked on 5 Nov 2026, 00:56 to 01:05
 * GMT (publicChecks); anything still open is in checks.
 */

export type AiStatus = 'ready' | 'waiting' | 'needs-check'

export interface AiIdea {
  rank: number
  title: string
  text: string
  /** What to make for the post, shown on the card. */
  mediaPlan: string
  media: ('image' | 'diagram' | 'text')[]
  status: AiStatus
  /** Sources to post as the first comment; never in the post text. */
  firstComment: string
  freshUntil: string
  /** What was confirmed against public sources on 5 Nov. */
  publicChecks: string[]
  /** What is still open before posting. */
  checks: string[]
  /** Shown as a flag on the card. */
  caution?: string
  notes?: string[]
}

const p = (...paras: string[]) => paras.join('\n\n')

/** Ideas 4 and 5 are about Grok products. */
export const grokCaution = 'Touches Grok internals. Ashish’s call before posting, while he’s job-hunting.'

/** Short note shown on the section: what never goes in these posts. */
export const aiDontPost = [
  'No unreleased-looking model IDs.',
  'No Grok Bot desktop or dogfood internals.',
  'No logged-in harvests (for example grok.com connectors).',
  'No quoted prompt text from tools whose source isn’t public (Claude Code, Grok Build, Grok Bot).',
  'Avoid Grok internals in general while job-hunting.',
  'Cite public sources only: public repos, docs and npm pages.',
]

/** Lower priority: short items, not cards yet. */
export const aiLater = [
  {
    title: 'x.com feature switches',
    text: 'x.com sends 1,400 feature switches to logged-out browsers. Top prefixes: responsive 449, subscriptions 162, xchat 138.',
    check: 'Needs a re-harvest first: the snapshot is from September.',
  },
  {
    title: 'chatgpt.com flags',
    text: 'chatgpt.com shows logged-out visitors 68 readable flags.',
    check: 'Re-check the count on the day before writing it up.',
  },
]

const codexRepo =
  'Codex CLI, public source on GitHub (Apache-2.0): codex-rs/protocol/src/config_types.rs (SandboxMode) and codex-rs/protocol/src/protocol.rs (AskForApproval). Add the repo link by hand when posting.'
const codexLinkCheck =
  'The Codex repo URL is left off this page (the site’s word rules block model provider names); paste it into the first comment by hand.'

export const aiIdeas: AiIdea[] = [
  {
    rank: 1,
    title: 'Five AI coding CLIs, unpacked',
    text: p(
      'Five AI coding CLIs, unpacked from their Linux builds. Where each keeps its logic says more than any launch post.',
      'Codex is one static Rust binary: 304.6 MB, 85 crates, 413 third-party dependencies. The source is open.',
      'Claude Code is a single executable compiled with Bun, 322.2 MB, with its JavaScript bundle embedded. It links the system glibc.',
      'Grok Build is static Rust too: 186.6 MB, 92 crates, 471 dependencies.',
      'Gemini CLI is a 78.5 MB esbuild bundle with no runtime dependencies.',
      'Cursor’s agent is a 20.6 MB thin client. The system prompt and the tools live on Cursor’s servers.',
      'Three things stand out. Nobody wants you running npm install. Most of the size is dependencies plus the runtime, not the agent. And a prompt shipped in the client can be read and diffed between releases, while a prompt on the server can change with no release at all.',
      'If you’re building your own agent CLI, decide early whether you want users to see the prompt, or to get updates without reinstalling. You can’t have both.',
    ),
    mediaPlan:
      'A 5-column bento, one column per CLI: runtime, size, packaging, where the prompt lives. Numbers exactly as in the text.',
    media: ['diagram'],
    status: 'waiting',
    firstComment: p(
      '- Gemini CLI on npm (0 runtime dependencies; native node-pty and keytar are optional): https://www.npmjs.com/package/@google/gemini-cli',
      '- Codex CLI, public source on GitHub (Apache-2.0). Add the repo link by hand when posting.',
      '- Sizes, crate and dependency counts: measured from each CLI’s Linux build (versions listed here when posting).',
    ),
    freshUntil:
      'Until the next release of any of the five CLIs. Sizes and counts are for the Linux builds as unpacked; name each version in the first comment.',
    publicChecks: [
      'Codex is open source: the public Codex repo on GitHub is Apache-2.0 (checked 5 Nov).',
      'Gemini CLI has no runtime dependencies: the npm package @google/gemini-cli 0.67.0 lists 0 dependencies, only optional native ones (node-pty, keytar). Its npm unpacked size is larger than the 78.5 MB bundle because the package holds more than the bundle; the post gives the bundle size only.',
    ],
    checks: [
      'Add the version of each build to the first comment.',
      codexLinkCheck,
      'The Grok Build column is a Grok product. It states size and packaging only; drop it if Ashish wants no Grok at all.',
    ],
  },
  {
    rank: 2,
    title: 'Every agent has a plan mode now',
    text: p(
      'Codex, Claude Code and Gemini CLI all have a plan mode now. What differs is everything around it.',
      'Codex splits permissions in two. Sandbox modes: read-only, workspace-write, danger-full-access. Approval policies: untrusted, on-request, granular, never.',
      'Claude Code has one list of permission modes: default, acceptEdits, plan, auto, dontAsk, bypassPermissions.',
      'Gemini CLI has four approval modes: default, auto_edit, plan, yolo.',
      'The tool lists differ just as much. Codex has 8 tools and edits files with apply_patch. Claude Code has 24, with Edit and MultiEdit. Gemini CLI has 23, and its edit tool is called replace.',
      'Same idea in all three: read first, ask before writing and one switch that stops the asking. Before handing one your repo, check what its default mode can do without asking.',
    ),
    mediaPlan:
      'A comparison table: one row per CLI, columns for plan mode, permission or approval modes, tool count and the edit tool.',
    media: ['diagram'],
    status: 'needs-check',
    firstComment: p(
      `- ${codexRepo}`,
      '- Claude Code permission modes: https://code.claude.com/docs/en/permission-modes',
      '- Gemini CLI --approval-mode choices: https://github.com/google-gemini/gemini-cli/blob/main/packages/cli/src/config/config.ts',
      '- Gemini CLI tool names (replace is the edit tool): https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/tools/definitions/base-declarations.ts',
    ),
    freshUntil:
      'Fresh until about 19 Nov 2026. Mode names checked 5 Nov 2026 against the public repos and docs; these CLIs change weekly, so recheck on the day.',
    publicChecks: [
      'Codex sandbox modes read-only, workspace-write, danger-full-access: confirmed (SandboxMode in codex-rs/protocol/src/config_types.rs, main on 5 Nov).',
      'Codex approval policies: the public values are untrusted, on-request (on-failure is an alias), granular and never. The idea list had "untrusted, on-request, unless-trusted, never": UnlessTrusted is only the Rust name of untrusted, not a fifth value, and granular was missing. The text uses the public list.',
      'Codex has a plan mode: ModeKind Plan, one of the two collaboration modes shown in the TUI (config_types.rs).',
      'Codex edits with apply_patch: the public repo has an apply-patch crate.',
      'Claude Code: the public permission modes page lists six modes, default, acceptEdits, plan, auto, dontAsk and bypassPermissions. The idea list had four (no auto, no dontAsk). The text uses the six.',
      'Gemini CLI approval modes default, auto_edit, plan, yolo: confirmed as the --approval-mode choices (packages/cli/src/config/config.ts; inside the code auto_edit is stored as autoEdit).',
      'Gemini CLI edit tool is replace: confirmed (EDIT_TOOL_NAME in tools/definitions/base-declarations.ts).',
    ],
    checks: [
      'Tool counts (Codex 8, Claude Code 24, Gemini CLI 23) were not checked against public sources; they come from the builds. Check them, or cut the counts.',
      'MultiEdit: the Claude Code permissions docs call it a legacy tool, and the tools reference has no MultiEdit row. Check whether it still ships before naming it, or say Edit only.',
      codexLinkCheck,
    ],
  },
  {
    rank: 3,
    title: 'What Gemini CLI’s telemetry measures',
    text: p(
      'Gemini CLI’s public source names 105 telemetry events and metrics. Read together, they’re a list of the hard parts of building an agent.',
      'Loops: llm_loop_check, next_speaker_check. An agent has to notice when it’s going in circles, and decide who speaks next.',
      'Repairing output: edit_correction, malformed_json_response. Model output doesn’t always apply cleanly, so edits get fixed up and bad JSON gets caught.',
      'Fallbacks: flash_fallback, ripgrep_fallback, web_fetch_fallback_attempt. The model, the search tool and the web fetch each have a plan B.',
      'The terminal UI: ui.flicker.count, ui.slow_render.latency. A text UI that redraws while it streams can flicker, and someone measures it.',
      'Billing: overage_menu_shown, empty_wallet_menu_shown. Running out of quota is a screen too.',
      'None of this shows up in a demo. All of it shows up in daily use.',
    ),
    mediaPlan: 'Five grouped boxes (loops, repairing output, fallbacks, UI, billing), each with its telemetry names.',
    media: ['diagram'],
    status: 'waiting',
    firstComment: p(
      '- Gemini CLI telemetry events: https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/telemetry/types.ts',
      '- Gemini CLI metrics (ui.flicker.count, ui.slow_render.latency): https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/telemetry/metrics.ts',
      '- Billing events (overage_menu_shown, empty_wallet_menu_shown): https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/telemetry/billingEvents.ts',
    ),
    freshUntil:
      'Fresh until about 19 Nov 2026. The 105 is a count of main on 5 Nov 2026; recount before posting if it is later.',
    publicChecks: [
      '105 confirmed: the unique gemini_cli.* names in packages/core/src/telemetry/types.ts, metrics.ts, constants.ts and billingEvents.ts (main, 5 Nov) come to exactly 105. They are a mix of events and metrics (45 of them are defined in metrics.ts), so the text says "telemetry events and metrics", not "105 metrics".',
      'All eleven names in the text are in the public source: llm_loop_check, next_speaker_check, edit_correction, malformed_json_response, flash_fallback, ripgrep_fallback and web_fetch_fallback_attempt (events, types.ts); ui.flicker.count and ui.slow_render.latency (metrics.ts, as gemini_cli.ui.flicker.count and gemini_cli.ui.slow_render.latency); overage_menu_shown and empty_wallet_menu_shown (billingEvents.ts).',
    ],
    checks: ['The one-line readings of each group are plain inferences from the names; keep them that cautious.'],
  },
  {
    rank: 4,
    title: 'Grok Build imports rival setups',
    text: p(
      'Grok Build can bring in another agent’s setup.',
      'Its build has compat.claude, compat.codex and compat.cursor settings covering agents, hooks, MCP servers, rules and skills, plus two commands: /import-claude and /migrate-workflow.',
      'That fits a wider shift. AGENTS.md, skills and MCP are turning into shared formats, so the cost of switching agents keeps falling. A setup built for one tool works more and more in the next.',
    ),
    mediaPlan: 'Text only, or a simple three-in, one-out diagram (Claude Code, Codex, Cursor setups into Grok Build).',
    media: ['text'],
    status: 'needs-check',
    caution: grokCaution,
    firstComment:
      '- Only public sources: Grok Build docs or release notes that mention importing, once they exist. Nothing from the binary itself.',
    freshUntil: 'Until the import feature is documented or released; recheck then.',
    publicChecks: [],
    checks: [
      'No public source checked yet: the names come from the binary. Find a public doc or release note first, or post it with the caveat only.',
      grokCaution,
    ],
  },
  {
    rank: 5,
    title: 'A flag’s name isn’t the feature',
    text: p(
      'A flag’s name isn’t the feature.',
      'On 22 Jul 2026 a product tracker picked up a new flag on grok.com: ENABLE_IMAGINE_VIDEO_AUDIO_TOGGLE. Then the feature launched, and the tracker missed it. Five reasons.',
      '1. The flag was one line in a noisy diff.\n2. A flag’s name isn’t its value. The tracker saw that the flag existed, not whether it was on.\n3. The label wasn’t in the i18n map, so there was no user-facing text to match.\n4. The release notes were silent.\n5. Live per-user values weren’t recorded, on purpose, for privacy.',
      'Flags tell you what’s being built. Controls tell you what shipped.',
    ),
    mediaPlan:
      'A timeline: flag first seen (22 Jul 2026), the launch, then the fix (tracking UI controls). Good as a LinkedIn article with the timeline as its cover.',
    media: ['diagram'],
    status: 'needs-check',
    caution: grokCaution,
    firstComment: '- Only public sources: the public release note or page for the launch, if there is one.',
    freshUntil: 'No expiry: a story about 22 Jul 2026.',
    publicChecks: [],
    checks: [
      'Confirm the flag was seen logged out (no logged-in harvest), and find a public launch note to cite.',
      grokCaution,
    ],
  },
  {
    rank: 6,
    title: 'Gemini CLI’s README drops the free tier',
    text: p(
      'Gemini CLI’s README now sends free users and Google One subscribers to another tool.',
      'The notice at the top says free individual access and Google AI Pro and Ultra moved to Antigravity CLI on 18 June 2026. Gemini CLI is now described as built for Gemini Code Assist Standard and Enterprise on Google Cloud, plus older paid API and Vertex keys.',
      'The free-tier lines are gone too. The README used to promise 60 requests a minute and 1,000 a day with a personal Google account. That copy came out on 16 October.',
      'Same repo, same name, different audience. Anyone who installed it for the free tier now needs a different product.',
    ),
    mediaPlan: 'Text only. Optional: a crop of the README’s notice, which is public.',
    media: ['text'],
    status: 'ready',
    firstComment: p(
      '- Gemini CLI README today: https://github.com/google-gemini/gemini-cli/blob/main/README.md',
      '- Free-tier copy removed, 16 Oct 2026 (#29775): https://github.com/google-gemini/gemini-cli/commit/b25669d84e1a404e30c176d779e732e25dafcec0',
      '- Antigravity CLI notice added, 16 Oct 2026 (#29774): https://github.com/google-gemini/gemini-cli/commit/21976e977ef833e9a03538119eac933fe89767a7',
      '- Transition post: https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/',
    ),
    freshUntil:
      'Until the README changes again. Checked 5 Nov 2026 against main (last README change b8fa817, 28 Oct 2026).',
    publicChecks: [
      'Confirmed in the public README (main, 5 Nov): "Free individual access and Google AI Pro / Ultra (Google One) moved to Antigravity CLI on June 18, 2026", and Gemini CLI is for Gemini Code Assist Standard / Enterprise and Code Assist for GitHub on Google Cloud, plus legacy paid API / Vertex keys.',
      'Confirmed in the git history: commit 21976e9 (#29774, 16 Oct 2026) added the notice that unpaid tier and Google One users were moved to Antigravity CLI on 18 June 2026; commit b25669d (#29775, 16 Oct 2026) deleted the three free-tier lines ("60 requests/min and 1,000 requests/day with personal Google account", twice, and "1000 requests/day"). Commit b8fa817 (#29995, 28 Oct 2026) rewrote the notice into today’s wording.',
      'So the 18 June 2026 date is the move itself, as the README states it; the README copy changed in October.',
    ],
    checks: [],
  },
  {
    rank: 7,
    title: 'Watching 40 product surfaces for $0.41 a day',
    text: p(
      'About 40 product surfaces, watched for changes, for $0.41 a day.',
      'Most of the work is kept away from the model.',
      'Extraction is deterministic: the same page gives the same output every time.',
      'Every snapshot goes into an immutable store, so any two days can be compared.',
      'The diffs are plain diffs. No model decides what changed.',
      'The model only writes the summary. On 3 Nov that was 55 calls and 146k input tokens.',
      'Here’s how to build one: get extraction stable first, keep every snapshot and bring the model in only once you know what changed.',
    ),
    mediaPlan: 'A pipeline diagram: extract, snapshot store, diff, summary, with the model only on the last step.',
    media: ['diagram'],
    status: 'waiting',
    firstComment:
      '- No outside sources: the numbers are from the tracker’s own run on 3 Nov 2026. Link no code or files from the private repo.',
    freshUntil:
      'Fresh until about 19 Nov 2026. The cost and token figures are for 3 Nov; use the latest day if posting later.',
    publicChecks: [],
    checks: ['Frame it as how-to, not a showcase. Name no files from the private repo.'],
  },
]
