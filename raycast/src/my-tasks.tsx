import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useState } from "react";
import { apiBase, authHeader, client } from "./api/client";
import { VikunjaProject, VikunjaTask } from "./api/types";
import {
  BUCKET_ORDER,
  BUCKET_TITLE,
  DueBucket,
  dueBucket,
  dueDateColor,
  formatDue,
  isOverdue,
  isDueToday,
  priorityIcon,
  priorityLabel,
  daysFromNow,
  today,
} from "./lib/format";
import CreateTask from "./create-task";

// ─── Filter ───────────────────────────────────────────────────────────────────

type Filter = "all" | "today" | "overdue" | "week" | "urgent" | "favorites";

function applyFilter(tasks: VikunjaTask[], filter: Filter): VikunjaTask[] {
  switch (filter) {
    case "today":
      return tasks.filter((t) => isDueToday(t.due_date) || isOverdue(t.due_date));
    case "overdue":
      return tasks.filter((t) => isOverdue(t.due_date));
    case "week": {
      const end = daysFromNow(7);
      return tasks.filter((t) => !!t.due_date && t.due_date.slice(0, 10) >= today() && t.due_date.slice(0, 10) <= end);
    }
    case "urgent":
      return tasks.filter((t) => t.priority >= 4);
    case "favorites":
      return tasks.filter((t) => t.is_favorite);
    default:
      return tasks;
  }
}

// ─── Task Detail ──────────────────────────────────────────────────────────────

function TaskDetail({ task, projectName, onUpdate }: { task: VikunjaTask; projectName: string; onUpdate: () => void }) {
  const due = formatDue(task.due_date);
  const markdown = [`# ${task.title}`, task.description?.trim() ? `\n\n${task.description.trim()}` : ""].join("");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {projectName && <Detail.Metadata.Label title="Project" text={projectName} icon={Icon.List} />}
          <Detail.Metadata.Label title="Priority" text={priorityLabel(task.priority)} icon={priorityIcon(task.priority)} />
          {due && (
            <Detail.Metadata.Label
              title="Due"
              text={due}
              icon={{ source: Icon.Calendar, tintColor: dueDateColor(task.due_date) }}
            />
          )}
          {(task.labels ?? []).length > 0 && (
            <Detail.Metadata.TagList title="Labels">
              {(task.labels ?? []).map((l) => (
                <Detail.Metadata.TagList.Item
                  key={l.id}
                  text={l.title}
                  color={l.hex_color ? `#${l.hex_color.replace("#", "")}` : undefined}
                />
              ))}
            </Detail.Metadata.TagList>
          )}
          {(task.assignees ?? []).length > 0 && (
            <Detail.Metadata.Label
              title="Assignees"
              text={(task.assignees ?? []).map((a) => a.name || a.username).join(", ")}
              icon={Icon.Person}
            />
          )}
          {task.percent_done > 0 && (
            <Detail.Metadata.Label title="Progress" text={`${Math.round(task.percent_done * 100)}%`} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="ID" text={task.identifier} />
          <Detail.Metadata.Link
            title="Open in Vikunja"
            target={`https://vikunja.jkrumm.com/tasks/${task.id}`}
            text="vikunja.jkrumm.com"
          />
        </Detail.Metadata>
      }
      actions={<TaskActions task={task} projectName={projectName} onUpdate={onUpdate} showDetail={false} />}
    />
  );
}

// ─── Task Actions ─────────────────────────────────────────────────────────────

function TaskActions({
  task,
  projectName,
  onUpdate,
  showDetail = true,
}: {
  task: VikunjaTask;
  projectName: string;
  onUpdate: () => void;
  showDetail?: boolean;
}) {
  const { push } = useNavigation();

  async function markDone() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Marking done…" });
    try {
      await client.updateTask(task.id, { done: true });
      toast.style = Toast.Style.Success;
      toast.title = "Done";
      toast.message = task.title;
      onUpdate();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = String(e);
    }
  }

  async function toggleFavorite() {
    try {
      await client.updateTask(task.id, { is_favorite: !task.is_favorite });
      onUpdate();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(e) });
    }
  }

  async function deleteTask() {
    const confirmed = await confirmAlert({
      title: "Delete Task?",
      message: task.title,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting…" });
    try {
      await client.deleteTask(task.id);
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
      onUpdate();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = String(e);
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {showDetail && (
          <Action
            title="Show Detail"
            icon={Icon.Eye}
            onAction={() => push(<TaskDetail task={task} projectName={projectName} onUpdate={onUpdate} />)}
          />
        )}
        <Action
          title="Mark Done"
          icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={markDone}
        />
        <Action
          title="Edit Task"
          icon={Icon.Pencil}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() => push(<CreateTask task={task} onDone={onUpdate} />)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={task.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
          icon={task.is_favorite ? Icon.StarDisabled : Icon.Star}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={toggleFavorite}
        />
        <Action.OpenInBrowser
          title="Open in Vikunja"
          url={`https://vikunja.jkrumm.com/tasks/${task.id}`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
        />
        <Action.CopyToClipboard
          title="Copy Link"
          content={`https://vikunja.jkrumm.com/tasks/${task.id}`}
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="New Task"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => push(<CreateTask onDone={onUpdate} />)}
        />
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onUpdate}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Task"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={deleteTask}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

// ─── Task Item ────────────────────────────────────────────────────────────────

function TaskItem({ task, projectName, onUpdate }: { task: VikunjaTask; projectName: string; onUpdate: () => void }) {
  const { push } = useNavigation();
  const due = formatDue(task.due_date);
  const dueColor = dueDateColor(task.due_date);

  const accessories: List.Item.Accessory[] = [];

  (task.labels ?? []).slice(0, 2).forEach((l) => {
    accessories.push({
      tag: {
        value: l.title,
        color: l.hex_color ? `#${l.hex_color.replace("#", "")}` : Color.SecondaryText,
      },
    });
  });

  if (task.comment_count > 0) {
    accessories.push({
      icon: { source: Icon.Bubble, tintColor: Color.SecondaryText },
      text: { value: String(task.comment_count), color: Color.SecondaryText },
    });
  }

  if (due) {
    accessories.push({
      text: { value: due, color: dueColor },
      icon:
        isOverdue(task.due_date) || isDueToday(task.due_date)
          ? { source: Icon.Clock, tintColor: dueColor }
          : undefined,
    });
  }

  if (task.is_favorite) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  }

  return (
    <List.Item
      icon={priorityIcon(task.priority)}
      title={task.title}
      subtitle={projectName || undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Show Detail"
            icon={Icon.Eye}
            onAction={() => push(<TaskDetail task={task} projectName={projectName} onUpdate={onUpdate} />)}
          />
          <TaskActions task={task} projectName={projectName} onUpdate={onUpdate} showDetail={false} />
        </ActionPanel>
      }
    />
  );
}

// ─── Main Command ─────────────────────────────────────────────────────────────

export default function MyTasks() {
  const { push } = useNavigation();
  const [filter, setFilter] = useState<Filter>("all");

  const { data: allTasks, isLoading: tasksLoading, revalidate } = useFetch<VikunjaTask[]>(
    `${apiBase()}/tasks?filter=${encodeURIComponent("done = false")}&sort_by=due_date&order_by=asc&per_page=100&expand=labels,assignees,comment_count`,
    { headers: authHeader(), keepPreviousData: true }
  );

  const { data: projectData, isLoading: projectsLoading } = useFetch<VikunjaProject[]>(
    `${apiBase()}/projects?per_page=500`,
    { headers: authHeader(), keepPreviousData: true }
  );

  const projectMap = useMemo(
    () => Object.fromEntries((projectData ?? []).map((p) => [p.id, p.title])),
    [projectData]
  );

  const tasks = useMemo(() => applyFilter(allTasks ?? [], filter), [allTasks, filter]);

  const grouped = useMemo<Map<DueBucket, VikunjaTask[]> | null>(() => {
    if (filter !== "all") return null;
    const map = new Map<DueBucket, VikunjaTask[]>(BUCKET_ORDER.map((b) => [b, []]));
    for (const task of tasks) map.get(dueBucket(task.due_date))!.push(task);
    return map;
  }, [tasks, filter]);

  const isLoading = tasksLoading || projectsLoading;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter tasks…"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={(v) => setFilter(v as Filter)}>
          <List.Dropdown.Section title="View">
            <List.Dropdown.Item value="all" title="All Open" icon={Icon.Circle} />
            <List.Dropdown.Item value="favorites" title="Favorites" icon={Icon.Star} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Due">
            <List.Dropdown.Item value="today" title="Due Today" icon={Icon.Clock} />
            <List.Dropdown.Item value="overdue" title="Overdue" icon={Icon.ExclamationMark} />
            <List.Dropdown.Item value="week" title="This Week" icon={Icon.Calendar} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Priority">
            <List.Dropdown.Item value="urgent" title="Urgent" icon={Icon.ArrowUp} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {grouped
        ? BUCKET_ORDER.map((bucket) => {
            const bucketTasks = grouped.get(bucket) ?? [];
            if (bucketTasks.length === 0) return null;
            return (
              <List.Section key={bucket} title={BUCKET_TITLE[bucket]} subtitle={`${bucketTasks.length}`}>
                {bucketTasks.map((task) => (
                  <TaskItem key={task.id} task={task} projectName={projectMap[task.project_id] ?? ""} onUpdate={revalidate} />
                ))}
              </List.Section>
            );
          })
        : tasks.map((task) => (
            <TaskItem key={task.id} task={task} projectName={projectMap[task.project_id] ?? ""} onUpdate={revalidate} />
          ))}

      {!isLoading && tasks.length === 0 && (
        <List.EmptyView
          icon={Icon.Checkmark}
          title="All clear"
          description="Press ⌘N to add a task."
          actions={
            <ActionPanel>
              <Action title="New Task" icon={Icon.Plus} onAction={() => push(<CreateTask onDone={revalidate} />)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
