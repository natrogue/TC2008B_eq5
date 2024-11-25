from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from agent import *
import json

class CityModel(Model):
    def __init__(self):
        # Cargar el diccionario del mapa
        dataDictionary = json.load(open("city_files/mapDictionary.json"))
        self.traffic_lights = []

        # Cargar el archivo de mapa
        with open('city_files/2023_base.txt') as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0]) - 1
            self.height = len(lines)

            self.grid = MultiGrid(self.width, self.height, torus=False) 
            self.schedule = RandomActivation(self)

            # Creación de agentes según el mapa
            for r, row in enumerate(lines):
                for c, col in enumerate(row):
                    if col in ["v", "^", ">", "<"]:
                        direction = dataDictionary[col]
                        agent = Road(f"r_{r*self.width+c}", self, direction)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

                    elif col in ["S", "s"]:
                        time_to_change = dataDictionary[col]
                        agent = Traffic_Light(f"tl_{r*self.width+c}", self, state=(col == "s"), timeToChange=time_to_change)
                        self.grid.place_agent(agent, (c, self.height - r - 1))
                        self.schedule.add(agent)
                        self.traffic_lights.append(agent)

                    elif col == "#":
                        agent = Obstacle(f"ob_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

                    elif col == "D":
                        agent = Destination(f"d_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

        # Inicializar un coche en la esquina (0, 0)
        car = Car("car_0", self)
        self.grid.place_agent(car, (0, 0))  # Esquina inicial
        self.schedule.add(car)

        self.running = True
        self.car_counter = 1  # Contador para asignar IDs únicos a los coches

    def step(self):
        """Avanzar la simulación un paso.
        # Crear un nuevo coche cada 15 pasos
        if self.schedule.steps % 15 == 0:
            new_car = Car(f"car_{self.car_counter}", self)
            self.grid.place_agent(new_car, (0, 0))  # Posición inicial del coche
            self.schedule.add(new_car)
            self.car_counter += 1
"""
        # Ejecutar el siguiente paso de todos los agentes
        self.schedule.step()