import { Check } from "lucide-react";
import type { TaskSummary } from "../lib/api";
import ProgressRing from "./ui/ProgressRing";

/** The ring and the checklist read the same array, so they can never disagree. */
export default function TodayProgress({ tasks }: { tasks: TaskSummary[] }) {
  const done = tasks.filter((task) => task.doneToday).length;

  return (
    <section className="card progress-card">
      <div className="card-head">
        <h2>Today's progress</h2>
      </div>

      <div className="progress-body">
        <ProgressRing done={done} total={tasks.length} />

        <ul className="checklist">
          {tasks.map((task) => (
            <li key={task.id} className={task.doneToday ? "checked" : ""}>
              <span className="check-mark" aria-hidden="true">
                {task.doneToday && <Check size={12} strokeWidth={3.5} />}
              </span>
              <span className="check-text">{task.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
