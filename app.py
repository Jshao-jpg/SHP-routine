from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from excel_handler import ExcelHandler
import os
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='frontend/dist')
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

DEFAULT_EXCEL = '5.shipping cost based on summary.xlsx'
current_handler = ExcelHandler(os.path.join(BASE_DIR, DEFAULT_EXCEL))


@app.route('/api/upload', methods=['POST'])
def upload_file():
    global current_handler
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file:
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        current_handler = ExcelHandler(filepath)
        return jsonify({"message": f"Successfully loaded {filename}", "filename": filename})

@app.route('/api/load-builtin', methods=['POST'])
def load_builtin():
    global current_handler
    current_handler = ExcelHandler(os.path.join(BASE_DIR, DEFAULT_EXCEL))
    return jsonify({"message": "Successfully loaded built-in workbook"})

@app.route('/api/download-builtin', methods=['GET'])
def download_builtin():
    try:
        # Send the built-in excel file as an attachment using absolute path
        return send_from_directory(BASE_DIR, DEFAULT_EXCEL, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/routes', methods=['GET'])
def get_routes():
    try:
        options = current_handler.get_route_options()
        return jsonify(options)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/fields', methods=['POST'])
def get_fields():
    try:
        data = request.json
        node = data.get('node')
        location = data.get('location')
        if not node or not location:
            return jsonify({"error": "Missing node or location"}), 400
        
        fields = current_handler.get_node_fields(node, location)
        return jsonify(fields)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/calculate', methods=['POST'])
def calculate():
    try:
        data = request.json
        if not isinstance(data, list):
            return jsonify({"error": "Expected a list of selections"}), 400
        
        result = current_handler.calculate(data)
        return jsonify(result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# Serve Frontend static files (Catch-all)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=False, port=port, host='0.0.0.0')
