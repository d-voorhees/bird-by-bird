import type { ApolloCache } from "@apollo/client";

import {
  CURRENT_BIRD_QUERY,
  FLOCK_QUERY,
  HISTORY_QUERY,
} from "@/lib/graphql/operations";
import type { Task } from "@/lib/types";

type FlockData = { flock: Task[] };
type CurrentBirdData = { currentBird: Task | null };
type HistoryData = { history: Task[] };

function removeFromFlock(cache: ApolloCache<unknown>, taskId: string) {
  cache.updateQuery<FlockData>({ query: FLOCK_QUERY }, (data) => {
    if (!data) return data;
    return { flock: data.flock.filter((task) => task.id !== taskId) };
  });
}

function setCurrentBirdFromFlockIfMatching(cache: ApolloCache<unknown>, taskId: string) {
  cache.updateQuery<CurrentBirdData>({ query: CURRENT_BIRD_QUERY }, (data) => {
    if (!data) return data;
    if (data.currentBird?.id !== taskId) return data;
    try {
      const next = cache.readQuery<FlockData>({ query: FLOCK_QUERY });
      return { currentBird: next?.flock?.[0] ?? null };
    } catch {
      return { currentBird: null };
    }
  });
}

function prependToHistory(
  cache: ApolloCache<unknown>,
  task: Task,
  limit: number,
) {
  cache.updateQuery<HistoryData>(
    { query: HISTORY_QUERY, variables: { limit, offset: 0 } },
    (data) => {
      if (!data) return data;
      return {
        history: [task, ...data.history.filter((item) => item.id !== task.id)].slice(0, limit),
      };
    },
  );
}

export function markTaskDoneInCache(
  cache: ApolloCache<unknown>,
  task: Task,
  completedAt: string,
  historyLimits: number[],
) {
  const completedTask: Task = {
    ...task,
    status: "DONE",
    completedAt,
  };
  removeFromFlock(cache, task.id);
  setCurrentBirdFromFlockIfMatching(cache, task.id);
  for (const limit of historyLimits) {
    prependToHistory(cache, completedTask, limit);
  }
}

export function uncompleteTaskInCache(
  cache: ApolloCache<unknown>,
  task: Task,
  position: number,
  historyLimit: number,
) {
  const restoredTask: Task = {
    ...task,
    status: "ACTIVE",
    completedAt: null,
    position,
  };

  cache.updateQuery<HistoryData>(
    { query: HISTORY_QUERY, variables: { limit: historyLimit, offset: 0 } },
    (data) => {
      if (!data) return data;
      return { history: data.history.filter((item) => item.id !== task.id) };
    },
  );

  cache.updateQuery<FlockData>({ query: FLOCK_QUERY }, (data) => {
    if (!data) return data;
    if (data.flock.some((item) => item.id === task.id)) return data;
    return { flock: [...data.flock, restoredTask] };
  });

  cache.updateQuery<CurrentBirdData>({ query: CURRENT_BIRD_QUERY }, (data) => {
    if (!data) return data;
    if (data.currentBird) return data;
    return { currentBird: restoredTask };
  });
}

export function skipTaskInCache(cache: ApolloCache<unknown>, taskId: string) {
  cache.updateQuery<FlockData>({ query: FLOCK_QUERY }, (data) => {
    if (!data) return data;
    const currentIndex = data.flock.findIndex((task) => task.id === taskId);
    if (currentIndex < 0) return data;
    const movedTask = data.flock[currentIndex];
    return {
      flock: [
        ...data.flock.slice(0, currentIndex),
        ...data.flock.slice(currentIndex + 1),
        movedTask,
      ],
    };
  });
  setCurrentBirdFromFlockIfMatching(cache, taskId);
}

export function addTaskInCache(
  cache: ApolloCache<unknown>,
  task: Task,
  doNext: boolean,
) {
  cache.updateQuery<FlockData>({ query: FLOCK_QUERY }, (data) => {
    if (!data) return data;
    const withoutDuplicate = data.flock.filter((item) => item.id !== task.id);
    return {
      flock: doNext ? [task, ...withoutDuplicate] : [...withoutDuplicate, task],
    };
  });

  cache.updateQuery<CurrentBirdData>({ query: CURRENT_BIRD_QUERY }, (data) => {
    if (!data) return data;
    if (doNext || !data.currentBird) {
      return { currentBird: task };
    }
    return data;
  });
}
