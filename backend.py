from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/detections', methods=['POST'])
def receive_detections():
    data = request.get_json()
    print("Received detections:")
    print(data)
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
