import { FormEvent, useState } from "react";
import type { TaskPayload } from "../features/tasks/types";

interface Props {
  onSubmit: (payload: TaskPayload) => Promise<void>;
  creating?: boolean;
}

const initialState: TaskPayload = {
  title: "",
  description: "",
  status: "backlog",
  priority: 3,
  estimate_hours: 4,
  due_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
};

export function TaskComposer({ onSubmit, creating = false }: Props) {
  const [form, setForm] = useState<TaskPayload>(initialState);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form);
      setForm(initialState);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card composer" onSubmit={submit}>
      <h2>New Task</h2>
      <label>
        Title
        <input
          value={form.title}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, title: event.target.value }))
          }
          placeholder="Ship billing retries"
        />
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
          placeholder="Add dead-letter queue + retry monitor"
        />
      </label>
      <div className="row-3">
        <label>
          Status
          <select
            value={form.status}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                status: event.target.value as TaskPayload["status"]
              }))
            }
          >
            <option value="backlog">Backlog</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label>
          Priority (1-5)
          <input
            type="number"
            min={1}
            max={5}
            value={form.priority}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, priority: Number(event.target.value) }))
            }
          />
        </label>
        <label>
          Estimate (h)
          <input
            type="number"
            min={1}
            value={form.estimate_hours}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                estimate_hours: Number(event.target.value)
              }))
            }
          />
        </label>
      </div>
      <label>
        Due Date
        <input
          type="date"
          value={form.due_date}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, due_date: event.target.value }))
          }
        />
      </label>
      <button type="submit" disabled={saving || creating}>
        {saving || creating ? "Creating..." : "Add task"}
      </button>
    </form>
  );
}
