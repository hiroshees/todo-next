import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import TodoApp from "@/components/TodoApp";

type Todo = { id: string; text: string; done: boolean };

const seed = (todos: Todo[]) =>
  localStorage.setItem("todos", JSON.stringify(todos));
const stored = (): Todo[] => JSON.parse(localStorage.getItem("todos") ?? "[]");

const SAMPLE: Todo[] = [
  { id: "1", text: "牛乳を買う", done: false },
  { id: "2", text: "レポートを書く", done: true },
  { id: "3", text: "散歩する", done: false },
];

const setup = (todos?: Todo[]) => {
  if (todos) seed(todos);
  const user = userEvent.setup();
  render(<TodoApp />);
  return user;
};

const input = () => screen.getByPlaceholderText("やることを入力…");
const items = () => screen.getAllByRole("listitem");

describe("初期表示", () => {
  it("保存データが無いとき、空メッセージと「残り 0 件」を表示する", () => {
    setup();
    expect(screen.getByText("タスクがありません")).toBeInTheDocument();
    expect(screen.getByText("残り 0 件")).toBeInTheDocument();
    expect(screen.queryByText("完了を削除")).not.toBeInTheDocument();
  });

  it("localStorage のタスクを表示し、未完了件数を数える", () => {
    setup(SAMPLE);
    expect(items().map((li) => li.textContent)).toEqual([
      "牛乳を買う✕",
      "レポートを書く✕",
      "散歩する✕",
    ]);
    expect(screen.getByText("残り 2 件")).toBeInTheDocument();
  });

  it("完了済みタスクのチェックボックスはオンで取り消し線が付く", () => {
    setup(SAMPLE);
    const [milk, report] = screen.getAllByRole("checkbox", { name: "完了" });
    expect(milk).not.toBeChecked();
    expect(report).toBeChecked();
    expect(screen.getByText("レポートを書く")).toHaveClass("line-through");
    expect(screen.getByText("牛乳を買う")).not.toHaveClass("line-through");
  });

  it("localStorage の JSON が壊れていても空リストで表示される", () => {
    localStorage.setItem("todos", "{not json");
    setup();
    expect(screen.getByText("タスクがありません")).toBeInTheDocument();
  });
});

describe("タスクの追加", () => {
  it("入力して「追加」を押すと一覧と localStorage に追加され、入力欄が空になる", async () => {
    const user = setup();
    await user.type(input(), "洗濯する");
    await user.click(screen.getByRole("button", { name: "追加" }));

    expect(screen.getByText("洗濯する")).toBeInTheDocument();
    expect(screen.getByText("残り 1 件")).toBeInTheDocument();
    expect(input()).toHaveValue("");
    expect(stored()).toEqual([
      { id: expect.any(String), text: "洗濯する", done: false },
    ]);
  });

  it("Enter キーでも追加できる", async () => {
    const user = setup();
    await user.type(input(), "掃除する{Enter}");
    expect(screen.getByText("掃除する")).toBeInTheDocument();
  });

  it("前後の空白は取り除いて保存される", async () => {
    const user = setup();
    await user.type(input(), "   皿洗い   {Enter}");
    expect(stored()[0].text).toBe("皿洗い");
  });

  it.each(["", "   ", "　"])("空・空白のみ(%j)は追加されない", async (value) => {
    const user = setup();
    if (value) await user.type(input(), value);
    await user.click(screen.getByRole("button", { name: "追加" }));
    expect(screen.getByText("タスクがありません")).toBeInTheDocument();
    expect(localStorage.getItem("todos")).toBeNull();
  });

  it("追加したタスクは既存タスクの末尾に並び、IDは重複しない", async () => {
    const user = setup(SAMPLE);
    await user.type(input(), "A{Enter}");
    await user.type(input(), "B{Enter}");
    const todos = stored();
    expect(todos.map((t) => t.text)).toEqual([
      "牛乳を買う",
      "レポートを書く",
      "散歩する",
      "A",
      "B",
    ]);
    expect(new Set(todos.map((t) => t.id)).size).toBe(5);
  });
});

describe("完了の切り替え", () => {
  it("チェックすると完了になり、残り件数と保存内容が更新される", async () => {
    const user = setup(SAMPLE);
    await user.click(screen.getAllByRole("checkbox", { name: "完了" })[0]);

    expect(screen.getByText("牛乳を買う")).toHaveClass("line-through");
    expect(screen.getByText("残り 1 件")).toBeInTheDocument();
    expect(stored().find((t) => t.id === "1")?.done).toBe(true);
  });

  it("完了済みをもう一度クリックすると未完了に戻る", async () => {
    const user = setup(SAMPLE);
    await user.click(screen.getAllByRole("checkbox", { name: "完了" })[1]);

    expect(screen.getByText("レポートを書く")).not.toHaveClass("line-through");
    expect(screen.getByText("残り 3 件")).toBeInTheDocument();
    expect(stored().find((t) => t.id === "2")?.done).toBe(false);
  });
});

describe("タスクの削除", () => {
  it("✕ を押すと該当タスクだけが消える", async () => {
    const user = setup(SAMPLE);
    const row = screen.getByText("散歩する").closest("li")!;
    await user.click(within(row).getByRole("button", { name: "削除" }));

    expect(screen.queryByText("散歩する")).not.toBeInTheDocument();
    expect(stored().map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("「完了を削除」で完了済みのみ消え、ボタン自体も非表示になる", async () => {
    const user = setup(SAMPLE);
    await user.click(screen.getByRole("button", { name: "完了を削除" }));

    expect(screen.queryByText("レポートを書く")).not.toBeInTheDocument();
    expect(stored().map((t) => t.id)).toEqual(["1", "3"]);
    expect(
      screen.queryByRole("button", { name: "完了を削除" }),
    ).not.toBeInTheDocument();
  });

  it("完了済みが無いとき「完了を削除」は表示されない", () => {
    setup([SAMPLE[0]]);
    expect(
      screen.queryByRole("button", { name: "完了を削除" }),
    ).not.toBeInTheDocument();
  });
});

describe("フィルター", () => {
  it("「未完了」は未完了のみ表示する", async () => {
    const user = setup(SAMPLE);
    await user.click(screen.getByRole("button", { name: "未完了" }));
    expect(screen.getByText("牛乳を買う")).toBeInTheDocument();
    expect(screen.getByText("散歩する")).toBeInTheDocument();
    expect(screen.queryByText("レポートを書く")).not.toBeInTheDocument();
  });

  it("「完了」は完了済みのみ表示する", async () => {
    const user = setup(SAMPLE);
    await user.click(screen.getByRole("button", { name: "完了" }));
    expect(screen.getByText("レポートを書く")).toBeInTheDocument();
    expect(screen.queryByText("牛乳を買う")).not.toBeInTheDocument();
  });

  it("「すべて」で全件に戻る", async () => {
    const user = setup(SAMPLE);
    await user.click(screen.getByRole("button", { name: "完了" }));
    await user.click(screen.getByRole("button", { name: "すべて" }));
    expect(items()).toHaveLength(3);
  });

  it("該当タスクが無いフィルターでは空メッセージを表示する", async () => {
    const user = setup([SAMPLE[0]]);
    await user.click(screen.getByRole("button", { name: "完了" }));
    expect(screen.getByText("タスクがありません")).toBeInTheDocument();
  });

  it("フィルターしても「残り N 件」は全体の未完了数のまま", async () => {
    const user = setup(SAMPLE);
    await user.click(screen.getByRole("button", { name: "完了" }));
    expect(screen.getByText("残り 2 件")).toBeInTheDocument();
  });
});

describe("タスクの編集", () => {
  const startEdit = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.dblClick(screen.getByText("牛乳を買う"));
    return screen.getByDisplayValue("牛乳を買う");
  };

  it("ダブルクリックで現在の文言入りの入力欄が出てフォーカスされる", async () => {
    const user = setup(SAMPLE);
    const editor = await startEdit(user);
    expect(editor).toHaveFocus();
  });

  it("Enter で確定すると文言が更新され保存される(前後の空白は除去)", async () => {
    const user = setup(SAMPLE);
    const editor = await startEdit(user);
    await user.clear(editor);
    await user.type(editor, "  豆乳を買う  {Enter}");

    expect(screen.getByText("豆乳を買う")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("豆乳を買う")).not.toBeInTheDocument();
    expect(stored().find((t) => t.id === "1")?.text).toBe("豆乳を買う");
  });

  it("フォーカスが外れた(blur)ときも確定する", async () => {
    const user = setup(SAMPLE);
    const editor = await startEdit(user);
    await user.clear(editor);
    await user.type(editor, "卵を買う");
    await user.click(document.body);

    expect(screen.getByText("卵を買う")).toBeInTheDocument();
    expect(stored().find((t) => t.id === "1")?.text).toBe("卵を買う");
  });

  it("Escape で編集を取り消し、元の文言のまま保存も変わらない", async () => {
    const user = setup(SAMPLE);
    const editor = await startEdit(user);
    await user.clear(editor);
    await user.type(editor, "破棄される{Escape}");

    expect(screen.getByText("牛乳を買う")).toBeInTheDocument();
    expect(screen.queryByText("破棄される")).not.toBeInTheDocument();
    expect(localStorage.getItem("todos")).toBe(JSON.stringify(SAMPLE));
  });

  it("空文字(空白のみ含む)で確定するとそのタスクは削除される", async () => {
    const user = setup(SAMPLE);
    const editor = await startEdit(user);
    await user.clear(editor);
    await user.type(editor, "   {Enter}");

    expect(screen.queryByText("牛乳を買う")).not.toBeInTheDocument();
    expect(stored().map((t) => t.id)).toEqual(["2", "3"]);
  });

  it("編集しても完了状態は保たれる", async () => {
    const user = setup(SAMPLE);
    await user.dblClick(screen.getByText("レポートを書く"));
    const editor = screen.getByDisplayValue("レポートを書く");
    await user.clear(editor);
    await user.type(editor, "レポート提出{Enter}");

    expect(stored().find((t) => t.id === "2")).toEqual({
      id: "2",
      text: "レポート提出",
      done: true,
    });
  });
});

describe("タブ間同期", () => {
  it("storage イベントで他タブの変更が反映される", () => {
    setup();
    expect(screen.getByText("タスクがありません")).toBeInTheDocument();

    act(() => {
      seed([{ id: "x", text: "別タブで追加", done: false }]);
      window.dispatchEvent(new StorageEvent("storage", { key: "todos" }));
    });

    expect(screen.getByText("別タブで追加")).toBeInTheDocument();
    expect(screen.getByText("残り 1 件")).toBeInTheDocument();
  });

  it("2つのインスタンスが同じストアを共有し、一方の変更が他方に反映される", async () => {
    const user = userEvent.setup();
    render(
      <>
        <div data-testid="a">
          <TodoApp />
        </div>
        <div data-testid="b">
          <TodoApp />
        </div>
      </>,
    );
    const a = within(screen.getByTestId("a"));
    const b = within(screen.getByTestId("b"));

    await user.type(a.getByPlaceholderText("やることを入力…"), "共有{Enter}");

    expect(a.getByText("共有")).toBeInTheDocument();
    expect(b.getByText("共有")).toBeInTheDocument();
  });
});
