// DOM取得
const tabs = document.getElementById("tabs");
const editor = document.getElementById("editor");
const previewArea = document.getElementById("preview-area");
const outputArea = document.getElementById("output-area");
const htmlPreview = document.getElementById("html-preview");

const runBtn = document.getElementById("run-btn");
const saveBtn = document.getElementById("save-btn");
const loadBtn = document.getElementById("load-btn");
const fileInput = document.getElementById("file-input");
const themeBtn = document.getElementById("theme-btn");
const toggleSidebarBtn = document.getElementById("toggle-sidebar-btn");
const fullscreenBtn = document.getElementById("fullscreen-btn");
const openNewTabBtn = document.getElementById("open-newtab-btn");

const sidebar = document.querySelector(".sidebar");
const resizer = document.getElementById("sidebar-resizer");

// ファイル管理
let files = [];
let activeFile = null;

// デフォルトコード
function getDefaultCode(lang) {
  return {
    html: "<!DOCTYPE html>\n<html>\n<head>\n<meta charset='UTF-8'>\n<title>プレビュー</title>\n</head>\n<body>\n<h1>新規 HTML</h1>\n</body>\n</html>",
    css: "body {\n  background: #f0f0f0;\n}",
    js: "console.log('Hello JS');",
    python: "print('Hello Python')"
  }[lang];
}

// タブ作成
function createTab(lang) {
  const id = Date.now() + Math.random();
  const name = `${lang.toUpperCase()}-${Math.floor(id)}`;

  const file = {
    id,
    name,
    lang,
    code: getDefaultCode(lang)
  };

  files.push(file);
  renderTabs();
  switchTab(id);
}

// タブ描画（ドラッグ並び替え＋アニメーション）
function renderTabs() {
  tabs.innerHTML = "";

  files.forEach((file, index) => {
    const tab = document.createElement("div");
    tab.className = "tab" + (file.id === activeFile ? " active" : "");
    tab.draggable = true;
    tab.dataset.index = index;

    tab.innerHTML = `
      ${file.name}
      <span class="tab-close" onclick="closeTab(${file.id})">×</span>
    `;

    tab.onclick = () => switchTab(file.id);

    tab.addEventListener("dragstart", (e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", index);
      tab.classList.add("dragging");
    });

    tab.addEventListener("dragend", () => {
      tab.classList.remove("dragging");
      document.querySelectorAll(".placeholder").forEach(p => p.classList.remove("placeholder"));
    });

    tab.addEventListener("dragover", (e) => {
      e.preventDefault();
      const fromIndex = Number(e.dataTransfer.getData("text/plain"));
      const toIndex = Number(tab.dataset.index);
      if (fromIndex === toIndex) return;
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("placeholder"));
      tab.classList.add("placeholder");
    });

    tab.addEventListener("drop", (e) => {
      e.preventDefault();
      const fromIndex = Number(e.dataTransfer.getData("text/plain"));
      const toIndex = Number(tab.dataset.index);
      if (fromIndex === toIndex) return;

      const moved = files.splice(fromIndex, 1)[0];
      files.splice(toIndex, 0, moved);
      renderTabs();
    });

    tabs.appendChild(tab);
  });
}

// タブ閉じる
function closeTab(id) {
  files = files.filter(f => f.id !== id);
  if (activeFile === id) {
    activeFile = files.length ? files[0].id : null;
  }
  renderTabs();
  if (activeFile) switchTab(activeFile);
  else {
    editor.value = "";
    previewArea.style.display = "none";
    outputArea.style.display = "none";
  }
}

// タブ切り替え＋自動プレビュー更新
function switchTab(id) {
  activeFile = id;
  const file = files.find(f => f.id === id);
  if (!file) return;

  editor.value = file.code;

  if (file.lang === "html") {
    previewArea.style.display = "flex";
    outputArea.style.display = "none";
  } else {
    previewArea.style.display = "none";
    outputArea.style.display = "block";
  }

  renderTabs();

  if (file.lang === "html") {
    runHTML(file.code);
  } else if (file.lang === "css") {
    runCSS(file.code);
  } else if (file.lang === "js") {
    runJS(file.code);
  } else if (file.lang === "python") {
    runPython(file.code);
  }
}

// エディター入力でファイル更新
editor.addEventListener("input", () => {
  const file = files.find(f => f.id === activeFile);
  if (file) file.code = editor.value;
});

// 実行系
function runHTML(code) {
  const doc = htmlPreview.contentDocument;
  doc.open();
  doc.write(code);
  doc.close();
}

function runJS(code) {
  try {
    new Function(code)();
    outputArea.textContent = "JavaScript を実行しました。結果はコンソールを確認してください。";
  } catch (e) {
    outputArea.textContent = "エラー:\n" + e;
  }
}

function runCSS(code) {
  let styleTag = document.getElementById("live-style");
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "live-style";
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = code;
  outputArea.textContent = "CSS を適用しました。";
}

let pyodideReady = loadPyodide();

async function runPython(code) {
  outputArea.textContent = "Python 実行中...";
  try {
    const pyodide = await pyodideReady;
    const result = await pyodide.runPythonAsync(code);
    outputArea.textContent = String(result ?? "完了 (戻り値なし)");
  } catch (e) {
    outputArea.textContent = "エラー:\n" + e;
  }
}

// 実行ボタン
runBtn.addEventListener("click", () => {
  const file = files.find(f => f.id === activeFile);
  if (!file) return;
  const code = file.code;

  if (file.lang === "html") runHTML(code);
  else if (file.lang === "css") runCSS(code);
  else if (file.lang === "js") runJS(code);
  else if (file.lang === "python") runPython(code);
});

// 保存
saveBtn.addEventListener("click", () => {
  const file = files.find(f => f.id === activeFile);
  if (!file) return;

  const ext = file.lang === "python" ? "py" : file.lang;
  const fileName = prompt("保存するファイル名", `${file.name}.${ext}`);
  if (!fileName) return;

  const blob = new Blob([file.code], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();

  URL.revokeObjectURL(url);
});

// 読み込み
loadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    createTab("html");
    const f = files.find(f => f.id === activeFile);
    f.code = reader.result;
    editor.value = reader.result;
    runHTML(f.code);
  };
  reader.readAsText(file);
});

// テーマ切り替え
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// サイドバー表示/非表示
let sidebarVisible = true;

toggleSidebarBtn.addEventListener("click", () => {
  sidebarVisible = !sidebarVisible;
  if (sidebarVisible) {
    sidebar.classList.remove("hidden");
  } else {
    sidebar.classList.add("hidden");
  }
});

// サイドバー幅リサイズ
let isResizing = false;

resizer.addEventListener("mousedown", () => {
  isResizing = true;
  resizer.classList.add("dragging");
});

document.addEventListener("mousemove", (e) => {
  if (!isResizing) return;
  const newWidth = e.clientX;
  const minWidth = 80;
  const maxWidth = 400;
  if (newWidth > minWidth && newWidth < maxWidth) {
    sidebar.style.width = newWidth + "px";
  }
});

document.addEventListener("mouseup", () => {
  if (isResizing) {
    isResizing = false;
    resizer.classList.remove("dragging");
  }
});

// 全画面プレビュー
let isFullscreen = false;

fullscreenBtn.addEventListener("click", () => {
  if (!isFullscreen) {
    previewArea.classList.add("fullscreen-preview");
    isFullscreen = true;
    fullscreenBtn.textContent = "全画面解除";
  } else {
    previewArea.classList.remove("fullscreen-preview");
    isFullscreen = false;
    fullscreenBtn.textContent = "全画面プレビュー";
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isFullscreen) {
    previewArea.classList.remove("fullscreen-preview");
    isFullscreen = false;
    fullscreenBtn.textContent = "全画面プレビュー";
  }
});

// 新しいタブで開く（HTMLのみ）
openNewTabBtn.addEventListener("click", () => {
  const file = files.find(f => f.id === activeFile);
  if (!file) return;

  if (file.lang !== "html") {
    alert("新しいタブで開けるのは HTML のみです");
    return;
  }

  const newWindow = window.open("", "_blank");
  newWindow.document.open();
  newWindow.document.write(file.code);
  newWindow.document.close();
});

// 初期タブ
createTab("html");

let isDirty = false;

// 編集されたら「未保存状態」にする
editor.addEventListener("input", () => {
  isDirty = true;
});

// 保存したら「保存済み」にする
saveBtn.addEventListener("click", () => {
  isDirty = false;
});

// ダイアログ要素
const dialog = document.getElementById("save-confirm-dialog");
const dialogSave = document.getElementById("dialog-save");
const dialogNoSave = document.getElementById("dialog-nosave");
const dialogCancel = document.getElementById("dialog-cancel");

let pendingUnloadEvent = null;

// beforeunload を使って「閉じる直前に止める」
window.addEventListener("beforeunload", (e) => {
  if (!isDirty) return; // 編集されていなければ何もしない

  e.preventDefault();
  e.returnValue = "";

  // 自作ダイアログを表示
  dialog.classList.remove("hidden");

  // このイベントを後で使うために保存
  pendingUnloadEvent = e;
});

// 保存する
dialogSave.addEventListener("click", () => {
  const file = files.find(f => f.id === activeFile);
  if (file) {
    const ext = file.lang === "python" ? "py" : file.lang;
    const fileName = `${file.name}.${ext}`;
    const blob = new Blob([file.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();

    URL.revokeObjectURL(url);
  }

  isDirty = false;
  dialog.classList.add("hidden");

  // ページを閉じる
  window.removeEventListener("beforeunload", beforeUnloadHandler);
  window.location.reload();
});

// 保存しないで閉じる
dialogNoSave.addEventListener("click", () => {
  isDirty = false;
  dialog.classList.add("hidden");

  window.removeEventListener("beforeunload", beforeUnloadHandler);
  window.location.reload();
});

// キャンセル（閉じない）
dialogCancel.addEventListener("click", () => {
  dialog.classList.add("hidden");
  pendingUnloadEvent = null;
});
