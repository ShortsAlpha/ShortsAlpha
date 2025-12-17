require('dotenv').config({ path: '.env.local' });
const { S3Client, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

console.log("--- R2 Connection Test ---");
console.log(`Account ID: ${accountId}`);
console.log(`Bucket: ${bucketName}`);
console.log(`Access Key: ${accessKeyId ? 'Set (***)' : 'MISSING'}`);

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error("ERROR: Missing environment variables. Please check .env.local");
    process.exit(1);
}

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
        console.log("\n1. Testing Authentication & List Objects...");
        const command = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 });
        await client.send(command);
        console.log("✅ SUCCESS: Successfully connected to R2 and listed objects.");

        console.log("\n2. Testing Write Permission (Upload dummy file)...");
        const uploadCmd = new PutObjectCommand({
            Bucket: bucketName,
            Key: 'connection-test.txt',
            Body: 'Hello from verification script!'
        });
        await client.send(uploadCmd);
        console.log("✅ SUCCESS: Successfully uploaded test file.");

        console.log("\n---------------------------------------------------");
        console.log("RESULT: Backend connection is PERFECT.");
        console.log("If browser upload fails, it is 100% a CORS issue.");
        console.log("---------------------------------------------------");

    } catch (err) {
        console.error("\n❌ CONNECTION FAILED ERROR:");
        console.error(err);

        if (err.name === 'NoSuchBucket') {
            console.error("\n👉 SOLUTION: The bucket name '" + bucketName + "' does not exist in your Cloudflare R2.");
            console.error("Please check the name in your Cloudflare Dashboard and your .env.local file.");
        } else if (err.code === 'InvalidAccessKeyId' || err.name === 'SignatureDoesNotMatch') {
            console.error("\n👉 SOLUTION: Your Access Key or Secret Key is wrong. Please generate new tokens.");
        }
    }
}

run();
