
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const path = require("path");
// Try loading from current directory (root)
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

console.log("R2_ACCOUNT_ID:", process.env.R2_ACCOUNT_ID ? "Loaded" : "MISSING");
console.log("R2_BUCKET_NAME:", process.env.R2_BUCKET_NAME ? "Loaded" : "MISSING");

const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME;

async function deleteVoiceovers() {
    console.log("Scanning for voiceovers in stock/voiceover/...");

    let continuationToken = undefined;

    do {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: "stock/voiceover/",
            ContinuationToken: continuationToken
        });

        const response = await s3Client.send(command);
        const contents = response.Contents || [];

        if (contents.length === 0) {
            console.log("No voiceovers found.");
            break;
        }

        console.log(`Found ${contents.length} items to delete.`);

        const deleteCommand = new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: {
                Objects: contents.map(item => ({ Key: item.Key })),
                Quiet: false
            }
        });

        const deleteResponse = await s3Client.send(deleteCommand);
        console.log("Deleted:", deleteResponse.Deleted?.length || 0);
        console.log("Errors:", deleteResponse.Errors || []);

        continuationToken = response.NextContinuationToken;

    } while (continuationToken);

    console.log("Cleanup complete.");
}

deleteVoiceovers().catch(console.error);
