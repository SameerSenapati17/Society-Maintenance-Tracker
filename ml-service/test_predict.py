import requests
import json

image_path = r"C:\Users\samee\Downloads\thane-waste-management.jpg"

with open(image_path, "rb") as f:
    response = requests.post(
        "http://127.0.0.1:8001/predict?explain=true",
        files={"file": f},
        timeout=60,
    )

print("Status:", response.status_code)
print(json.dumps(response.json(), indent=2))