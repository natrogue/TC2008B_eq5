from agent import *
from model import CityModel
from mesa.visualization import CanvasGrid, BarChartModule
from mesa.visualization import ModularServer

def agent_portrayal(agent):
    if agent is None:
        return

    portrayal = {"Shape": "rect",
                 "Filled": "true",
                 "Layer": 1,
                 "w": 1,
                 "h": 1}

    if isinstance(agent, Road):
        portrayal["Color"] = "grey"
        portrayal["Layer"] = 0

    if isinstance(agent, Traffic_Light):
        portrayal["Color"] = "red" if not agent.state else "green"
        portrayal["Layer"] = 1
        portrayal["w"] = 0.8
        portrayal["h"] = 0.8

    if isinstance(agent, Car):
        portrayal["Color"] = "black"
        portrayal["Layer"] = 2

    if isinstance(agent, Destination):
        portrayal["Color"] = "lightgreen"
        portrayal["Layer"] = 0

    if isinstance(agent, Obstacle):
        portrayal["Color"] = "cadetblue"
        portrayal["Layer"] = 0

    return portrayal

grid = CanvasGrid(agent_portrayal, 25, 25, 500, 500)
server = ModularServer(CityModel, [grid], "City Traffic Simulation", {})
server.port = 8521
server.launch()