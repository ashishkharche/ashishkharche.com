/**
 * Compact LinkedIn paste text for every drafts-board card (5 Nov 2026).
 * Each entry is one short paragraph (about 3-4 sentences): hook, facts, interesting close.
 * Facts are taken only from that card's longer detailed text. The detailed text stays on the
 * card as longerText; this file is what Copy for LinkedIn pastes.
 */
export const compactTexts: Record<string, string> = {
  d1: 'The deadlift counter watches one number: the hip angle. Stand up past 160°, hinge down past 125°, cover most of that range, and that is a rep. Jitter and half reps get filtered out, joint points go through a One Euro filter, and once you have done one proper rep the top line moves to fit you, sitting 12% of your own range below your highest reading.',

  d2: 'BlazePose Full got 79% of joints close to the right spot. Lite got 72%. That is from 156 single-person photos in the COCO validation set. Heavy was more accurate but would have added 21 MB and run about three times slower than Full, so Full is the one that ships. Late frames are skipped instead of queued, and if the phone still cannot keep up the workout switches to Apple Vision for the rest of that session.',

  d3: 'Most of the work in counting reps with a phone camera is not counting the things that are not reps. Nothing counts until the counter has seen the joints it needs on every frame for half a second. After that, a rep has to cover most of the distance between its two lines, cannot be rushed, and cannot land right on top of the last one.',

  // sample-a keeps its withheld placeholder; no compact body is shipped on the site.

  'wd-b2-2':
    'Sometimes an old build has to go. Every time Workout Director opens or comes back to the foreground, it asks the backend for the minimum iOS version, and any request from a build below that minimum gets a 426. The update screen has no close button, so the backend caches the minimum for 60 seconds and the phone ignores any minimum at or below its own version.',

  'wd-b2-3':
    'The trainer chat looks simple: you type, it answers. Most of the work is what goes into each request. Stable parts go first so the prompt cache can reuse them, long chats fold everything but the newest 24 messages into a short summary, and replies have a fixed shape. If a flaky connection sends the same message twice, the backend returns the stored reply instead of asking the model again.',

  'wd-b2-4':
    'Every exercise figure in Workout Director is a render of the same 3D body. None of them is drawn by hand. The body is MakeHuman base mesh, posed in Blender to match joint angles from reference clips, then turned into line art with Freestyle. Switching the mesh modifiers off while the bones are solved took a bent-over row from about six minutes to under one.',

  'wd-b2-6':
    'One deadlift set as the counter sees it: by eye she does three full reps and starts a fourth, but the counter says 2. Rep 1 comes out of a long set-up and never stood up straight around it. Reps 2 and 3 pass together. Rep 4 is still on the way up when the clip ends.',

  'wd-b3-1':
    'Every rep Workout Director counts comes from one joint angle crossing two lines. Once you have done one rep of at least 15°, the start line moves to fit you, 12% of your range in from your own highest or lowest angle. Your range is saved per exercise, the finish line never gets stricter than the default, and a rep still has to cover at least 20°.',

  'wd-b3-2':
    'At the bottom of a side-on deadlift, the far plate can hide the near ankle and drop pose confidence below what the counter normally needs. Losing a rep over one hidden ankle felt wrong when the hip and knee are in plain view. So if those two are still clear and the ankle has not faded too far, the counter keeps the leg in view for up to 3 s.',

  'wd-b3-3':
    'BlazePose Full found 115 of 191 barbell deadlift reps on the MyDeadlift clips. Lite found 106. Same reps, same counter, only the pose model changed, and neither counted more reps than a clip actually had. The clips are single reps joined end to end, and the numbers have not been re-run since the deadlift fix.',

  'wd-b3-4':
    'When the voice coach loses its connection, counting carries on and the screen says the coach is reconnecting. The phone keeps retrying, waiting longer each time from 1 second up to 30, and stops once the next wait would pass two and a half minutes. A slow network gets fewer tries, because each connection attempt comes out of that same budget.',

  'wd-b3-5':
    'The voice coach has two limits on the lines it starts on its own, so it does not chatter through a set. One is a minimum gap between lines; the other is a cap per set on form, stall and out-of-view lines. Pain, a form break and the workout wrap-up skip the gap but still wait for 2.5 s of quiet, while a stall or stepping out of view only gets a line after 20 s.',

  'wd-b3-6':
    'A single rep on its own is suspicious, so for curls, presses, rows, squats and deadlifts the counter holds the first rep for up to 8 seconds. If another comes, both count; if none comes, that lone bend is dropped. On curls that took false reps from 35.4 an hour down to 3.4, at a cost of 2.0% of real reps.',

  'wd-b4-p1':
    'Workout Director is an iPhone app for training at the gym or at home. Prop the phone up, press Start, and it counts reps with the camera. It covers squats, lunges, push-ups, pull-ups, curls and rows, plus lifts like bench press, deadlifts and hip thrusts, with planks timed, all on the iPhone itself and with no sign-in needed for a camera workout.',

  'wd-b4-fig1':
    'Workout Director comes with data for 869 exercises from free-exercise-db, but only offers the ones that have a figure, and right now that is 119. Four figures do double duty, so 115 figures cover those 119. The other 750 exercises are not offered until they have a figure.',

  'wd-b4-tech1':
    'Workout Director counts reps from the phone camera, with pose tracking and counting running on the iPhone. The pose model ships inside the app: BlazePose Full, loaded from a file in the app bundle. It runs on the GPU, falls back to the CPU, and after that to Apple on-device Vision pose estimation.',

  'wd-b5-1':
    'A public plank clip labelled 9 seconds gets 2 seconds on Workout Director plank clock. The clock only runs while shoulder, hip and ankle make a near-straight line of at least 150°, with the body no more than 40° off horizontal. Most of that labelled hold sits just under the straight line, and the clock is meant to be strict, not flattering.',

  'wd-b5-2':
    'Push-ups filmed by a friend make the elbow angle jumpy, so one wobble can look like a dip. The counter takes the middle value of every 3 frames, needs the elbow past the bottom line for 2 frames, and checks for blur. On a public kettlebell push-up clip the raw angle dips 8 times; with the filter it is 3.',

  'wd-b5-3':
    'On 28 October the row counter counted just setting up: it saw an elbow bend and decided that was a row. Rows now only count when you are bent over and still, with hips and knees in view. A saved excerpt with only arm joints swings through one rep three times, and the counter counts zero.',

  'wd-b5-4':
    'The rep counter is being ported from Swift to Kotlin, so looking right on a few sets was never going to be enough. iOS writes what the counter outputs on every frame, and the Kotlin test has to match frame by frame. There are 140 saved inputs, 110 of them synthetic, and the catch is it still matches the iOS counter as of 23 October.',

  'wd-b5-5':
    'A long set warms the phone up, so the counter paces the camera to match. Normally it processes 30 frames a second; when the phone reports it is seriously hot, or Low Power Mode is on, that drops to 15, and at critical camera counting stops. What this does for battery has not been measured yet.',

  'wd-b5-6':
    'On the emulator, the pose model GPU setup built without complaint, then failed on the very first frame with GL_INVALID_ENUM. The code only fell back to the CPU when setup itself failed, so pose detection just died. The fix catches a failed frame and switches to the CPU for the rest of the process.',

  'wd-b6-1':
    'A number on its own does not tell you much, so the targets on the Today screen come with one plain line explaining them. Finish all your sets and it asks for a bit more; a hard or sore last session keeps the target the same; an unfinished session aims for your last full one. The line is worked out from logged sessions with fixed rules, and says nothing when there is nothing true to say.\n\nFree on the App Store.',

  'wd-b6-2':
    'In the gym it is an RDL, not a Romanian deadlift, and the exercise search used to miss most of those names. Now RDL finds the Romanian deadlift, and when a result came from another name it says so underneath. Case, accents, spaces and hyphens do not matter, but a short search will not match inside a word.\n\nFree on the App Store.',

  'wd-b6-3':
    'A plan is only useful until the day does not go to plan, so the Today screen has Fit my day. Pick how long you have got, say you are tired or have no equipment, or swap a move you cannot do for one that works the same muscles. It shows the change as it makes it, like "45 → 25 min · 6 → 4 moves", and applies for today only.\n\nFree on the App Store.',

  'data-1':
    'Four of the top 10 free iPhone apps in the US are AI assistants. Muse is No. 2, ChatGPT No. 4, Claude No. 7 and Google Gemini No. 9, as of 4 November. Muse listing says it manages email, books dinners and finds deals with your approval. Once an assistant books the table, clear actions and solid deep links start to matter as much as the screens.',

  'data-2':
    'Only three apps in the US top 100 have averaged more App Store ratings a day than Muse from Meta. In 57 days since 8 September it has 438,257 US ratings, about 7,700 a day. Facebook, YouTube and ChatGPT sit ahead, averaged over years. When you ask for the rating, and who you ask, moves this number more than the app itself does.',

  'data-3':
    'Flutter has 17 times as many open GitHub issues as React Native: 12,761 against 738. React Native runs a stale bot that closes quiet issues after 180 days plus 7; Flutter bot only closes issues that have been waiting 21 days on the reporter. The same open count means different things, so when choosing a framework, skip this number.',

  'data-4':
    'Only four of the top 100 free iPhone apps in the US need iOS 26, and Microsoft makes three of them. Copilot, Outlook and Word all need iOS 26.0; Netflix is the fourth. The most common minimum is still iOS 18.0, and 75 of the 100 still support iOS 17 or older. Raising the deployment target is a one-line change; explaining it to the people it locks out is the hard part.',

  'data-5':
    'React Native npm downloads are up 4.5x in a year. React downloads are up 4.9x. Last week react-native was downloaded 20.5 million times, against 4.6 million in the same week a year earlier. Measured against React, React Native is flat or a little behind, while Expo at 6.3x and Capacitor at 8.6x grew faster.',

  'data-6':
    'Swift and Objective-C are the only two of five mobile languages that get more use as developers get more experienced. Swift goes from 5.1% at 1 to 5 years to 6.6% at 16+; Kotlin, Java and Dart all fall. A likely read: newer developers pick tools that get them onto both platforms fast, while Swift and Objective-C are where people end up after years on Apple platforms.',

  'data-7':
    'Three of the four lowest-rated apps in the UK top 50 free Health and Fitness chart are gym apps. Better UK is on 1.56 stars, JD Gyms on 1.63 and ClubRight on 2.22. PureGym is No. 1 on the same chart at 4.73. Nobody chooses these apps; you install them because the gym tells you to, often for the QR code that opens the door.',

  'data-8':
    'Four of the five smallest apps in the UK top 100 free chart are government apps. The NHS App is 14 MB, GOV.UK ID Check 29 MB, HMRC 36 MB and GOV.UK One Login 48 MB. The median app in that chart is 257 MB, and TikTok is 1,080 MB. People feel app size on older phones, on full storage and on slow connections.',

  'ai-1':
    'Five AI coding CLIs unpacked. Codex and Grok Build are static Rust binaries, Claude Code is a single Bun-compiled executable, Gemini CLI is one bundle with no runtime dependencies, and Cursor agent is a 20.6 MB thin client whose prompt lives on Cursor servers. The interesting part is the choice between shipping the prompt in the app and keeping it on the server.',

  'ai-2':
    'Codex, Claude Code and Gemini CLI all have a plan mode now. What differs is everything around it: Codex splits sandbox modes and approval policies, Claude Code has one list of six permission modes, and Gemini CLI has four approval modes. Same idea in all three: read first, ask before writing, and one switch that stops the asking.',

  'ai-3':
    'Gemini CLI public source names 105 telemetry events and metrics. Read together they cover loops, repairing bad output, fallbacks, terminal UI flicker and billing screens for running out of quota. None of this shows up in a demo. All of it shows up in daily use.',

  'ai-4':
    'Grok Build can bring in another agent setup. Its build has compat settings for Claude, Codex and Cursor covering agents, hooks, MCP servers, rules and skills, plus /import-claude and /migrate-workflow. That fits a wider shift toward shared formats, but a name in a binary is not proof the feature has shipped.',

  'ai-5':
    'A flag name is not the feature. On 22 Jul 2026 a product tracker picked up ENABLE_IMAGINE_VIDEO_AUDIO_TOGGLE on grok.com, then missed the launch for five reasons, from a noisy diff to silent release notes. The fix was to track the UI controls themselves, not just the flags behind them. Flags tell you what is being built. Controls tell you what shipped.',

  'ai-6':
    'Gemini CLI README now sends free users and Google One subscribers to another tool. Free individual access and Google AI Pro and Ultra moved to Antigravity CLI on 18 June 2026, and the old free-tier promise of 60 requests a minute and 1,000 a day came out of the README on 16 October. Same repo, same name, different audience.',

  'ai-7':
    'About 40 product surfaces, watched for changes, for $0.41 a day. Extraction is deterministic, every snapshot goes into an immutable store, and the diffs are plain diffs with no model deciding what changed. The model only writes the summary: on 3 Nov that was 55 calls and 146k input tokens.',
}

/** Posts that keep a withheld placeholder instead of a compact body on the site. */
export const compactWithheld = new Set(['sample-a'])
