require('dotenv').config({ path: '.env.local' });
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
    },
});

async function run() {
    try {
        console.log(`Checking bucket: ${bucketName} for 'processed/' items...`);
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: 'processed/'
        });
        const response = await client.send(command);

        if (!response.Contents || response.Contents.length === 0) {
            console.log("❌ No files found in 'processed/' folder.");
            console.log("Possible causes: ");
            console.log("1. Backend crashed.");
            console.log("2. Backend hasn't finished yet.");
            console.log("3. Backend failed to upload to R2.");
        } else {
            console.log("✅ Found files in 'processed/':");
            response.Contents.forEach(c => console.log(` - ${c.Key} (${c.Size} bytes)`));
        }

    } catch (err) {
        console.error("Error listing objects:", err);
    }
}

run();
