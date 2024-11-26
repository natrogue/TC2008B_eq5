from mesa import Agent
import random
from math import sqrt

class Car(Agent):
    """
    Agent that moves based on road direction, respects traffic lights, and moves toward its assigned destination.
    """
    def __init__(self, unique_id, model, goal):
        super().__init__(unique_id, model)
        self.current_direction = None  # Almacena la dirección actual del Car
        self.steps_in_direction = 0  # Número de celdas recorridas en la dirección actual

    def get_neighbors(self):
        """
        Get the neighbors of the agent in the grid.
        Returns a dictionary with neighbor positions and their contents.
        """
        current_position = self.pos

        neighbor_positions = self.model.grid.get_neighborhood(
            current_position,
            moore=False,  # Solo vecinos ortogonales
            include_center=False
        )

        neighbors = {
            position: self.model.grid.get_cell_list_contents(position)
            for position in neighbor_positions
        }

        return neighbors

    def _get_next_position(self, current_position, direction):
        """
        Get the next position based on the current direction.
        """
        if direction == "Left":
            return (current_position[0] - 1, current_position[1])
        elif direction == "Right":
            return (current_position[0] + 1, current_position[1])
        elif direction == "Up":
            return (current_position[0], current_position[1] + 1)
        elif direction == "Down":
            return (current_position[0], current_position[1] - 1)
        return current_position  # Dirección inválida

    def _distance_to_destination(self, position):
        """
        Calculate the Euclidean distance from a position to the destination.
        """
        if not self.destination:
            return float("inf")
        dest_x, dest_y = self.destination
        pos_x, pos_y = position
        return sqrt((dest_x - pos_x) ** 2 + (dest_y - pos_y) ** 2)

    def move(self):
        """
        Moves the agent based on road direction, traffic light state, and logic for intersections.
        """
        if not self.destination:
            return  # Si no tiene destino, no se mueve

        current_position = self.pos
        current_cell = self.model.grid.get_cell_list_contents(current_position)
        road = next((agent for agent in current_cell if isinstance(agent, Road)), None)

        # Si está sobre una carretera, actualiza la dirección actual
        if road:
            if self.current_direction is None:
                self.current_direction = road.direction

        # Si no hay dirección actual, no se mueve
        if not self.current_direction:
            return

        # Obtener los vecinos
        neighbors = self.get_neighbors()

        # Verificar si está en una intersección
        intersection_moves = []
        for position, agents in neighbors.items():
            road_agent = next((agent for agent in agents if isinstance(agent, Road)), None)
            car_agent = next((agent for agent in agents if isinstance(agent, Car)), None)
            obstacle_agent = next((agent for agent in agents if isinstance(agent, Obstacle)), None)

            # Considerar solo celdas que sean carreteras, no ocupadas por coches ni obstáculos
            if road_agent and not car_agent and not obstacle_agent:
                distance = self._distance_to_destination(position)
                possible_moves.append((position, road_agent.direction, distance))

        # Si no hay movimientos posibles, no hace nada
        if not possible_moves:
            return

        # Ordenar movimientos por distancia al destino (el más cercano primero)
        possible_moves.sort(key=lambda x: x[2])
        next_position, next_direction, _ = possible_moves[0]

        # Verificar semáforo en la celda de destino
        next_cell = self.model.grid.get_cell_list_contents(next_position)
        traffic_light = next((agent for agent in next_cell if isinstance(agent, Traffic_Light)), None)

        if traffic_light and not traffic_light.state:  # Semáforo en rojo
            return

        # Actualizar dirección actual y mover el coche
        self.current_direction = next_direction
        self.model.grid.move_agent(self, next_position)
        self.steps_in_direction += 1

        # Verificar si llegó al destino
        if next_position == self.destination:
            print(f"{self.unique_id} llegó a su destino: {self.destination}")
            self.model.cars_to_remove.append(self)  # Notificar al modelo que debe eliminar este coche

    def step(self):
        """
        Determines the new direction it will take, and then moves.
        """
        self.move()


# # class Car(Agent):
#     """
#     Agent that moves based on road direction, respects traffic lights, and only changes direction
#     when the neighboring road direction is different.
#     """
#     def __init__(self, unique_id, model):
#         super().__init__(unique_id, model)
#         self.current_direction = None  # Almacena la dirección actual del Car

#     def get_neighbors(self):
#         """
#         Get the neighbors of the agent in the grid.
#         Returns a dictionary with neighbor positions and their contents.
#         """
#         # Obtener la posición actual del agente
#         current_position = self.pos

#         # Obtener las celdas vecinas (moore=False para vecinos ortogonales)
#         neighbor_positions = self.model.grid.get_neighborhood(
#             current_position,
#             moore=False,  # Solo vecinos ortogonales
#             include_center=False
#         )

#         # Crear un diccionario con las posiciones y el contenido de cada vecino
#         neighbors = {
#             position: self.model.grid.get_cell_list_contents(position)
#             for position in neighbor_positions
#         }

#         return neighbors

#     def move(self):
#         """
#         Moves the agent based on road direction, traffic light state, and random choice at intersections.
#         Only changes direction if a neighboring road direction is different.
#         """
#         # Obtener la posición actual
#         current_position = self.pos

#         # Obtener el contenido de la celda actual
#         current_cell = self.model.grid.get_cell_list_contents(current_position)
#         road = next((agent for agent in current_cell if isinstance(agent, Road)), None)

#         # Si está sobre una carretera, actualiza la dirección actual
#         if road:
#             if self.current_direction is None:
#                 self.current_direction = road.direction
#             elif self.current_direction != road.direction:
#                 self.current_direction = road.direction

#         # Si no hay dirección actual, no se mueve
#         if not self.current_direction:
#             return

#         # Obtener los vecinos
#         neighbors = self.get_neighbors()

#         # Identificar las celdas vecinas válidas con agentes Road y direcciones diferentes
#         valid_moves = []
#         for position, agents in neighbors.items():
#             for agent in agents:
#                 if isinstance(agent, Road) and agent.direction != self.current_direction:
#                     valid_moves.append((position, agent.direction))

#         # Si no hay vecinos con direcciones diferentes, sigue en la misma dirección
#         if not valid_moves:
#             if self.current_direction == "Left":
#                 next_position = (current_position[0] - 1, current_position[1])
#             elif self.current_direction == "Right":
#                 next_position = (current_position[0] + 1, current_position[1])
#             elif self.current_direction == "Up":
#                 next_position = (current_position[0], current_position[1] + 1)
#             elif self.current_direction == "Down":
#                 next_position = (current_position[0], current_position[1] - 1)
#             else:
#                 return  # Dirección inválida
#         else:
#             # Elegir aleatoriamente un movimiento válido (dirección diferente)
#             chosen_move = random.choice(valid_moves)
#             next_position, next_direction = chosen_move
#             self.current_direction = next_direction

#         # Verificar si la celda está fuera del grid
#         if self.model.grid.out_of_bounds(next_position):
#             return

#         # Obtener el contenido de la celda de destino
#         next_cell = self.model.grid.get_cell_list_contents(next_position)
#         traffic_light = next((agent for agent in next_cell if isinstance(agent, Traffic_Light)), None)

#         # Si la celda de destino tiene un semáforo en rojo, no avanza
#         if traffic_light and not traffic_light.state:
#             return

#         # Mover el coche a la siguiente celda
#         self.model.grid.move_agent(self, next_position)

#     def step(self):
#         """
#         Determines the new direction it will take, and then moves.
#         """
#         self.move()
#     """
#     Agent that moves based on road direction and respects traffic lights.
#     """
#     def __init__(self, unique_id, model):
#         super().__init__(unique_id, model)
#         self.current_direction = None  # Almacena la dirección actual del Car

#     def move(self):
#         """
#         Moves the agent based on road direction and traffic light state.
#         """
#         # Obtener la posición actual
#         current_position = self.pos

#         # Obtener el contenido de la celda actual
#         current_cell = self.model.grid.get_cell_list_contents(current_position)
#         road = next((agent for agent in current_cell if isinstance(agent, Road)), None)
#         traffic_light = next((agent for agent in current_cell if isinstance(agent, Traffic_Light)), None)

#         # Si está sobre una carretera, actualiza la dirección
#         if road:
#             self.current_direction = road.direction

#         # Si no hay dirección actual (por algún error), no se mueve
#         if not self.current_direction:
#             return

#         # Determinar la siguiente celda según la dirección actual
#         if self.current_direction == "Left":
#             next_position = (current_position[0] - 1, current_position[1])
#         elif self.current_direction == "Right":
#             next_position = (current_position[0] + 1, current_position[1])
#         elif self.current_direction == "Up":
#             next_position = (current_position[0], current_position[1] + 1)
#         elif self.current_direction == "Down":
#             next_position = (current_position[0], current_position[1] - 1)
#         else:
#             return  # Dirección inválida

#         # Verificar si la celda está fuera del grid
#         if self.model.grid.out_of_bounds(next_position):
#             return

#         # Obtener el contenido de la siguiente celda
#         next_cell = self.model.grid.get_cell_list_contents(next_position)
#         next_traffic_light = next((agent for agent in next_cell if isinstance(agent, Traffic_Light)), None)

#         # Si la celda de destino tiene un semáforo en rojo, no avanza
#         if next_traffic_light and not next_traffic_light.state:
#             return

#         # Mover el coche a la siguiente celda
#         self.model.grid.move_agent(self, next_position)

#     def get_neighbors(self):
#         """
#         Get the neighbors of the agent in the grid.
#         Returns a dictionary with neighbor positions and their contents.
#         """
#         # Obtener la posición actual del agente
#         current_position = self.pos

#         # Obtener las celdas vecinas (moore=False para vecinos ortogonales, True para Moore)
#         neighbor_positions = self.model.grid.get_neighborhood(
#             current_position,
#             moore=True,  # Cambia a False si solo quieres vecinos ortogonales
#             include_center=False
#         )

#         # Crear un diccionario con las posiciones y el contenido de cada vecino
#         neighbors = {
#             position: self.model.grid.get_cell_list_contents(position)
#             for position in neighbor_positions
#         }

#         return neighbors


#     def step(self):
#         """
#         Determines the new direction it will take, and then moves.
#         """
#         self.move()

class Traffic_Light(Agent):
    """
    Traffic light. Where the traffic lights are in the grid.
    """
    def __init__(self, unique_id, model, state = False, timeToChange = 10):
        super().__init__(unique_id, model)
        """
        Creates a new Traffic light.
        Args:
            unique_id: The agent's ID
            model: Model reference for the agent
            state: Whether the traffic light is green or red
            timeToChange: After how many step should the traffic light change color 
        """
        self.state = state
        self.timeToChange = timeToChange

    def step(self):
        """ 
        To change the state (green or red) of the traffic light in case you consider the time to change of each traffic light.
        """
        if self.model.schedule.steps % self.timeToChange == 0:
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
