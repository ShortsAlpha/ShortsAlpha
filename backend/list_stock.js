const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

const s3Client = new S3Client({
    region: "us-east-1",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
});

async function listStock() {
    console.log(`Listing stock/ items...`);
    const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: "stock/"
    });

    try {
        const response = await s3Client.send(command);
        const contents = response.Contents || [];
        contents.forEach(item => console.log(item.Key));
    } catch (err) {
        console.error(err);
    }
}

listStock();
