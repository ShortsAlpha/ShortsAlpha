import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    console.log("Loading .env.local...");
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else {
    console.error(".env.local not found!");
    process.exit(1);
}

const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
});

async function run() {
    try {
        console.log("Setting CORS for bucket:", process.env.R2_BUCKET_NAME);
        const command = new PutBucketCorsCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
                        AllowedOrigins: ["*"], // Simplify for now. Ideally domain specific.
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000
                    }
                ]
            }
        });

        await s3Client.send(command);
        console.log("Success! CORS enabled.");
    } catch (err) {
        console.error("Error setting CORS:", err);
    }
}

run();
