
require('dotenv').config({ path: '../.env.local' });
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

// Replicating lib/s3Client.ts config EXACTLY
const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // Matches lib/s3Client.ts
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;
const KEY = 'static/previews/puck_preview.mp3';

async function main() {
    console.log(`Checking bucket: ${BUCKET_NAME}`);
    console.log(`Checking key: ${KEY}`);

    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: KEY,
        });
        const response = await s3Client.send(command);
        console.log("✅ File found!");
        console.log("Content-Type:", response.ContentType);
        console.log("Content-Length:", response.ContentLength);
    } catch (err) {
        console.error("❌ Error fetching file:", err);
    }
}

main();
