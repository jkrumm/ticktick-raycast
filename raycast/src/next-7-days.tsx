import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useMemo, useState } from "react";
import { authHeader, client, prefs } from "./api/client";
import { TickTickProject, TickTickTask } from "./api/types";
import { useFetch } from "@raycast/utils";
import {
  dueDateColor,
  formatDue,
  isOverdue,
  isDueToday,
  priorityIcon,
  today,
  daysFromNow,
} from "./lib/format";
import CreateTask from "./create-task";

type DayBucket = string; // "YYYY-MM-DD"

function dayLabel(dateStr: string): string {
  const t = today();
  if (dateStr === t) return "Today";
  if (dateStr === daysFromNow(1)) return "Tomorrow";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function TaskItem({
  task,
  projectName,
  onUpdate,
}: {
  task: TickTickTask;
  projectName: string;
  onUpdate: () => void;
}) {
  const { push } = useNavigation();
  const due = formatDue(task.dueDate);
  const dueColor = dueDateColor(task.dueDate);

  const accessories: List.Item.Accessory[] = [];
  if ((task.tags ?? []).length > 0) {
    accessories.push({
      tag: { value: task.tags![0], color: Color.SecondaryText },
    });
  }
  if (due) {
    accessories.push({
      text: { value: due, color: dueColor },
      icon:
        isOverdue(task.dueDate) || isDueToday(task.dueDate)
          ? { source: Icon.Clock, tintColor: dueColor }
          : undefined,
    });
  }

  async function markComplete() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Completing…",
    });
    try {
      await client.completeTask(task.projectId, task.id);
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

  return (
    <List.Item
      icon={priorityIcon(task.priority)}
      title={task.title}
      subtitle={projectName || undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action
            title="Mark Complete"
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={markComplete}
          />
          <Action
            title="Edit Task"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => push(<CreateTask task={task} onDone={onUpdate} />)}
          />
          <Action.OpenInBrowser
            title="Open in Ticktick"
            url={`https://ticktick.com/webapp/#q/today/tasks/${task.id}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
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
        </ActionPanel>
      }
    />
  );
}

export default function Next7Days() {
  const { push } = useNavigation();
  const [projectTasks, setProjectTasks] = useState<TickTickTask[]>([]);
  const [isFetchingTasks, setIsFetchingTasks] = useState(false);

  const base = prefs().baseUrl.replace(/\/$/, "");
  const weekEnd = daysFromNow(7);

  const {
    data: projectData,
    isLoading: projectsLoading,
    revalidate,
  } = useFetch<{ data: TickTickProject[] }>(`${base}/api/ticktick/projects`, {
    headers: authHeader(),
    keepPreviousData: true,
    onData: (raw) => {
      const projects = raw?.data ?? [];
      if (projects.length === 0) return;
      setIsFetchingTasks(true);
      Promise.all(projects.map((p) => client.getProjectData(p.id)))
        .then((results) => {
          const t = today();
          const tasks = results
            .flatMap((r) => r.tasks)
            .filter((task) => {
              if (task.status !== 0 || !task.dueDate) return false;
              const d = task.dueDate.slice(0, 10);
              return d >= t && d <= weekEnd;
            });
          tasks.sort((a, b) =>
            (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
          );
          setProjectTasks(tasks);
        })
        .catch(() => {
          /* silent */
        })
        .finally(() => setIsFetchingTasks(false));
    },
  });

  const projects = projectData?.data ?? [];
  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  // Group by day
  const grouped = useMemo<Map<DayBucket, TickTickTask[]>>(() => {
    const map = new Map<DayBucket, TickTickTask[]>();
    for (const task of projectTasks) {
      const day = task.dueDate!.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(task);
    }
    return map;
  }, [projectTasks]);

  const isLoading = projectsLoading || isFetchingTasks;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tasks…">
      {grouped.size === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="Nothing due this week"
          description="Press ⌘N to add a task."
          actions={
            <ActionPanel>
              <Action
                title="New Task"
                icon={Icon.Plus}
                onAction={() => push(<CreateTask onDone={revalidate} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        Array.from(grouped.entries()).map(([day, tasks]) => (
          <List.Section
            key={day}
            title={dayLabel(day)}
            subtitle={`${tasks.length}`}
          >
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                projectName={projectMap[task.projectId] ?? ""}
                onUpdate={revalidate}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
