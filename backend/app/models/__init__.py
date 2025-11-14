from app.db.base import Base  # noqa

from .trainer import Trainer  # noqa
from .client import Client  # noqa
from .taxonomy import MuscleGroup, Muscle, Tag  # noqa
from .exercise import Exercise, ExerciseTag  # noqa
from .template import Template, TemplateBlock, TemplateSet  # noqa
from .workout import Workout, WorkoutBlock, WorkoutSet, CompletedSet  # noqa
from .progression import ProgressionRule  # noqa

