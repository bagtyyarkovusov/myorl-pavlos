import requests

API_URL = "http://localhost:1337/api/upload"
TOKEN = "9149081bacf8a9cc4e33e98e17f5a02c7fd428e782f848643473bfe9cf69c82c2bdbf6010c79454e072ec494f99db9fcf71cdae76768a6006b8ab95230971514312263efe66d9b0dbb869b7d536c213dab2b9c01cf9e24e07fef77fb72c7dfae882c5a8d57da2fa973a0167ee84f74e977ccee7743456f256f43cdb00b4abf87"

headers = {
    "Authorization": f"Bearer {TOKEN}"
}

filepath = "/Users/bagtyyar/Downloads/public_html 2/uploads/111373779_1022611594864965_1028528014325076399_n.jpg"
filename = "111373779_1022611594864965_1028528014325076399_n.jpg"

print(f"Uploading {filename}...")
try:
    with open(filepath, 'rb') as f:
        # Try a different structure for the files parameter
        files = {
            'files': (filename, f, 'image/jpeg')
        }
        response = requests.post(API_URL, headers=headers, files=files)
        
    print(response.status_code)
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
