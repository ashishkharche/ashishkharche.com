/**
 * Compact LinkedIn paste text for every drafts-board card (5 Nov 2026).
 * Plain X-style notes: one line naming the thing, optional second short fact line.
 * No colon-led lists, stacked stats, wrap-ups or commentary.
 * Facts come only from that card's longer detailed text. The detailed text stays on the
 * card as longerText; this file is what Copy for LinkedIn pastes.
 */
export const compactTexts: Record<string, string> = {
  d1: 'Deadlift reps need the hip past 160° up and 125° down. After one proper rep the top line sits 12% of your range below your highest reading.',

  d2: 'BlazePose Full hit 79% of joints close on 156 COCO photos, Lite 72%. The app ships Full; Heavy would add 21 MB and run about 3x slower.',

  d3: "Nothing counts until the joints are seen for half a second. A rep then has to cover most of the gap between its lines, and can't be rushed or stacked on the last one.",

  // sample-a keeps its withheld placeholder; no compact body is shipped on the site.

  'wd-b2-2':
    'Workout Director asks the backend for the minimum iOS version on open and on return. Builds below that get a 426.',

  'wd-b2-3':
    'Trainer chat puts stable prompt parts first for cache reuse, and folds older chat past the newest 24 into a summary. A repeated message id returns the stored reply.',

  'wd-b2-4':
    'Every exercise figure is a Blender render of the same MakeHuman body, posed to joint angles from reference clips. Turning mesh modifiers off while bones solve cut a bent-over row from about six minutes to under one.',

  'wd-b2-6':
    'By eye the clip has three full deadlift reps and a fourth start; the counter says 2. Rep 1 never stood up straight after a long set-up, and rep 4 was still rising when the clip ended.',

  'wd-b3-1':
    'Each counted rep is one joint angle crossing two lines. After one rep of at least 15°, the start line moves in 12% of your range, and a rep still has to cover at least 20°.',

  'wd-b3-2':
    'At the bottom of a side-on deadlift the far plate can hide the near ankle. If the hip and knee stay clear, the counter keeps the leg in view for up to 3 s.',

  'wd-b3-3':
    'BlazePose Full found 115 of 191 barbell deadlift reps on the MyDeadlift clips; Lite found 106. Same reps, same counter, only the pose model changed.',

  'wd-b3-4':
    'When the voice coach drops, counting stays on and the phone retries from 1 s up to 30 s. It stops once the next wait would pass two and a half minutes.',

  'wd-b3-5':
    'The voice coach caps self-started lines with a minimum gap and a per-set limit on form, stall and out-of-view. Pain, a form break and wrap-up skip the gap but still wait 2.5 s of quiet.',

  'wd-b3-6':
    'For curls, presses, rows, squats and deadlifts the first rep is held for up to 8 s for a second one. On curls that cut false reps from 35.4 an hour to 3.4, at a cost of 2.0% of real reps.',

  'wd-b4-p1':
    'Workout Director counts squats, lunges, push-ups, pull-ups, curls, rows, bench, deadlifts and hip thrusts on the iPhone camera. Planks are timed, and a camera workout needs no sign-in.',

  'wd-b4-fig1':
    'Workout Director has data for 869 exercises and offers the 119 that have a figure. 115 figures cover those 119; four do double duty.',

  'wd-b4-tech1':
    'Pose tracking runs on the iPhone as BlazePose Full from the app bundle. It tries the GPU, then the CPU, then Apple Vision.',

  'wd-b5-1':
    "A public plank clip labelled 9 seconds gets 2 on Workout Director's clock. The clock only runs while shoulder, hip and ankle stay near a 150° line within 40° of horizontal.",

  'wd-b5-2':
    'On a kettlebell push-up clip the raw elbow angle dipped past the bottom line 8 times; with a 3-frame median, 2-frame hold and blur check it was 3.',

  'wd-b5-3':
    'On 28 October the row counter counted an elbow bend while setting up. Rows now need you bent over and still, with hips and knees in view.',

  'wd-b5-4':
    'The Kotlin counter test replays 140 saved iOS frame outputs and must match them. 110 are synthetic; the pin is still the iOS counter as of 23 October.',

  'wd-b5-5':
    'The counter runs the camera at 30 fps, drops to 15 when the phone is seriously hot or on Low Power Mode, and stops camera counting at critical.',

  'wd-b5-6':
    'On the emulator, pose GPU setup succeeded then failed on frame one with GL_INVALID_ENUM. The fix switches to CPU after a failed frame.',

  'wd-b6-1':
    "Today's targets come with one line from logged sessions: finish last time and it asks for a bit more; hard or sore keeps the same target.\n\nFree on the App Store.",

  'wd-b6-2':
    'Exercise search matches gym names like RDL to Romanian deadlift, and labels when a hit came from another name.\n\nFree on the App Store.',

  'wd-b6-3':
    'Fit my day lets you pick 15, 30 or 45 minutes, mark tired or no equipment, or swap a move, for today only.\n\nFree on the App Store.',

  'data-1':
    'Four of the US top 10 free apps on 4 Nov were AI assistants: Muse 2, ChatGPT 4, Claude 7, Gemini 9. The UK top 10 had ChatGPT at 3 and Claude at 5.',

  'data-2':
    'Muse has about 7,700 US App Store ratings a day since 8 Sep (438,257 in 57 days). Only Facebook, YouTube and ChatGPT average more.',

  'data-3':
    'Flutter has 12,761 open GitHub issues; React Native has 738. React Native closes quiet issues after 180 days plus 7; Flutter only closes issues waiting 21 days on the reporter.',

  'data-4':
    'Only four US top 100 free apps need iOS 26: Copilot, Outlook, Word and Netflix. 75 of the 100 still support iOS 17 or older.',

  'data-5':
    'react-native npm downloads went from 4.6M to 20.5M in a year (4.5x). Expo grew 6.3x and Capacitor 8.6x over the same stretch.',

  'data-6':
    "Swift use rises with experience in this year's Stack Overflow survey, 5.1% at 1-5 years to 6.6% at 16+. Kotlin, Java and Dart all fall.",

  'data-7':
    'Three of the four lowest-rated apps in the UK top 50 free Health & Fitness chart are gym apps: Better UK 1.56, JD Gyms 1.63, ClubRight 2.22. PureGym is No. 1 at 4.73.',

  'data-8':
    'Four of the five smallest apps in the UK top 100 free are government apps, from the NHS App at 14 MB to GOV.UK One Login at 48 MB. The median app there is 257 MB.',

  'ai-1':
    "Codex and Grok Build ship as static Rust binaries, Claude Code as a single Bun-compiled executable, Gemini CLI as one bundle, and Cursor agent as a 20.6 MB thin client with its prompt on Cursor's servers.",

  'ai-2':
    'Codex, Claude Code and Gemini CLI all have a plan mode. Codex splits sandbox and approval policies; Claude Code lists six permission modes; Gemini CLI has four approval modes.',

  'ai-3':
    "Gemini CLI's public source names 105 telemetry events and metrics, including loops, edit correction, fallbacks, ui.flicker.count and overage_menu_shown.",

  'ai-4':
    "Grok Build's binary has compat.claude, compat.codex and compat.cursor, plus /import-claude and /migrate-workflow. A name in a binary isn't proof it has shipped.",

  'ai-5':
    'On 22 Jul 2026 a tracker saw ENABLE_IMAGINE_VIDEO_AUDIO_TOGGLE on grok.com and then missed the launch. The fix was to track UI controls, not only flags.',

  'ai-6':
    "Gemini CLI's README says free individual access and Google AI Pro / Ultra moved to Antigravity CLI on 18 June 2026. The 60/min and 1,000/day free-tier lines came out on 16 October.",

  'ai-7':
    'About 40 product surfaces are watched for $0.41 a day. On 3 Nov the model only wrote the summary: 55 calls and 146k input tokens.',
}

/** Posts that keep a withheld placeholder instead of a compact body on the site. */
export const compactWithheld = new Set(['sample-a'])

/** Phrases that make compact text sound like a wrap-up; unit tests reject them. */
export const compactBannedPhrases = [
  'interesting part',
  "what's interesting",
  'the real story',
  "here's the thing",
  'same idea',
  'none of this',
  'the takeaway',
  'the lesson',
  'it turns out',
  "that's the point",
  'game-changer',
] as const
