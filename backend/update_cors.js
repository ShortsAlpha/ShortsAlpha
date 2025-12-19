
require('dotenv').config({ path: '../.env.local' });
const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function main() {
    console.log("Updating CORS policy...");
    try {
        await s3Client.send(new PutBucketCorsCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "HEAD"],
                        AllowedOrigins: ["*"], // Allow everything for public assets
                        ExposeHeaders: [],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        }));
        console.log("✅ CORS updated successfully.");
    } catch (err) {
        console.error("❌ Failed to update CORS:", err);
    }
}

main();
