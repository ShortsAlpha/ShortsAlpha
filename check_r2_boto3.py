import boto3
import os
from dotenv import load_dotenv

load_dotenv(".env.local")

account_id = os.getenv("R2_ACCOUNT_ID")
access_key_id = os.getenv("R2_ACCESS_KEY_ID")
secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")
bucket_name = os.getenv("R2_BUCKET_NAME")

print("--- R2 Boto3 Connection Test ---")
print(f"Account ID: {account_id}")
print(f"Bucket: {bucket_name}")

if not all([account_id, access_key_id, secret_access_key, bucket_name]):
    print("❌ Missing environment variables!")
    exit(1)

try:
    s3 = boto3.client(
        's3',
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        region_name='auto'
    )

    print("\n1. Listing Objects...")
    response = s3.list_objects_v2(Bucket=bucket_name, MaxKeys=5)
    if 'Contents' in response:
        for obj in response['Contents']:
            print(f" - {obj['Key']}")
    else:
        print(" - Bucket is empty or no files found.")
        
    print("\n2. Uploading Test File...")
    s3.put_object(
        Bucket=bucket_name,
        Key='processed/boto3_test.json',
        Body='{"status": "success", "source": "local_python"}'
    )
    print("✅ Upload Successful: processed/boto3_test.json")

except Exception as e:
    print(f"\n❌ Error: {e}")
