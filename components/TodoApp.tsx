"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Todo = { id: string; text: string; done: boolean };
type Filter = "all" | "active" | "done";

const KEY = "todos";
const listeners = new Set<() => void>();
let cache: { raw: string | null; todos: Todo[] } = { raw: null, todos: [] };
const EMPTY: Todo[] = [];

function getSnapshot(): Todo[] {
  const raw = localStorage.getItem(KEY);
  if (raw !== cache.raw) {
    let todos: Todo[] = [];
    try {
      todos = raw ? (JSON.parse(raw) as Todo[]) : [];
    } catch {}
    cache = { raw, todos };
  }
  return cache.todos;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function save(todos: Todo[]) {
  localStorage.setItem(KEY, JSON.stringify(todos));
  listeners.forEach((l) => l());
}

export default function TodoApp() {
  const todos = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    save([...todos, { id: crypto.randomUUID(), text: t, done: false }]);
    setText("");
  };

  const toggle = (id: string) =>
    save(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id: string) => save(todos.filter((t) => t.id !== id));
  const commitEdit = () => {
    const t = draft.trim();
    if (editing) {
      if (t) save(todos.map((x) => (x.id === editing ? { ...x, text: t } : x)));
      else remove(editing);
    }
    setEditing(null);
  };

  const remaining = todos.filter((t) => !t.done).length;
  const visible = todos.filter((t) =>
    filter === "all" ? true : filter === "active" ? !t.done : t.done,
  );
  const filters: [Filter, string][] = [
    ["all", "すべて"],
    ["active", "未完了"],
    ["done", "完了"],
  ];

  return (
    <main className="mx-auto my-8 w-full max-w-lg rounded-2xl bg-white p-5 shadow-sm dark:bg-neutral-900">
      <h1 className="mb-4 text-2xl font-bold">TODO</h1>

      <form onSubmit={add} className="mb-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="やることを入力…"
          className="flex-1 rounded-lg border border-neutral-200 bg-transparent px-4 py-3 outline-none focus:border-blue-500 dark:border-neutral-700"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-500 px-5 py-3 text-white hover:bg-blue-600"
        >
          追加
        </button>
      </form>

      <div className="mb-3 flex gap-2">
        {filters.map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1.5 ${
              filter === f
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-neutral-200 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-neutral-200 border-b border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {visible.length === 0 && (
          <li className="px-3 py-6 text-center text-neutral-500">
            タスクがありません
          </li>
        )}
        {visible.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-3 py-4">
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => toggle(t.id)}
              className="h-4 w-4"
              aria-label="完了"
            />
            {editing === t.id ? (
              <input
                ref={editRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") setEditing(null);
                }}
                className="flex-1 rounded border border-blue-500 bg-transparent px-2 py-1 outline-none"
              />
            ) : (
              <span
                onDoubleClick={() => {
                  setEditing(t.id);
                  setDraft(t.text);
                }}
                className={`flex-1 break-all ${t.done ? "text-neutral-400 line-through" : ""}`}
              >
                {t.text}
              </span>
            )}
            <button
              onClick={() => remove(t.id)}
              className="text-neutral-400 hover:text-red-500"
              aria-label="削除"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between px-1 text-sm text-neutral-400">
        <span>残り {remaining} 件</span>
        {todos.some((t) => t.done) && (
          <button
            onClick={() => save(todos.filter((t) => !t.done))}
            className="underline hover:text-red-500"
          >
            完了を削除
          </button>
        )}
      </div>
    </main>
  );
}
