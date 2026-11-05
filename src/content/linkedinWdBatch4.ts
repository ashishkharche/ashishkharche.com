// Batch 4 posts, from the text files in /workspace/linkedin-samples/personal/wd-batch-4 (p1, fig1, tech1) and the
// images in /workspace/wd-marketing/linkedin-batch-4/new. Built by /workspace/drafts-b4/gen.py; the text is copied as is.
import type { WdBatchPost } from '~/content/linkedinWdBatch2'
export const wdBatch4: WdBatchPost[] = [
  {
    id: 'wd-b4-p1',
    n: 1,
    length: 'Medium',
    concept:
      'What Workout Director is: the camera rep counter, the moves it counts, programs, trainer and voice coach, and version 1.0.99',
    media: 'One 4:5 image by WD Marketing: the app counting a Pexels clip played in place of the camera (p1 v2)',
    images: [
      {
        key: 'b4p',
        src: '/assets/img/preview/wd-b4-p1-rep-counter-v2.webp',
        w: 1080,
        h: 1350,
        upload: '/workspace/wd-marketing/linkedin-batch-4/new/p1-rep-counter-v2.png',
        name: 'p1-rep-counter-v2.png',
        alt: 'Your camera counts the reps. The Workout Director workout screen on an iPhone: a woman mid walking lunge in a gym inside the app’s framing guide corners, the count 3 of 12, Walking lunge, Set 1/3, a Finish set button and the microphone, camera, pause and end controls. Caption: Walking lunge. The 3 of 12 is the count the app itself showed.',
        note: 'WD Marketing new/p1-rep-counter-v2.png (linkedin-batch-4, make_batch4.py p1v2): frame w01-lunge-iphone-24.png from the iOS 1.0.94 capture run with Pexels 31035743 fed into the real estimator and counter in place of the camera; count log t=37.6 s 3 of 12. Credit (taken out of the post text on 3 Nov, Ashish’s call): Video: Aliaksei Masiukevich / Pexels. Upload file is the 1080 x 1350 PNG; the site copy is a WebP of it.',
      },
    ],
    sources: [
      'Cross-check: /workspace/wd-share/crosscheck/marketing-verdicts-batch4-2026-11-03.md (WD Marketing) and the WD Engineering batch-4 fixes (18:42 GMT) in /workspace/linkedin-samples/personal/wd-batch-4/SOURCES.md.',
      'wd-batch-4/SOURCES.md, p1.txt table: App Store description and listing (wd-share/blog-data/batch-4/README.md:18-29), version 1.0.99 notes (README.md:9, :21), iOS 18.2 and later (README.md:19-20).',
      'Image credit: Pexels 31035743 (Aliaksei Masiukevich, Pexels License), wd-marketing/linkedin-batch-4/SOURCES.md. The v2 frame keeps the shoe brand mostly hidden; final call on the logo is Ashish’s (same SOURCES.md).',
      'Caveat: the image is a 1.0.94 frame; that the 1.0.99 screen looks the same is not checked. The text says only that the image is the app counting a clip.',
    ],
    text: 'Workout Director is my own iPhone app for training at the gym or at home. You prop the phone up, press Start and it counts your reps with the camera and tells you what’s next.\n\nIt counts squats, lunges, push-ups, pull-ups, curls and rows, plus lifts like bench press, deadlifts and hip thrusts. Planks and holds are timed.\n\nThe camera reads your movement on the iPhone itself, and the video is never recorded, saved or uploaded. You don’t need to sign in for a camera workout.\n\nAround the counter there are training programs, a trainer that remembers your goals, equipment and schedule and an optional voice coach. Every session is logged and Apple Health is optional.\n\nVersion 1.0.99 is out. Search now finds names like RDL and Skull Crusher, and deadlifts filmed from the side count better. Free on the App Store.',
    chars: 818,
  },
  {
    id: 'wd-b4-fig1',
    n: 2,
    length: 'Short',
    concept:
      'How many exercises have Workout Director’s own figures: 115 figures for 119 of 869 catalogue entries, 920 PNGs',
    media: 'One 4:5 image by WD Marketing: the shipped bodyweight squat start and end figures in dark and light',
    images: [
      {
        key: 'b4f',
        src: '/assets/img/preview/wd-b4-fig1-bodyweight-squat-light-dark.webp',
        w: 1080,
        h: 1350,
        upload: '/workspace/wd-marketing/linkedin-batch-4/new/fig1-bodyweight-squat-light-dark.png',
        name: 'fig1-bodyweight-squat-light-dark.png',
        alt: 'One move, two looks. The app’s bodyweight squat figures, start and end, in a dark row and a light row: a line-art man standing, then squatting with his arms out in front, worked muscles tinted red. Caption: Bodyweight squat, start and end: the figure files the app ships.',
        note: 'WD Marketing new/fig1-bodyweight-squat-light-dark.png (linkedin-batch-4, make_batch4.py fig1): ExerciseFigureBodyweightSquat Start and End, dark and light @3x, hash-checked against ExerciseFigures.xcassets at 7c9209a0 (iOS 1.0.99); the light row is shown on the #090A0B ground. Upload file is the 1080 x 1350 PNG; the site copy is a WebP of it.',
      },
    ],
    sources: [
      'Cross-check: /workspace/wd-share/crosscheck/marketing-verdicts-batch4-2026-11-03.md (WD Marketing) and the WD Engineering batch-4 fixes (18:42 GMT) in /workspace/linkedin-samples/personal/wd-batch-4/SOURCES.md.',
      'wd-batch-4/SOURCES.md, fig1.txt table: 869 entries from free-exercise-db (wd-share/blog-data/batch-4/README.md:30), WD’s own figures (README.md:31, :36, :39), 230 image sets and 920 PNGs (README.md:36-37); Engineering fix: 115 figures cover 119 entries, single-pose moves, 750 not offered (ExerciseVisibility.swift:3-8).',
      'Credit: WD Marketing found no CC BY-SA reference for the bodyweight squat figure and no credit needed (linkedin-batch-4/SOURCES.md); the post has no credit line.',
      'Overlaps with WD batch 2, post 4 (115 figures in light and dark); that post is about how the figures are made, this one about the catalogue split.',
    ],
    text: 'Workout Director comes with data for 869 exercises, all from free-exercise-db, an open exercise dataset. But the app offers only the 119 entries that have Workout Director’s own figures, and that’s a much shorter list.\n\nThere are 115 of those figures, all our own artwork, covering 119 entries because four of them do double duty. Most show a start and an end pose. A few, like plank and farmer’s walk, are a single pose.\n\nEach figure has a start and an end image (the single-pose ones repeat it), in light and dark at two sizes, so the app carries 920 PNGs of them. The other 750 entries aren’t offered until they have a figure.',
    chars: 629,
  },
  {
    id: 'wd-b4-tech1',
    n: 3,
    length: 'Short',
    concept:
      'Pose tracking and rep counting run on the iPhone: the bundled BlazePose Full model, GPU then CPU then Apple Vision',
    media:
      'One 4:5 Pele diagram by WD Marketing: camera frame to pose model to rep counter to count on screen, all on the iPhone (v2)',
    images: [
      {
        key: 'b4t',
        src: '/assets/img/preview/wd-b4-tech1-counted-on-the-phone-v2.webp',
        w: 1080,
        h: 1350,
        upload: '/workspace/wd-marketing/linkedin-batch-4/new/tech1-counted-on-the-phone-v2.png',
        name: 'tech1-counted-on-the-phone-v2.png',
        alt: 'Counted on the phone. A flow diagram inside one outline labelled On the iPhone: Camera frame, then Pose model, then Rep counter, then Count on screen, with no arrow leaving the outline. Caption: The pose model ships inside the app.',
        note: 'WD Marketing new/tech1-counted-on-the-phone-v2.png (linkedin-batch-4, make_batch4.py tech1): Pele 1.13.0 render of pele/on-device.mmd, 4 nodes in one group, outlines only; the v2 caption says the pose model ships inside the app (bundled model file at 7c9209a0). Pele credit taken out of the post text on 3 Nov. Upload file is the 1080 x 1350 PNG; the site copy is a WebP of it.',
      },
    ],
    sources: [
      'Cross-check: /workspace/wd-share/crosscheck/marketing-verdicts-batch4-2026-11-03.md (WD Marketing) and the WD Engineering batch-4 fixes (18:42 GMT) in /workspace/linkedin-samples/personal/wd-batch-4/SOURCES.md.',
      'wd-batch-4/SOURCES.md, tech1.txt table: BlazePoseEstimator.swift:250-254, :281 (bundled model file), :113-129 (GPU, then CPU, then Apple Vision); CameraEngine.swift:12 (full) at 7c9209a0.',
      'Not claimed: airplane mode end to end, or that nothing leaves the phone (the optional voice coach, signed-in session sync and error reports use the network; linkedin-batch-4/SOURCES.md).',
      'Overlaps with D2 (Lite, Full and Heavy, the Vision switch); this post adds which model ships, that it is bundled, and the fallback order.',
    ],
    text: 'I didn’t want a workout app that sends your camera feed off somewhere. So Workout Director counts reps from the phone camera without sending the video anywhere. Pose tracking and counting run on the iPhone, and the video is never recorded, saved or uploaded.\n\nThe pose model ships inside the app instead of being downloaded later. It’s BlazePose Full, loaded from a file in the app bundle.\n\nIt runs on the GPU, falls back to the CPU and after that to Apple’s own on-device Vision pose estimator. All three paths run on the phone.',
    chars: 530,
  },
]
