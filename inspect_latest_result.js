require('dotenv').config({ path: '.env.local' });
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function run() {
    try {
        console.log("Listing processed files...");
        const listCmd = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: 'processed/'
        });

        const listRes = await client.send(listCmd);
        if (!listRes.Contents || listRes.Contents.length === 0) {
            console.log("No files found.");
            return;
        }

        // Filter for specific job ID
        const results = listRes.Contents
            .filter(o => o.Key.includes('689cadb0-0b72-4b1c-ab41-595176be597b'))
            .sort((a, b) => b.LastModified - a.LastModified);

        if (results.length === 0) {
            console.log("No result files found.");
            return;
        }

        console.log("Top 5 recent files:");
        results.slice(0, 5).forEach(o => console.log(`${o.LastModified.toISOString()} - ${o.Key}`));

        const latest = results[0];
        console.log(`\nReading latest file: ${latest.Key}`);

        const getCmd = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: latest.Key
        });

        const res = await client.send(getCmd);
        const str = await res.Body.transformToString();
        const json = JSON.parse(str);

        console.log("\n--- JSON CONTENT (Script Array) ---");
        if (json.analysis) {
            try {
                // Handle the cleanup logic used in frontend
                const cleaned = json.analysis.replace(/```json/g, "").replace(/```/g, "").trim();
                const parsed = JSON.parse(cleaned);

                console.log("Virality Score:", parsed.virality_score);

                if (Array.isArray(parsed.script)) {
                    console.log("Script is Array. First item keys:", Object.keys(parsed.script[0]));
                    console.log("First item sample:", parsed.script[0]);
                } else {
                    console.log("Script is NOT Array:", typeof parsed.script);
                }
            } catch (e) {
                console.log("Error parsing inner analysis JSON:", e);
                console.log("Raw Analysis:", json.analysis); // Print raw if parse fails
            }
        } else {
            console.log(json);
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

run();
