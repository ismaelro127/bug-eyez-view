import { verifyYouTubeVideo } from "../services/youtubeVerifier.js";

const videoId = process.argv[2];

if (!videoId) {
  console.error(
    "Usage: node scripts/testYouTubeVerifier.js VIDEO_ID"
  );
  process.exit(1);
}

console.log(`Checking YouTube video: ${videoId}`);

const result = await verifyYouTubeVideo(videoId);

console.log(JSON.stringify(result, null, 2));

process.exit(result.playable ? 0 : 1);