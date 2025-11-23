from app.db.base import Base  # noqa

from .trainer import Trainer  # noqa
from .client import Client  # noqa
from .muscle import Muscle, MuscleGroup  # noqa
from .tag import Tag  # noqa
from .exercise import Exercise, ExerciseTag  # noqa
from .template import Template, TemplateBlock, TemplateSet  # noqa
from .workout import Workout, WorkoutBlock, WorkoutSet, CompletedSet  # noqa
from .progression import ProgressionRule  # noqa

