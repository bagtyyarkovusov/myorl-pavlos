import os
import json
import requests
import mimetypes

from cms_audit import CHECKPOINT_SOURCE_DIR

API_URL = "http://localhost:1337/api/upload"
TOKEN = "9149081bacf8a9cc4e33e98e17f5a02c7fd428e782f848643473bfe9cf69c82c2bdbf6010c79454e072ec494f99db9fcf71cdae76768a6006b8ab95230971514312263efe66d9b0dbb869b7d536c213dab2b9c01cf9e24e07fef77fb72c7dfae882c5a8d57da2fa973a0167ee84f74e977ccee7743456f256f43cdb00b4abf87"

headers = {
    "Authorization": f"Bearer {TOKEN}"
}

upload_dir = "/Users/bagtyyar/Downloads/public_html 2/uploads"
asset_map_path = CHECKPOINT_SOURCE_DIR / "asset_map.json"
asset_map = {}

# Load existing map if we need to resume
if asset_map_path.exists():
    with asset_map_path.open("r", encoding="utf-8") as f:
        asset_map = json.load(f)

# Count tracking
total_files = 0
uploaded_files = 0

for filename in os.listdir(upload_dir):
    filepath = os.path.join(upload_dir, filename)
    if not os.path.isfile(filepath) or filename.startswith('.'):
        continue
        
    total_files += 1
    
    old_path = f"uploads/{filename}"
    
    # We also want to map URL-encoded versions since HTML might use them
    # like uploads/%CE%B5%CE%B9%CE%BA...
    import urllib.parse
    encoded_old_path = f"uploads/{urllib.parse.quote(filename)}"
    
    if old_path in asset_map:
        continue # Already uploaded
        
    print(f"Uploading {filename}...")
    try:
        with open(filepath, 'rb') as f:
            content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
            files = {'files': (filename, f, content_type)}
            response = requests.post(API_URL, headers=headers, files=files)
            
        if response.status_code in [200, 201]:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                asset_data = data[0]
                
                # Store the mapping
                mapping_info = {
                    "id": asset_data["id"],
                    "url": asset_data["url"],
                    "name": asset_data["name"]
                }
                
                asset_map[old_path] = mapping_info
                # Also map the encoded path to the same asset so our regex catches both
                if old_path != encoded_old_path:
                    asset_map[encoded_old_path] = mapping_info
                    
                uploaded_files += 1
                print(f"  Success: ID {asset_data['id']} -> {asset_data['url']}")
            else:
                print(f"  Unexpected response format for {filename}: {data}")
        else:
            print(f"  Failed to upload {filename}. Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"  Error uploading {filename}: {e}")

# Save the final mapping
with asset_map_path.open("w", encoding="utf-8") as f:
    json.dump(asset_map, f, indent=2, ensure_ascii=False)

print(f"\nAsset migration complete!")
print(f"Found {total_files} files in the uploads directory.")
print(f"Successfully uploaded/mapped {uploaded_files} new files.")
print(f"Total entries in asset map: {len(asset_map)}")
