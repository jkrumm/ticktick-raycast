import { Action, ActionPanel, Form, showHUD, showToast, Toast, popToRoot } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { apiBase, authHeader, client, prefs } from "./api/client";
import { VikunjaProject } from "./api/types";
import { priorityLabel } from "./lib/format";

export default function QuickAdd() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading } = useFetch<VikunjaProject[]>(`${apiBase()}/projects?per_page=500`, {
    headers: authHeader(),
    keepPreviousData: true,
  });

  const projects = data ?? [];
  const defaultProjectId = prefs().defaultProjectId ?? (projects[0] ? String(projects[0].id) : "");

  async function handleSubmit(values: { title: string; project_id: string; priority: string }) {
    const title = values.title.trim();
    if (!title) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    const projectId = parseInt(values.project_id || defaultProjectId);
    if (!projectId) {
      await showToast({ style: Toast.Style.Failure, title: "Select a project" });
      return;
    }

    setIsSubmitting(true);
    try {
      await client.createTask(projectId, { title, priority: parseInt(values.priority) });
      await showHUD(`✓ ${title}`);
      await popToRoot();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(e) });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle="Quick Add Task"
      isLoading={isSubmitting || isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="" placeholder="Task title…" autoFocus />

      <Form.Dropdown id="project_id" title="Project" defaultValue={defaultProjectId}>
        {projects.map((p: VikunjaProject) => (
          <Form.Dropdown.Item key={p.id} value={String(p.id)} title={p.title} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="priority" title="Priority" defaultValue="0">
        {([0, 1, 2, 3, 4, 5] as const).map((p) => (
          <Form.Dropdown.Item key={p} value={String(p)} title={priorityLabel(p)} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
