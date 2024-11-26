from mesa import Agent
import random
import heapq
import math
from random import choice

class Car(Agent):
    """
    Agent that moves randomly.
    Attributes:
        unique_id: Agent's ID
        direction: Randomly chosen direction chosen from one of eight directions
    """

    def __init__(self, unique_id, model, goal):
        """
        Creates a new random agent.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
        """
        super().__init__(unique_id, model)
        self.goal = goal
        self.color = f"#{''.join(choice('0123456789ABCDEF') for _ in range(6))}"

    def move(self):
        """
        Determines if the agent can move in the direction that was chosen
        """
        # Check that the agent in possible_steps are rooads and get the direction of the road

        path = aStar(self.model.graph, self.pos, self.goal)

        if path == None:
            return
        if len(path) > 2:
            next_move = path[1]
        else:
            self.model.grid.remove_agent(self)
            self.model.schedule.remove(self)
            return

        # Check if the next move is a traffic light
        next_move = self.checkNextMoveIsNotCar(next_move)
        next_move = self.checkTrafficLight(next_move)
        # Move the agent to next_move
        self.model.grid.move_agent(self, next_move)

    def checkNextMoveIsNotCar(self, next_move):
        """
        Verifica si el próximo movimiento es hacia una posición ocupada por otro coche.
        Si es así, busca una ruta alternativa o se detiene.
        """
        agent = self.model.getPosAgent(next_move, Car)
        if agent:
            # Intenta encontrar una ruta alternativa
            alternative_moves = [move for move in self.model.graph[self.pos] if move != next_move and not self.model.getPosAgent(move, Car)]
            if alternative_moves:
                move = random.choice(alternative_moves)
                self.model.grid.move_agent(self, move)
                return move
            else:
                return self.pos
        return next_move


    def checkTrafficLight(self, next_move):
        """
        Checks if the next move is a traffic light
        """
        agent = self.model.getPosAgent(next_move, Traffic_Light)
        if agent:
            if agent.state:
                # If it is green, move
                self.model.grid.move_agent(self, next_move)
                return next_move
            else:
                return self.pos
        return next_move

    def step(self):
        self.move()

    
def aStar(graph, start, goal):
    # Initialize the open and closed sets
    open_set = [(0, start)]  # Priority queue of (f_score, node)
    closed_set = set()

    # Initialize dictionaries to store g_scores and parents
    g_scores = {node: float("inf") for node in graph}
    g_scores[start] = 0
    parents = {}

    while open_set:
        # Get the node with the lowest f_score from the open set
        f_score, current_node = heapq.heappop(open_set)

        if current_node == goal:
            # Reconstruct the path if the goal is reached
            path = []
            while current_node in parents:
                path.insert(0, current_node)
                current_node = parents[current_node]
            path.insert(0, start)
            return path

        closed_set.add(current_node)

        for neighbor in graph[current_node]:
            if neighbor in closed_set:
                continue  # Skip already evaluated nodes

            # Calculate the tentative g_score
            tentative_g_score = (
                g_scores[current_node] + 1
            )  # Assuming all edge weights are 1

            if tentative_g_score < g_scores[neighbor]:
                # This path to the neighbor is better than any previous one
                parents[neighbor] = current_node
                g_scores[neighbor] = tentative_g_score

                # Calculate the heuristic (Euclidean distance)
                h_score = euclidean_distance(neighbor, goal)

                # Calculate the f_score (f = g + h)
                f_score = tentative_g_score + h_score

                heapq.heappush(open_set, (f_score, neighbor))

    # If no path is found
    return None


def euclidean_distance(point1, point2):
    x1, y1 = point1
    x2, y2 = point2
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)



class Traffic_Light(Agent):
    """
    Traffic light. Where the traffic lights are in the grid.
    """

    def __init__(self, unique_id, model, state=False, timeToChange=10):
        super().__init__(unique_id, model)
        """
        Creates a new Traffic light.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            state: Whether the traffic light is green or red
            timeToChange: After how many step should the traffic light change color 
        """
        self.unique_id = unique_id
        self.state = state
        self.timeToChange = timeToChange

        # Get the edge position on edge with direction to the center.

    def step(self):
        """
        Cambia el estado del semáforo en base al tráfico detectado.
        """
        traffic_count = self.model.count_traffic_around_light(self.pos)
        
        # Puedes ajustar estos valores según necesites
        traffic_threshold_for_change = 4  # cambiar si hay 3 o más coches
        time_threshold_for_change = 10  # cambiar cada 10 pasos
        
        if traffic_count >= traffic_threshold_for_change or self.model.schedule.steps % time_threshold_for_change == 0:
            self.state = not self.state


class Destination(Agent):
    """
    Destination agent. Where each car should go.
    """

    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass


class Obstacle(Agent):
    """
    Obstacle agent. Just to add obstacles to the grid.
    """

    def __init__(self, unique_id, model):
        super().__init__(unique_id, model)

    def step(self):
        pass


class Road(Agent):
    """
    Road agent. Determines where the cars can move, and in which direction.
    """

    def __init__(self, unique_id, model, direction="Left"):
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
