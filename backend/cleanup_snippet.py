@app.function(image=image, schedule=modal.Cron("0 0 * * *")) # Run once a day at midnight
def cleanup_old_files():
    import boto3
    import time
    from datetime import datetime, timedelta
    
    # HARDCODED CREDENTIALS (MVP)
    # Ideally these should be in modal.Secret.from_name("r2-secret")
    r2_creds = {
        "account_id": "6ff495afe34538a6274dfba7a185f867",
        "access_key_id": "998d25b995f441ab296ce0d96314d4e7",
        "secret_access_key": "c90f03bb4ecc7134deeddd16a4d8b7b0f281fa2311f77f305f91ef58010b55f3",
        "bucket_name": "shortsalpha"
    }

    print("Starting periodic cleanup...")
    
    s3 = boto3.client(
        's3',
        endpoint_url=f"https://{r2_creds['account_id']}.r2.cloudflarestorage.com",
        aws_access_key_id=r2_creds['access_key_id'],
        aws_secret_access_key=r2_creds['secret_access_key'],
        region_name='auto'
    )
    
    bucket = r2_creds['bucket_name']
    
    try:
        # List objects
        paginator = s3.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket)

        deleted_count = 0
        now = datetime.utcnow()
        retention_period = timedelta(hours=24)

        for page in page_iterator:
            if 'Contents' not in page:
                continue
                
            for obj in page['Contents']:
                key = obj['Key']
                last_modified = obj['LastModified'].replace(tzinfo=None) # Make naive
                
                # Check age
                age = now - last_modified
                if age > retention_period:
                    # Check if it is a render output or related
                    # We accept .mp4 in root or processed/
                    if key.endswith(".mp4") or "processed/" in key or "export_" in key:
                        print(f"Deleting old file: {key} (Age: {age})")
                        s3.delete_object(Bucket=bucket, Key=key)
                        deleted_count += 1

        print(f"Cleanup complete. Deleted {deleted_count} files.")
        
    except Exception as e:
        print(f"Cleanup failed: {e}")
        import traceback
        traceback.print_exc()
