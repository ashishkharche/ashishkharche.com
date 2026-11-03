// Batch 5 posts, from /workspace/linkedin-samples/personal/wd-batch-5 (01-06, with the WD Engineering and WD Marketing
// batch 5 verdict fixes applied, 3 Nov). The text is copied as is. Post 1 has WD Marketing's plank image; 2-6 are text only (3 Nov 20:27 steer: the push-up and row images are not used).
import type { WdBatchPost } from '~/content/linkedinWdBatch2'
export const wdBatch5: WdBatchPost[] = [
  {
    id: 'wd-b5-1',
    n: 1,
    length: 'Short',
    concept:
      'The plank hold clock: only seconds with a straight body line (150°, within 40° of horizontal) count; a public clip labelled 9 s gets 2',
    media:
      'One 4:5 image from WD Marketing: the plank frame with the body line and its trace against the 150° line (Pexels 6302985)',
    images: [
      {
        key: 'b5p1',
        src: '/assets/img/preview/wd-b5-1-plank-straight-seconds.webp',
        w: 1080,
        h: 1350,
        upload: '/workspace/wd-marketing/linkedin-batch-5/b5-01-plank-straight-seconds.png',
        name: 'b5-01-plank-straight-seconds.png',
        alt: 'Only the straight seconds count. A woman holding a forearm plank on a blue mat, side-on, with a line drawn from ankle to hip to shoulder and 148° marked at the hip. Below, her body line frame by frame against a dashed straight 150° line: above it for about the first 2 seconds, then just under it for most of the rest. Caption: Body line, frame by frame, against the 150° line. Labelled 9 s, credited 2. Clock credited: 2 s.',
        note: 'WD Marketing linkedin-batch-5/b5-01-plank-straight-seconds.png (3 Nov 20:23 GMT): Pexels 6302985 (Klaus Nielsen), UHD copy cropped and downscaled; overlay from the repo test fixture (Apple Vision joints), trace from blog-data plank-hold-trace.csv (credited 2.127 s, labelled 9 s). Pexels License, no credit needed. Upload file is the 1080 x 1350 PNG; the site copy is a WebP of it.',
      },
    ],
    sources: [
      'Cross-check: /workspace/wd-share/crosscheck/eng-verdicts-batch5-2026-11-03.md (FIX applied: 40° off horizontal) and marketing-verdicts-batch5-2026-11-03.md (OK).',
      'wd-batch-5/README.md, 01 table: HoldSegmenter straightness 150, maximumTilt 40, grace 0.6 s, gapGrace 2 s; PG/cases.json 287-299 (Pexels 6302985, label 9 s); PipelineTests.swift 776-779 (held == 2).',
      'Image credit when it lands: none needed (Pexels License); optional "Video: Klaus Nielsen / Pexels", off the post text.',
    ],
    text: "A plank has no reps, so my app times it instead. The hard part is deciding which seconds were actually a plank.\n\nThe clock only runs while your shoulder, hip and ankle make a near-straight line of at least 150°, with your body no more than 40° off horizontal. A short sag is forgiven, and so is a brief moment where tracking drops out.\n\nI tried it on a public plank clip labelled 9 seconds. My app gives it 2. Most of that hold sits just under the straight line, and the test in my repo pins that 2 on purpose.\n\nI'd rather the clock be strict than flattering.",
    chars: 559,
  },
  {
    id: 'wd-b5-2',
    n: 2,
    length: 'Short',
    concept:
      'Push-up smoothing: a 3-frame median, a 2-frame dwell at the bottom and a blur check; 8 raw dips become 3 reps on a public tripod clip',
    media:
      'Text only (3 Nov 20:27: the WD Marketing push-up image is not used; the source clip is 640x480, too low-res)',
    images: [],
    sources: [
      'Cross-check: eng-verdicts-batch5-2026-11-03.md (FIX: dips, not crossings) and marketing-verdicts-batch5-2026-11-03.md (FIX: tripod; three tops), merged.',
      'wd-batch-5/README.md, 02 table: ExerciseSpec.swift 240-249 (smoothingFrames 3, workDwell 2, blurSpeed); B5/02/summary.json (raw 8, median 3 dips, blur frames 0); PipelineTests.swift 771-774 (count == 3).',
      'Image credit when it lands: Taco fleur / Wikimedia Commons, CC BY-SA 4.0; the derived image is CC BY-SA 4.0 too. Image or first comment only, never the post text.',
    ],
    text: "Push-ups often get filmed by a friend holding the phone, and the elbow angle my app reads from that kind of footage is jumpy. One wobble can look like a dip.\n\nSo the counter takes the middle value of every 3 frames, needs the elbow to stay past the bottom line for 2 frames, and checks for blur, where even the slowest joint is moving too fast to trust.\n\nI tried it on a public kettlebell push-up clip, filmed on a tripod. The raw angle dips from the top line past the bottom line 8 times. With the filter it's 3, the same number my test expects. Five bottoms are labelled, but the arms only make it back to the top three times.",
    chars: 628,
  },
  {
    id: 'wd-b5-3',
    n: 3,
    length: 'Short',
    concept:
      'Rows only count when bent over and still with hips and knees in view, after the 28 Oct setup was counted; an arms-only saved excerpt counts zero',
    media:
      'Text only (3 Nov 20:27: the WD Marketing row image is not used; its frame visibly shows hips and knees, so a caption about none being tracked would mislead)',
    images: [],
    sources: [
      'Cross-check: eng-verdicts-batch5-2026-11-03.md (FIX: the saved excerpt keeps only arm joints; one rep played three times) and marketing-verdicts-batch5-2026-11-03.md, Eng text used.',
      'Line 1 is Ashish’s own 28 Oct 2026 set (NegativeReplayTests.swift 232-233, PipelineTests.swift 764, PostureGate.swift 6-9; commit 9019abe0). The row hinge rule is iOS only.',
      'Image credit when it lands: FitnessScape / Wikimedia Commons, CC BY 3.0 (creativecommons.org/licenses/by/3.0), cropped, joints overlaid. Caption must say "No hip or knee joints in the saved data", not "in view".',
    ],
    text: "On 28 October my row counter counted me just setting up. It saw my elbow bend and decided that was a row.\n\nThe elbow angle on its own could be any arm move: walking up, lifting the bar, hinging over, even waving. So now rows only count when you're bent over and still, with your hips and knees in view.\n\nI checked it on a saved excerpt of a public row clip that keeps only the arm joints. The elbow swings through one rep played three times, but with no hip or knee in the data, my app counts zero. That's the answer my test expects.",
    chars: 533,
  },
  {
    id: 'wd-b5-4',
    n: 4,
    length: 'Short',
    concept:
      'Android counter parity: the Kotlin port replays 140 saved inputs and must match iOS frame by frame; it matches the 23 Oct iOS counter',
    media: 'Text only by design (no honest Kotlin-vs-Swift parity image)',
    images: [],
    sources: [
      'Cross-check: eng-verdicts-batch5-2026-11-03.md (FIX: two-rep checks and other changes unported) and marketing-verdicts-batch5-2026-11-03.md (FIX: "The catch", 23 October, variant list not complete), merged.',
      'GoldenParityTest.kt 21-30; golden/inputs tree at f653d418 (140 files, 110 synthetic, 10 moves × 11 variants); android docs/PARITY.md:26 (exact against 23 Oct Swift RepCore). No version numbers.',
    ],
    text: "I'm porting my app's rep counter from Swift to Kotlin for the Android version. Watching a few sets and saying \"looks right\" wasn't going to be enough.\n\nSo iOS writes down what its counter outputs on every frame: the count, each rep, held seconds, tracking. The Kotlin test replays the same inputs and has to produce identical output, frame by frame.\n\nThere are 140 saved inputs, and 110 of them are synthetic: ten moves, each done eleven ways, including fast, slow, noisy, partly hidden and with a second person in frame.\n\nThe catch is that it matches the iOS counter as it was on 23 October. The newer posture, framing and two-rep checks, and other counter changes since then, still need porting.",
    chars: 697,
  },
  {
    id: 'wd-b5-5',
    n: 5,
    length: 'Short',
    concept:
      'Thermal pacing: 30 fps normally, 15 when the phone runs seriously hot or in Low Power Mode, stop at critical; Apple pose fallback per session',
    media: 'Text only by design (a rule in the code, not a measurement)',
    images: [],
    sources: [
      'Cross-check: OK from WD Engineering and WD Marketing (eng-verdicts-batch5 and marketing-verdicts-batch5, 3 Nov).',
      'Segmenter.swift 744-761 (ThermalPace.decide); SessionCamera.swift 260-261, 446-495; SessionEngineFallback.swift 9-19. No battery claim.',
    ],
    text: "A long set warms the phone up. So my app's counter checks how hot the phone says it is and paces the camera to match.\n\nNormally it processes 30 frames a second. When the phone reports it's running seriously hot, or Low Power Mode is on, it drops to 15. If it reaches critical, camera counting stops.\n\nThere's a separate safety net too. If the pose model can't start, or runs too slowly, that session falls back to Apple's own pose engine.\n\nI haven't measured what this does for battery. For now it's a rule in the code, not a result.",
    chars: 533,
  },
  {
    id: 'wd-b5-6',
    n: 6,
    length: 'Short',
    concept:
      'An Android emulator bug: the GPU graph built, then failed on frame one; the fix switches to the CPU for the rest of the process',
    media: 'Text only by design (code only, no clip)',
    images: [],
    sources: [
      'Cross-check: eng-verdicts-batch5-2026-11-03.md and marketing-verdicts-batch5-2026-11-03.md (both FIX: the same-frame retry is video mode only), Eng text used.',
      'BlazePoseLandmarker.kt 100-113 (video retry), 153-159 (live: frame dropped), 186-190 (remembered for the process); commit 455bd438 (2 Nov). Whether a real phone hit it is UNVERIFIED and not claimed.',
    ],
    text: "A bug from the Android version I'm porting: on the emulator, the pose model's GPU setup built without complaint, then failed on the very first frame with GL_INVALID_ENUM.\n\nMy code only fell back to the CPU when setup itself failed. Setup had worked, so nothing caught the failure, and pose detection just died.\n\nThe fix catches a frame that fails and switches to the CPU for the rest of the process. When it's reading a video, it runs that same frame again on the CPU; on the live camera it drops that frame and carries on from the next one.\n\nStarting up and actually working turned out to be two different checks.",
    chars: 614,
  },
]
