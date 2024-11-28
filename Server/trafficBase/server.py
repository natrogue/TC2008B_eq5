from agent import *
from model import CityModel
from mesa.visualization import CanvasGrid, BarChartModule
from mesa.visualization import ModularServer
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin

# Flask app setup
app = Flask("Traffic Example")
#cors = CORS(app, origins=['http://localhost', 'http://localhost:8585'])
cors=CORS(app, resources={r"/*": {"origins": "http://localhost:8585"}})

# Parameters
number_agents = 10
width = 30
height = 30
city_model = None  # Instance of CityModel
currentStep = 0


@app.route("/init", methods=['POST'])
@cross_origin()
def initModel():
    global currentStep, city_model
    if request.method == 'POST':
        currentStep = 0
        city_model = CityModel()
        print("CityModel inicializado correctamente.")

        return jsonify({"message": "Default parameters recieved, model initiated."})


@app.route("/getCars", methods=['GET'])
@cross_origin()
def getAgents():
    global city_model

    if request.method == 'GET':
        agentPositions = [
            {"id": str(agent.unique_id), "x": x, "y":1, "z":z}
            for agents, (x, z) in city_model.grid.coord_iter()
            for agent in agents
            if isinstance(agent, Car)
        ]
        
        return jsonify({"positions": agentPositions})

@app.route("/getTraffic_Light", methods=['GET'])
@cross_origin()
def getTraffic_Light():
    global city_model

    if request.method == 'GET':
        agentPositions = [
            {"id": str(agent.unique_id), "x": x, "y":1, "z":z}
            for agents, (x, z) in city_model.grid.coord_iter()
            for agent in agents
            if isinstance(agent, Traffic_Light)
        ]
        return jsonify({"positions": agentPositions})



@app.route("/getBuildings", methods=['GET'])
@cross_origin()
def getBuildings():
    global city_model

    if request.method == 'GET':
        agentPositions = [
            {"id": str(agent.unique_id), "x": x, "y":1, "z":z}
            for agents, (x, z) in city_model.grid.coord_iter()
            for agent in agents
            if isinstance(agent, Obstacle)
        ]

        return jsonify({"positions": agentPositions})


@app.route("/getDestinations", methods=['GET'])
@cross_origin()
def getDestinations():
    global city_model

    if request.method == 'GET':
        agentPositions = [
            {"id": str(agent.unique_id), "x": x, "y":1, "z":z}
            for agents, (x, z) in city_model.grid.coord_iter()
            for agent in agents
            if isinstance(agent, Destination)
        ]

        return jsonify({"positions": agentPositions})

@app.route("/update", methods=['GET'])
@cross_origin()
def updateModel():
    global currentStep, city_model
    if request.method == 'GET':
        city_model.step()
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