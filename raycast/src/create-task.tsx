import { Action, ActionPanel, Form, showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { apiBase, authHeader, client, prefs } from "./api/client";
import { VikunjaLabel, VikunjaProject, VikunjaTask } from "./api/types";
import { priorityLabel } from "./lib/format";

interface Props {
  task?: VikunjaTask;
  onDone?: () => void;
}

export default function CreateTask({ task, onDone }: Props) {
  const { pop } = useNavigation();
  const isEditing = !!task;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: projects } = useFetch<VikunjaProject[]>(`${apiBase()}/projects?per_page=500`, {
    headers: authHeader(),
    keepPreviousData: true,
  });

  const { data: labels } = useFetch<VikunjaLabel[]>(`${apiBase()}/labels?per_page=500`, {
    headers: authHeader(),
    keepPreviousData: true,
  });

  const projectList = projects ?? [];
  const labelList = labels ?? [];

  const defaultProjectId = (() => {
    if (task) return String(task.project_id);
    const pref = prefs().defaultProjectId;
    if (pref) return pref;
    return projectList[0] ? String(projectList[0].id) : "";
  })();

  async function handleSubmit(values: {
    title: string;
    description: string;
    project_id: string;
    priority: string;
    due_date: Date | null;
    labels: string[];
    is_favorite: boolean;
  }) {
    if (!values.title.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    const projectId = parseInt(values.project_id || defaultProjectId);
    if (!projectId) {
      await showToast({ style: Toast.Style.Failure, title: "Select a project" });
      return;
    }

    setIsSubmitting(true);

    const payload: Partial<VikunjaTask> = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      priority: parseInt(values.priority),
      due_date: values.due_date ? values.due_date.toISOString() : null,
      is_favorite: values.is_favorite,
    };

    try {
      let savedTask: VikunjaTask;
      if (isEditing) {
        savedTask = await client.updateTask(task.id, payload);
        await client.setLabels(task.id, values.labels.map(Number));
      } else {
        savedTask = await client.createTask(projectId, payload);
        if (values.labels.length > 0) {
          await client.setLabels(savedTask.id, values.labels.map(Number));
        }
      }
      await showHUD(isEditing ? `Updated: ${savedTask.title}` : `Created: ${savedTask.title}`);
      onDone?.();
      pop();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(e) });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Task" : "Create Task"}
      isLoading={isSubmitting || projectList.length === 0}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Save Changes" : "Create Task"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="What needs to be done?"
        defaultValue={task?.title ?? ""}
        autoFocus
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Add details, links, or context… (Markdown supported)"
        defaultValue={task?.description ?? ""}
        enableMarkdown
      />

      <Form.Separator />

      <Form.Dropdown id="project_id" title="Project" defaultValue={defaultProjectId}>
        {projectList.map((p) => (
          <Form.Dropdown.Item key={p.id} value={String(p.id)} title={p.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="priority" title="Priority" defaultValue={String(task?.priority ?? 0)}>
        {([0, 1, 2, 3, 4, 5] as const).map((p) => (
          <Form.Dropdown.Item key={p} value={String(p)} title={priorityLabel(p)} />
        ))}
      </Form.Dropdown>

      <Form.DatePicker
        id="due_date"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={task?.due_date ? new Date(task.due_date) : null}
      />

      {labelList.length > 0 && (
        <Form.TagPicker id="labels" title="Labels" defaultValue={task?.labels.map((l) => String(l.id)) ?? []}>
          {labelList.map((l) => (
            <Form.TagPicker.Item key={l.id} value={String(l.id)} title={l.title} />
          ))}
        </Form.TagPicker>
      )}

      <Form.Checkbox id="is_favorite" label="Mark as favorite" defaultValue={task?.is_favorite ?? false} />
    </Form>
  );
}
