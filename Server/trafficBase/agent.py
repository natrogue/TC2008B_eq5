from mesa import Agent
import math
import heapq # Para usar la cola de prioridad en algoritmo a estrella
import random

# solo car y trafficLight se van a ir actualizando, los demás agentes no necesitan 'step'

class Car(Agent):
    """
    Agent that moves based on road direction, respects traffic lights, and moves toward its assigned destination.
    """
    def __init__(self, unique_id, model, goal):
        super().__init__(unique_id, model)
        self.goal = goal

    def move(self):
        """
        Moves the agent based on road direction, traffic light state, and logic for intersections.
        """
        path = self.a_star(self.model.graph, self.pos, self.goal)

        if path is None:
            return
        if len(path) > 2:
            next_move = path[1]
        else:
            self.model.grid.remove_agent(self)
            self.model.schedule.remove(self)
            return
        
        next_move = self.checkNextMoveIsNotCar(next_move)
        next_move = self.checkTrafficLight(next_move)

        self.model.grid.move_agent(self, next_move)

    def checkNextMoveIsNotCar(self, next_move):
        agent = self.model.getPosAgent(next_move, Car)
        if agent:
            alternative_moves = [move for move in self.model.graph[self.pos] if move != next_move and self.model.getPosAgent(move, Car)]
            if alternative_moves:
                move = random.choice(alternative_moves)
                self.model.grid.move_agent(self, move)
                return move
            else:
                return self.pos
        return next_move

    #antes de la definición de la clase de semáforo, esto es para que car sepa si la 
    #siguiente es semáforo.
    def checkTrafficLight(self, next_move):
        agent = self.model.getPosAgent(next_move, Traffic_Light)
        if agent:
            if agent.state:
                self.model.grid.move_agent(self, next_move)
                return next_move
            else:
                return self.pos
        return next_move
    
    def step(self):
        self.move()

    # a estrella se encarga de encontrar el camino más corto entre inicio - destino
    def a_estrella(self, graph, start, goal):
        open_set = [(0, start)]
        closed_set = set()

        g_scores = {node: float("inf") for node in graph}
        g_scores[start] = 0
        parents = {}

        while open_set: #mientras haya nodos en la lista abierta
            f_score, current_node = heapq.heappop(open_set)

            if current_node == goal:
                path = []
                while current_node in parents:
                    path.insert(0, current_node)
                    current_node = parents[current_node]
                path.insert(0, start)
                return path
            closed_set.add(current_node)

            for neighbor in graph[current_node]:
                if neighbor in closed_set:
                    continue
                tentative_g_score = g_scores[current_node]+1

                if tentative_g_score < g_scores[neighbor]:
                    parents[neighbor] = current_node
                    g_scores[neighbor] = tentative_g_score

                    h_score = self.euclidean_distance(neighbor, goal)

                    f_score = tentative_g_score + h_score

                    heapq.heappush(open_set, (f_score, neighbor))
        
        return None
    
    # definición de la distancia euclidiana - para el algoritmo a estrella
    def euclidean_distance(self, pos1, pos2):
        x1, y1 = pos1
        x2, y2 = pos2
        return math.sqrt((x1-x2)**2 + (y1-y2)**2)


class Traffic_Light(Agent):
    """
    Traffic light. Where the traffic lights are in the grid.
    """
    def __init__(self, unique_id, model, state = False, timeToChange = 10):
        super().__init__(unique_id, model)
        """
        Creates a new Traffic light.
        """
        self.state = state
        self.timeToChange = timeToChange
        self.unique_id = unique_id

    def step(self):
        """ 
        To change the state (green or red) of the traffic light in case you consider the time to change of each traffic light.
        """
        traffic_count = self.model.count_traffic_around_light(self.pos)

        traffic_time_change = 3
        time_space_to_change = 8

        if traffic_count >= traffic_time_change or self.model.schedule.steps % time_space_to_change == 0:
            self.state = not self.state


class Destination(Agent):
    """
    Where each car goes, it's the goal of the agent.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass # nothing to change or do

class Obstacle(Agent):
    """
    Obstacle agent. Just to add obstacles to the grid.
    """
    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass # nothing to change or do

class Road(Agent):
    """
    Road agent. Determines where the cars can move, and in which direction.
    """
    def __init__(self, unique_id, model, direction= "Left"):
        """
        Creates a new road.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            direction: Direction where the cars can move
        """
        super().__init__(unique_id, model)
        self.direction = direction

    def step(self):
        pass
