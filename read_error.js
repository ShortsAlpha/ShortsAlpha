require('dotenv').config({ path: '.env.local' });
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

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

const errorKey = process.argv[2];

if (!errorKey) {
    console.error("Please provide the error key as an argument.");
    process.exit(1);
}

async function run() {
    try {
        console.log(`Reading error log: ${errorKey}...`);
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: errorKey
        });
        const response = await client.send(command);
        const str = await response.Body.transformToString();
        console.log("\n--- ERROR LOG CONTENT ---");
        console.log(JSON.parse(str));
        console.log("-------------------------\n");

    } catch (err) {
        console.error("Error reading object:", err);
    }
}

run();
