const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

if (!BUCKET_NAME) {
    console.error("Error: R2_BUCKET_NAME is not set (Check .env.local)");
    process.exit(1);
}

const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
});

async function wipeStock() {
    console.log(`Checking bucket: ${BUCKET_NAME} for stock/ prefix...`);

    const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: "stock/"
    });

    try {
        const response = await s3Client.send(command);
        const contents = response.Contents || [];

        if (contents.length === 0) {
            console.log("Stock folder is already empty.");
            return;
        }

        console.log(`Found ${contents.length} items. Deleting...`);

        const deleteParams = {
            Bucket: BUCKET_NAME,
            Delete: {
                Objects: contents.map(item => ({ Key: item.Key }))
            }
        };

        await s3Client.send(new DeleteObjectsCommand(deleteParams));
        console.log("Successfully deleted all items in stock/.");

    } catch (err) {
        console.error("Error wiping stock:", err);
    }
}

wipeStock();
