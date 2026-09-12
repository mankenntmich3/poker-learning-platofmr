"""Structural typing shim. Game implementations belong to Rangeform."""
from typing import Protocol


class Game(Protocol):
    num_players: int
