from mesa import Model
from mesa.time import RandomActivation
from mesa.space import MultiGrid
from agent import *
import json
import random


class CityModel(Model):
    """
    Creates a model based on a city map.

    Args:
        N: Number of agents in the simulation
    """
    def count_traffic_around_light(self, traffic_light_pos):
        """
        Cuenta los agentes Car alrededor de un semáforo.

        Args:
            traffic_light_pos (tuple): La posición del semáforo.

        Returns:
            int: Número de agentes Car cerca del semáforo.
        """
        neighborhood = self.grid.get_neighborhood(
            traffic_light_pos, moore=True, include_center=False
        )
        car_count = 0
        for pos in neighborhood:
            agents = self.grid.get_cell_list_contents([pos])
            car_count += sum(isinstance(agent, Car) for agent in agents)

        return car_count


    def __init__(self):
        # Load the map dictionary. The dictionary maps the characters in the map file to the corresponding agent.
        dataDictionary = json.load(open("city_files/mapDictionary.json"))

        self.traffic_lights = []
        self.max_agents = 10
        self.graph = {}
        self.step_count = 0
        self.agent_count = 0
        self.destinations = []
        # Load the map file. The map file is a text file where each character represents an agent.
        with open("city_files/2024_base.txt") as baseFile:
            lines = baseFile.readlines()
            self.width = len(lines[0]) - 1
            self.height = len(lines)

            self.grid = MultiGrid(self.width, self.height, torus=False)
            self.schedule = RandomActivation(self)

            # Goes through each character in the map file and creates the corresponding agent.
            for r, row in enumerate(lines):
                for c, col in enumerate(row):
                    if col in ["v", "^", ">", "<"]:
                        agent = Road(f"r_{r*self.width+c}", self, dataDictionary[col])
                        self.grid.place_agent(agent, (c, self.height - r - 1))
                        edge = self.getFirstConnectedNode(
                            dataDictionary[col], (c, self.height - r - 1)
                        )
                        if edge:
                            self.graph[(c, self.height - r - 1)] = [edge]
                        else:
                            self.graph[(c, self.height - r - 1)] = []

                    elif col in ["S", "s"]:
                        agent = Traffic_Light(
                            f"S_{r*self.width+c}",
                            self,
                            False if col == "S" else True,
                            int(dataDictionary[col]),
                        )
                        self.grid.place_agent(agent, (c, self.height - r - 1))
                        self.schedule.add(agent)
                        self.traffic_lights.append(agent)

                    elif col == "#":
                        agent = Obstacle(f"ob_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))

                    elif col == "D":
                        agent = Destination(f"d_{r*self.width+c}", self)
                        self.grid.place_agent(agent, (c, self.height - r - 1))
                        self.destinations.append(agent.pos)

        for i, light in enumerate(self.traffic_lights):
            if i % 2 == 0 and i + 1 < len(self.traffic_lights):
                light.pair = self.traffic_lights[i + 1]
                self.traffic_lights[i + 1].pair = light

        self.running = True

        self.fillTrafficLightsEdges()
        self.fillOtherEdges()
        self.addAllDestiniesToGraph()

        print(self.graph)


    # First connected node
    def getFirstConnectedNode(self, direction, position):
        """Gets the first connected node to based on direction."""
        edge = None
        if direction == "Right":
            edge = (position[0] + 1, position[1])
        elif direction == "Left":
            edge = (position[0] - 1, position[1])
        elif direction == "Up":
            edge = (position[0], position[1] + 1)
        elif direction == "Down":
            edge = (position[0], position[1] - 1)
        else:
            return False

        if (
            edge[0] >= 0
            and edge[0] < self.width
            and edge[1] >= 0
            and edge[1] < self.height
        ):
            return edge
        else:
            return False

    # Traffic lights edges
    def fillTrafficLightsEdges(self):
        """
        This function fills the graph with the edges from the traffic lights.
        """
        # Iterate through the traffic lights
        for traffic_light in self.traffic_lights:
            # Get traffic light neighborhood and detect the road agents
            neighborhood = self.grid.get_neighborhood(
                traffic_light.pos, moore=False, include_center=False
            )
            for neighbor in neighborhood:
                if self.getPosAgent(neighbor, Road):
                    # Get the direction of the road
                    agent = self.getPosAgent(neighbor, Road)
                    direction = agent.direction
                    if self.graph[agent.pos][0] == traffic_light.pos:
                        self.graph[traffic_light.pos] = [
                            self.generateLightEdge(traffic_light.pos, direction)
                        ]

    def generateLightEdge(self, traffic_light_pos, direction):
        """
        This function generates the edge of a traffic light.
        """
        if direction == "Right":
            return (traffic_light_pos[0] + 1, traffic_light_pos[1])
        elif direction == "Left":
            return (traffic_light_pos[0] - 1, traffic_light_pos[1])
        elif direction == "Up":
            return (traffic_light_pos[0], traffic_light_pos[1] + 1)
        elif direction == "Down":
            return (traffic_light_pos[0], traffic_light_pos[1] - 1)
        else:
            return False
        # Get traffic light neighborhood and detect the road agents

    # Extra edges
    def fillOtherEdges(self):
        """
        This function fills the graph with the other edges from the roads.
        """
        # Iterate through the graph
        for node in self.graph:
            # Iterate through the edges of the node
            if len(self.graph[node]) == 1:
                # If the node has only one edge, then we need to find the other edges
                if self.getPosAgent(node, Road):
                    direction = self.getPosAgent(node, Road).direction
                    self.getOtherConnectedNode(direction, node)

    def getOtherConnectedNode(self, direction, position):
        """Gets the first connected node to based on direction."""

        if position[1] != self.height - 1:
            if direction == "Right" and self.getPosAgent(
                (position[0] + 1, position[1] + 1), Road
            ):
                self.graph[position].append((position[0] + 1, position[1] + 1))

            if direction == "Left" and self.getPosAgent(
                (position[0] - 1, position[1] + 1), Road
            ):
                self.graph[position].append((position[0] - 1, position[1] + 1))

        if position[1] != 0:
            if direction == "Right" and self.getPosAgent(
                (position[0] + 1, position[1] - 1), Road
            ):
                self.graph[position].append((position[0] + 1, position[1] - 1))

            if direction == "Left" and self.getPosAgent(
                (position[0] - 1, position[1] - 1), Road
            ):
                self.graph[position].append((position[0] - 1, position[1] - 1))

        if position[0] != self.width - 1:
            if direction == "Up" and self.getPosAgent(
                (position[0] + 1, position[1] + 1), Road
            ):
                self.graph[position].append((position[0] + 1, position[1] + 1))

            if direction == "Down" and self.getPosAgent(
                (position[0] + 1, position[1] - 1), Road
            ):
                self.graph[position].append((position[0] + 1, position[1] - 1))

        if position[0] != 0:
            if direction == "Up" and self.getPosAgent(
                (position[0] - 1, position[1] + 1), Road
            ):
                self.graph[position].append((position[0] - 1, position[1] + 1))

            if direction == "Down" and self.getPosAgent(
                (position[0] - 1, position[1] - 1), Road
            ):
                self.graph[position].append((position[0] - 1, position[1] - 1))

    def getPosAgent(self, position, object=Road):
        """Gets the road agent on a a position."""
        for agent in self.grid.get_cell_list_contents([position]):
            if isinstance(agent, object):
                return agent

        return False

    def countCarAgents(self):
        """Counts the number of car agents in the simulation."""
        count = 0
        for agent in self.schedule.agents:
            if isinstance(agent, Car):
                count += 1
        return count

    ############################
    #### Spawn functions #######
    ############################

    def findSpawnPostions(self):
        """Finds a spawn location for a car agent."""
        possibleSpawnLocations = []
        for agent in self.grid.coord_iter():
            if isinstance(agent[0][0], Road):
                direction = agent[0][0].direction
                position = agent[1]
                if self.checkSpawnPosition(position, direction):
                    possibleSpawnLocations.append(position)

        # Return 4 unique random spawn locations
        uniqueSpawnLocations = []
        for i in range(4):
            spawnLocation = random.choice(possibleSpawnLocations)
            possibleSpawnLocations.remove(spawnLocation)
            uniqueSpawnLocations.append(spawnLocation)
        return uniqueSpawnLocations

    def checkSpawnPosition(self, position, direction):
        """Checks if a spawn position is valid."""
        if position[0] == 0 and direction == "Right":
            return True
        elif position[0] == self.width - 1 and direction == "Left":
            return True
        elif position[1] == 0 and direction == "Up":
            return True
        elif position[1] == self.width - 1 and direction == "Down":
            return True
        else:
            return False

    ############################
    #### Destiny functions #####
    ############################

    def addAllDestiniesToGraph(self):
        """Adds all destinies to the graph."""
        for destiny in self.destinations:
            self.addDestinyToGraph(destiny)

    def addDestinyToGraph(self, destiny):
        """Adds a destiny to the graph."""
        # Make destiny reachable from veritical and horzontal road neighbors
        neighborhood = self.grid.get_neighborhood(
            destiny, moore=False, include_center=False
        )
        for neighbor in neighborhood:
            # Check that neighbor is a road
            if self.getPosAgent(neighbor, Road):
                # Check that the road is horizontal or vertical to the destiny
                if (
                    neighbor[0] == destiny[0]
                    or neighbor[1] == destiny[1]
                    and neighbor != destiny
                ):
                    self.graph[neighbor].append(destiny)
                    self.graph[destiny] = []

    def step(self):
        """Advance the model by one step."""
        if self.step_count % 3 == 0:
            spawn_positions = self.findSpawnPostions()

            for i in range(4):
                destiny = random.choice(self.destinations)
                car = Car(self.agent_count, self, destiny)
                self.agent_count += 1
                self.grid.place_agent(car, spawn_positions[i])
                self.schedule.add(car)

        self.step_count += 1
        self.schedule.step()

