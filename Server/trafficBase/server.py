from agent import *
from model import CityModel
from mesa.visualization import CanvasGrid, BarChartModule
from mesa.visualization import ModularServer
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin

# Parameters
number_agents = 10
width = 25
height = 25
city_model = None  # Instance of CityModel
currentStep = 0

# Flask app setup
app = Flask("Traffic Example")
cors = CORS(app, origins=['http://localhost', 'http://localhost:8585'])

# @app.route('/init', methods=['POST'])
# @cross_origin()
# def initModel():
#     global currentStep, city_model, number_agents, width, height

#     try:
#         number_agents = int(request.json.get('NAgents', 10))
#         width = int(request.json.get('width', 25))
#         height = int(request.json.get('height', 25))
#         currentStep = 0

#         # Crear la instancia del modelo
#         city_model = CityModel(number_agents, width, height)
#         print("CityModel inicializado correctamente.")

#         return jsonify({"message": "Modelo inicializado correctamente."})
#     except Exception as e:
#         print("Error inicializando el modelo:", e)
#         return jsonify({"message": "Error inicializando el modelo", "error": str(e)}), 500


@app.route("/init", methods=['POST'])
@cross_origin()
def initModel():
    global currentStep, CityModel
    if request.method == 'POST':
        currentStep = 0
        CityModel = CityModel()

        return jsonify({"message": "Default parameters recieved, model initiated."})


# @app.route('/getCars', methods=['GET'])
# @cross_origin()
# def getCars():
#     global CityModel

#     if CityModel is None:
#         return jsonify({"message": "Model not initialized."}), 400

#     try:
#         car_positions = [
#             {"id": str(agent.unique_id), "x": pos[0], "y": 1, "z": pos[1]}
#             for (pos, agents) in CityModel.grid.coord_iter()
#             for agent in agents if isinstance(agent, Car)
#         ]
#         return jsonify({'positions': car_positions})
#     except Exception as e:
#         print("Error fetching agent positions:", e)
#         return jsonify({"message": "Error fetching agent positions", "error": str(e)}), 500


@app.route("/getCars", methods=['GET'])
@cross_origin()
def getAgents():
    global CityModel

    if request.method == 'GET':
        agentPositions = [
            {"id": str(agent.unique_id), "x": x, "y":1, "z":z}
            for agents, (x, z) in CityModel.grid.coord_iter()
            for agent in agents
            if isinstance(agent, Car)
        ]

        return jsonify({"positions": agentPositions})


# @app.route('/update', methods=['GET'])
# @cross_origin()
# def updateModel():
#     """Update the model to the next step."""
#     global currentStep, city_model

#     try:
#         if not city_model:
#             raise ValueError("Model not initialized")

#         # Update the model
#         city_model.step()
#         currentStep += 1
#         print(f"Model updated to step {currentStep}")

#         return jsonify({'message': f'Model updated to step {currentStep}.', 'currentStep': currentStep})
#     except Exception as e:
#         print("Error during step:", e)
#         return jsonify({"message": "Error updating model"}), 500

@app.route("/update", methods=['GET'])
@cross_origin()
def updateModel():
    global currentStep, CityModel
    if request.method == 'GET':
        CityModel.step()
        currentStep += 1
        print(currentStep, "Update Number")
        return jsonify(
            {
                "message": f"Model updated to step {currentStep}.",
                "currentStep": currentStep,
            }
        )


if __name__ == '__main__':
    # Run the Flask app on port 8585
    app.run(host="localhost", port=8585, debug=True)