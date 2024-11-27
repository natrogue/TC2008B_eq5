from flask import Flask, jsonify, request
from flask_cors import CORS
from model import CityModel
from agent import Car, Traffic_Light

app = Flask(__name__)
CORS(app)  # Enable CORS to allow requests from the WebGL frontend

# Initialize the model (global variable for simplicity)
model = None

@app.route('/init', methods=['POST'])
def init_simulation():
    global model
    try:
        params = request.json
        width = params.get('width', 30)
        height = params.get('height', 30)

        # Initialize the model
        model = CityModel(width, height)
        print(f"[INFO] Model initialized with size {width}x{height}")
        return jsonify({'message': 'Simulation initialized successfully'}), 200
    except Exception as e:
        print(f"[ERROR] Model initialization failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/getAgents', methods=['GET'])
def get_agents():
    global model
    if not model:
        print("[ERROR] /getAgents called before /init")
        return jsonify({'error': 'Model not initialized. Call /init first.'}), 400
    try:
        agents = []
        for agent in model.schedule.agents:
            if isinstance(agent, Car):
                agents.append({
                    'id': agent.unique_id,
                    'x': agent.pos[0],
                    'y': 0,
                    'z': agent.pos[1],
                })
        print(f"[INFO] Fetched agents: {agents}")
        return jsonify({'positions': agents}), 200
    except Exception as e:
        print(f"[ERROR] Error fetching agents: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/update', methods=['POST'])
def update_simulation():
    global model
    try:
        if not model:
            return jsonify({'error': 'Simulation not initialized'}), 400

        # Advance the model by one step
        model.step()
        return jsonify({'message': 'Simulation updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(port=8585, debug=True)