# Turns the variable-rate screencast frames (frames.txt: file + duration) into an exact 30 fps video.
import os, subprocess, sys
out = sys.argv[1]
lines = open(os.path.join(out, "frames.txt")).read().split("\n")
items, cur = [], None
for l in lines:
    if l.startswith("file "):
        cur = l[6:-1]
    elif l.startswith("duration "):
        items.append((cur, float(l.split()[1])))
starts, t = [], 0.0
for f, d in items:
    starts.append((t, f))
    t += d
total = t
cfr = os.path.join(out, "cfr")
subprocess.run(["rm", "-rf", cfr])
os.makedirs(cfr)
fps, j = 30, 0
n = int(total * fps)
for k in range(n):
    tk = k / fps
    while j + 1 < len(starts) and starts[j + 1][0] <= tk:
        j += 1
    os.symlink(starts[j][1], os.path.join(cfr, f"{k:05d}.jpg"))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", os.path.join(cfr, "%05d.jpg"), "-vf", "scale=1920:1080:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-movflags", "+faststart", os.path.join(out, "walkthrough.mp4")], check=True)
print(f"{n} frames, {total:.1f}s")
