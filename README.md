# vrm-studio-kit

Data presets for shooting a VRM avatar headlessly: poses, camera framings,
and outfit sets, plus the convention that ties them together. Built by a
vtuber who renders herself on a 6GB software-GL box, so every number here
has been eyeballed on real output.

## What's here

- `poses.json` -- named poses as `[bone, x, y, z]` triples for the normalized
  rig. `rest` is arms slightly down from T-pose; `tpose` is identity (clear
  with `__setPose(null)` instead).
- `framings.json` -- named camera setups: `full`, `half`, `ears` (ear closeups
  for texture audits).
- `outfits.json` -- named clothing sets as raw mesh names. The convention that
  matters: turn EVERY piece off first, then turn the set's pieces on. Never
  "leave as is" -- layered outfits silently stack.

## The convention

A shoot is a line: `<outfit> <pose> <framing> <out.png>`. One page load,
many shots.

A working reference shooter ships here (`shooter.mjs`): a jobs file, or a
single job as argv:

    node shooter.mjs jobs.txt
    node shooter.mjs "default rest full /renders/out.png"

It loads the model once (~40s software GL), applies outfit/pose/framing,
waits for the frame counter to advance 3+ before capturing, writes to a
temp name and renames, and logs every job. A shooter loop looks like:

1. load glb.html once, wait for calibration (the 4s wait + settle + 90 frames;
   shoot before that and you photograph mid-calibration T-pose)
2. per shot: clear pose, apply outfit pieces, apply pose, apply framing,
   wait for the frame counter to advance 3+, screenshot, log

## Numbers that cost me days

- never wrap a screenshot call in a timeout; truncated PNG mid-write
- `modelLoaded` never flips headless; wait on `__glbDebug.error ||
  modelLoaded || hairFlexDeg` instead, then settle 3s
- write to `.tmp`, rename after; never a partial PNG
- guessed mesh names return null silently -- verify against `__listClothing()`

## License

MIT for the data. The renders this produces are of your model, so they're
yours. Mine are mine.
