// frontend/components/WorkoutPlanPreview.tsx
"use client";

type Exercise = {
  id: string;
  name: string;
  equipment?: string | null;
  movement_pattern?: string | null;
};

type WorkoutBlock = {
  block_type: string;
  sequence_index: number;
  rest_seconds?: number | null;
  notes?: string | null;
  sets: Array<{
    exercise_id: string;
    set_index: number;
    target_reps_min?: number | null;
    target_reps_max?: number | null;
      seconds?: number | null;
      reps_text?: string | null;
    target_load_value?: number | null;
    rest_seconds?: number | null;
    notes?: string | null;
    prescription_text?: string | null;
  }>;
};

type WorkoutPlanPreviewProps = {
  blocks: WorkoutBlock[];
  exerciseMap: Map<string, Exercise>;
};

export function WorkoutPlanPreview({ blocks, exerciseMap }: WorkoutPlanPreviewProps) {
  // Group sets by exercise_id within each block
  const groupedBlocks = blocks.map((block) => {
    // Group sets by exercise_id
    const exerciseGroups = new Map<string, typeof block.sets>();
    block.sets.forEach((set) => {
      if (!exerciseGroups.has(set.exercise_id)) {
        exerciseGroups.set(set.exercise_id, []);
      }
      exerciseGroups.get(set.exercise_id)!.push(set);
    });

    // Convert to array and sort by first set_index
    const exercises = Array.from(exerciseGroups.entries())
      .map(([exercise_id, sets]) => ({
        exercise_id,
        sets: sets.sort((a, b) => a.set_index - b.set_index),
      }))
      .sort((a, b) => {
        const aFirstSet = a.sets[0];
        const bFirstSet = b.sets[0];
        return (aFirstSet?.set_index ?? 0) - (bFirstSet?.set_index ?? 0);
      });

    return {
      ...block,
      exercises,
    };
  });

  // Sort blocks by sequence_index
  const sortedBlocks = groupedBlocks.sort((a, b) => a.sequence_index - b.sequence_index);

  return (
    <div className="space-y-3">
      {sortedBlocks.map((block, blockIdx) => (
        <div key={blockIdx} className="rounded border border-slate-700 bg-slate-950 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 capitalize">
              {block.block_type} block
            </span>
            {block.rest_seconds && (
              <span className="text-xs text-slate-500">
                {block.rest_seconds}s rest
              </span>
            )}
          </div>
          <div className="space-y-2">
            {block.exercises.map((exercise, exIdx) => {
              const exerciseData = exerciseMap.get(exercise.exercise_id);
              const exerciseName = exerciseData?.name || exercise.exercise_id;
              return (
                <div key={exIdx} className="text-xs">
                  <p className="font-medium text-slate-200">
                    {exerciseName}
                    {exerciseData?.movement_pattern || exerciseData?.equipment ? (
                      <span className="ml-2 text-slate-500">
                        {exerciseData.movement_pattern || ""}
                        {exerciseData.movement_pattern && exerciseData.equipment ? " · " : ""}
                        {exerciseData.equipment || ""}
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-1 ml-2 space-y-1">
                    {exercise.sets.map((set, setIdx) => {
                      let repsText = "";
                      if (set.target_reps_min !== null && set.target_reps_max !== null) {
                        repsText =
                          set.target_reps_min === set.target_reps_max
                            ? `${set.target_reps_min} reps`
                            : `${set.target_reps_min}-${set.target_reps_max} reps`;
                      } else if (set.seconds !== null && set.seconds !== undefined) {
                        repsText = `${set.seconds} seconds`;
                      } else if (set.reps_text) {
                        repsText = set.reps_text;
                      } else if (set.prescription_text) {
                        repsText = set.prescription_text;
                      } else {
                        repsText = "—";
                      }
                      return (
                        <p key={setIdx} className="text-slate-400">
                          Set {setIdx + 1}: {repsText}
                          {set.target_load_value !== null &&
                            set.target_load_value !== undefined &&
                            !repsText.includes("@") && (
                              <> @ {set.target_load_value}</>
                            )}
                          {set.notes && <> · {set.notes}</>}
                        </p>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

