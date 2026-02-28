import { Color, Icon, MenuBarExtra, open, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { apiBase, authHeader, client } from "./api/client";
import { VikunjaTask } from "./api/types";
import { formatDue, isOverdue, isDueToday, priorityIcon, daysFromNow } from "./lib/format";

const VIKUNJA_URL = "https://vikunja.jkrumm.com";

function taskMenuIcon(task: VikunjaTask): { source: Icon; tintColor: Color } {
  if (isOverdue(task.due_date)) return { source: Icon.ExclamationMark, tintColor: Color.Red };
  if (isDueToday(task.due_date)) return { source: Icon.Clock, tintColor: Color.Orange };
  return priorityIcon(task.priority);
}

export default function MenuBar() {
  const { data, isLoading, revalidate } = useFetch<VikunjaTask[]>(
    `${apiBase()}/tasks?filter=${encodeURIComponent("done = false")}&sort_by=due_date&order_by=asc&per_page=50`,
    { headers: authHeader(), keepPreviousData: true }
  );

  const tasks = data ?? [];
  const overdue = tasks.filter((t) => isOverdue(t.due_date));
  const dueToday = tasks.filter((t) => isDueToday(t.due_date));
  const end = daysFromNow(3);
  const upcoming = tasks.filter((t) => {
    if (!t.due_date || isOverdue(t.due_date) || isDueToday(t.due_date)) return false;
    return t.due_date.slice(0, 10) <= end;
  });

  const urgentCount = overdue.length + dueToday.length;
  const menuIcon = urgentCount > 0
    ? { source: Icon.ExclamationMark, tintColor: Color.Red }
    : { source: Icon.CheckCircle, tintColor: Color.Green };

  async function markDone(task: VikunjaTask) {
    try {
      await client.updateTask(task.id, { done: true });
      revalidate();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(e) });
    }
  }

  function TaskItem({ task }: { task: VikunjaTask }) {
    const due = formatDue(task.due_date);
    return (
      <MenuBarExtra.Item
        icon={taskMenuIcon(task)}
        title={due ? `${task.title}  ${due}` : task.title}
        onAction={() => open(`${VIKUNJA_URL}/tasks/${task.id}`)}
        alternate={
          <MenuBarExtra.Item
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            title={`Done: ${task.title}`}
            onAction={() => markDone(task)}
          />
        }
      />
    );
  }

  return (
    <MenuBarExtra
      icon={menuIcon}
      title={urgentCount > 0 ? String(urgentCount) : undefined}
      tooltip="Vikunja Tasks"
      isLoading={isLoading}
    >
      {overdue.length > 0 && (
        <MenuBarExtra.Section title={`Overdue (${overdue.length})`}>
          {overdue.map((t) => <TaskItem key={t.id} task={t} />)}
        </MenuBarExtra.Section>
      )}

      {dueToday.length > 0 && (
        <MenuBarExtra.Section title="Today">
          {dueToday.map((t) => <TaskItem key={t.id} task={t} />)}
        </MenuBarExtra.Section>
      )}

      {upcoming.length > 0 && (
        <MenuBarExtra.Section title="Coming Up">
          {upcoming.map((t) => <TaskItem key={t.id} task={t} />)}
        </MenuBarExtra.Section>
      )}

      {overdue.length === 0 && dueToday.length === 0 && upcoming.length === 0 && !isLoading && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
            title="All clear — nothing urgent"
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Vikunja"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open(VIKUNJA_URL)}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
