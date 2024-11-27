# TC2008B. Sistemas Multiagentes y Gráficas Computacionales
# Python flask server to interact with webGL.
# Octavio Navarro. 2024

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin

from model import CityModel
from agent import Car, Traffic_Light

# Size of the board:
number_agents = 10
width = 28
height = 28
randomModel = None
currentStep = 0

# This application will be used to interact with WebGL
app = Flask("Traffic example")
cors = CORS(app, origins=['http://localhost:8585/'])

# This route will be used to send the parameters of the simulation to the server.
# The servers expects a POST request with the parameters in a.json.
@app.route('/init', methods=['POST'])
@cross_origin() # this decorator will allow the server to accept requests from the WebGL application
def initModel():
    global currentStep, cityModel, number_agents, width, height

    if request.method == 'POST':
        try:

            number_agents = int(request.json.get('NAgents'))
            width = int(request.json.get('width'))
            height = int(request.json.get('height'))
            currentStep = 0

            print(request.json)
            print(f"Model parameters:{number_agents, width, height}")

            # Create the model using the parameters sent by the application
            randomModel = CityModel(number_agents, width, height)

            # Return a message to saying that the model was created successfully
            return jsonify({"message":"Parameters recieved, model initiated."})

        except Exception as e:
            print(e)
            return jsonify({"message":"Erorr initializing the model"}), 500

# This route will be used to get the positions of the agents
@app.route('/getAgents', methods=['GET'])
@cross_origin()
def getAgents():
    global cityModel
    cityModel = CityModel(number_agents, width, height)

    if request.method == 'GET':
        # Get the positions of the agents and return them to WebGL in JSON.json.t.
        # Note that the positions are sent as a list of dictionaries, where each dictionary has the id and position of an agent.
        # The y coordinate is set to 1, since the agents are in a 3D world. The z coordinate corresponds to the row (y coordinate) of the grid in mesa.
        try:
            # diccionario con llave id y valor x, y, z
            agentPositions = [
                {"id": str(a.unique_id), "x": x, "y":1, "z":z} # explain
                for a, (x, z) in cityModel.grid.coord_iter()
                if isinstance(a, Car)
            ]

            return jsonify({'positions':agentPositions})
        except Exception as e:
            print(e)
            return jsonify({"message":"Error with the agent positions"}), 500

# This route will be used to get the positions of the lights
@app.route('/getTrafficLights', methods=['GET'])
@cross_origin()
def getTrafficLights():
    global cityModel

    if request.method == 'GET':
        try:
            # diccionario con llave id y valor x, y, z
            agentPositions = [
                {"id": str(a.unique_id), "x": x, "y":1, "z":z} # explain
                for a, (x, z) in cityModel.grid.coord_iter()
                if isinstance(a, Traffic_Light)
            ]

            return jsonify({'positions':agentPositions})
        except Exception as e:
            print(e)
            return jsonify({"message":"Error with the agent positions"}), 500

# This route will be used to update the model
@app.route('/update', methods=['GET'])
@cross_origin()
def updateModel():
    global currentStep, randomModel
    if request.method == 'GET':
        try:
        # Update the model and return a message to WebGL saying that the model was updated successfully
            randomModel.step()
            currentStep += 1
            return jsonify({'message':f'Model updated to step {currentStep}.', 'currentStep':currentStep})
        except Exception as e:
            print(e)
            return jsonify({"message":"Error during step."}), 500


if __name__=='__main__':
    # Run the flask server in port 8585
    app.run(host="localhost", port=8585, debug=True)
