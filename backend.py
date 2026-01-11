from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # This will enable CORS for all routes

@app.route('/api/detections', methods=['POST'])
def receive_detections():
    data = request.json
    print("Received detections:")
    for detection in data:
        print(f"  ID: {detection.get('id')}")
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
