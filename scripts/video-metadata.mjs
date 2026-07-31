// Shared ffprobe-based detector for GPS/device metadata in a video file —
// used by both check-staged-video-metadata.mjs (pre-commit) and
// check-video-sizes.mjs (committed-file report). ffmpeg/ffprobe is already
// a documented required tool for anyone touching video in this repo (see
// CONTENT.md's re-encode/webm-sibling commands), so requiring it here for
// detection too isn't a new burden — unlike the image-GPS pre-commit
// check, which deliberately uses the pure-JS `exifr` instead of the
// `exiftool` binary specifically to avoid that for the far more common
// case of committing a photo.
//
// Tag names are matched by pattern rather than an exact list, because the
// same piece of information shows up under different keys depending on
// muxer/camera: a phone-shot MP4 commonly carries both a plain `location`
// tag and Apple's `com.apple.quicktime.location.ISO6709`; device identity
// shows up as `com.apple.quicktime.make`/`.model`. Verified against a real
// ffmpeg-generated test file carrying exactly these tags (see this
// script's companion pre-commit hook's own verification, and
// CONTENT.md's "Video metadata" section) rather than assumed from
// documentation.
import { execFileSync } from 'node:child_process';

const GPS_KEY_PATTERN = /location|gps/i;
const DEVICE_KEY_PATTERN = /\bmake\b|\bmodel\b/i;

/**
 * Returns `null` if ffprobe isn't installed, or the file isn't something
 * it can read as media (callers decide how to handle each case — a
 * pre-commit hook should fail closed on either, since "couldn't check"
 * and "is missing ffprobe" are not the same as "is clean"; a soft report
 * can just skip). Otherwise returns every tag whose key matched, keyed by
 * source tag name.
 */
export function probeVideoMetadata(filePath) {
  let raw;
  try {
    raw = execFileSync(
      'ffprobe',
      ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
      { encoding: 'utf-8' },
    );
  } catch {
    return null;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  const allTags = { ...(data.format?.tags ?? {}) };
  for (const stream of data.streams ?? []) {
    Object.assign(allTags, stream.tags ?? {});
  }

  const gps = Object.entries(allTags).filter(([key]) => GPS_KEY_PATTERN.test(key));
  const device = Object.entries(allTags).filter(([key]) => DEVICE_KEY_PATTERN.test(key));

  return { gps, device, hasSensitiveMetadata: gps.length > 0 || device.length > 0 };
}

export function isFfprobeAvailable() {
  try {
    execFileSync('ffprobe', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
