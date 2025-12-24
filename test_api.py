import requests
import json

url = "http://localhost:5000/api/calculate"
data = [
    {
        "node": "A",
        "location": "WADG -> Dyson PH Batangas",
        "inputs": {
            "Incoterms": "DAP",
            "Destination": "Batangas",
            "Equipment": "40GP",
            "Load Type": "FCL",
            "SUMMARY": "Ocean"
        }
    }
]

try:
    response = requests.post(url, json=data)
    print(response.status_code)
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(e)
