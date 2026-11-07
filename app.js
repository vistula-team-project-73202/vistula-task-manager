let API, KEY, tasks = [], editingId = null;
const $ = id => document.getElementById(id);

function showMessage(text) { $('status-message').textContent = text; }

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { apikey: KEY, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadTasks() {
  try {
    tasks = await api('?select=*&order=id');
    render();
    showMessage('');
  } catch (e) { showMessage('Error loading tasks: ' + e.message); }
}

function render() {
  const list = $('task-list');
  list.innerHTML = '';
  tasks.forEach(t => {
    const div = document.createElement('div');
    div.className = 'task-item';
    div.dataset.id = t.id;

    const add = (tag, cls, text) => {
      const el = document.createElement(tag);
      el.className = cls;
      el.textContent = text;
      div.appendChild(el);
      return el;
    };

    add('strong', 'task-title', t.title);
    add('span', 'task-description', ' ' + (t.description || ''));
    add('em', 'task-status', t.completed ? ' [Completed] ' : ' [Not completed] ');
    add('button', 'toggle-task', t.completed ? 'Mark incomplete' : 'Mark complete')
      .onclick = () => updateTask(t.id, { completed: !t.completed });
    add('button', 'edit-task', 'Edit').onclick = () => startEdit(t);
    add('button', 'delete-task', 'Delete').onclick = () => deleteTask(t.id);

    list.appendChild(div);
  });
}

async function updateTask(id, data) {
  try {
    await api('?id=eq.' + id, { method: 'PATCH', body: JSON.stringify(data) });
    loadTasks();
  } catch (e) { showMessage('Error updating: ' + e.message); }
}

async function deleteTask(id) {
  try {
    await api('?id=eq.' + id, { method: 'DELETE' });
    loadTasks();
  } catch (e) { showMessage('Error deleting: ' + e.message); }
}

function startEdit(t) {
  editingId = t.id;
  $('task-title').value = t.title;
  $('task-description').value = t.description || '';
  $('task-submit').textContent = 'Save changes';
}

async function init() {
  try {
    const cfg = await (await fetch('config.json')).json();
    API = cfg.supabaseUrl + '/rest/v1/' + cfg.tableName;
    KEY = cfg.supabasePublishableKey;
  } catch (e) { return showMessage('Cannot read config.json'); }

  $('task-form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      title: $('task-title').value.trim(),
      description: $('task-description').value.trim()
    };
    try {
      if (editingId) {
        await api('?id=eq.' + editingId, { method: 'PATCH', body: JSON.stringify(data) });
        editingId = null;
        $('task-submit').textContent = 'Add task';
      } else {
        await api('', { method: 'POST', body: JSON.stringify(data), headers: { Prefer: 'return=minimal' } });
      }
      $('task-form').reset();
      loadTasks();
    } catch (err) { showMessage('Error saving: ' + err.message); }
  });

  loadTasks();
}
init();
