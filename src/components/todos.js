// ===== Todo Component =====
// Hedeflerim — Todo CRUD, bucket, filtreleme
// Extracted from app-v5.js

function createTodo(text, bucket = 'today', dueDate = '') {
    const nowIso = new Date().toISOString();
    const todo = {
        id: window.generateId(),
        text,
        completed: false,
        bucket: window.normalizeTodoBucket(bucket),
        dueDate: window.normalizeDueDate(dueDate),
        createdAt: nowIso,
        updatedAt: nowIso
    };
    window.appData.todos.push(todo);
    window.saveData();
    window.renderActiveTab();
}

function toggleTodo(id) {
    const todo = window.appData.todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        todo.updatedAt = new Date().toISOString();
        window.saveData();
        window.renderActiveTab();
    }
}

function setTodoBucket(id, bucket) {
    const todo = window.appData.todos.find(t => t.id === id);
    if (!todo) return;
    const nextBucket = window.normalizeTodoBucket(bucket);
    if (todo.bucket === nextBucket) return;
    todo.bucket = nextBucket;
    todo.updatedAt = new Date().toISOString();
    window.saveData();
    window.renderActiveTab();
}

function cycleTodoBucket(id) {
    const todo = window.appData.todos.find(t => t.id === id);
    if (!todo) return;
    setTodoBucket(id, window.getNextTodoBucket(window.normalizeTodoBucket(todo.bucket)));
}
globalThis.cycleTodoBucket = cycleTodoBucket;

function deleteTodo(id) {
    window.softDeleteItem('todo', id, { itemLabel: 'Görev' });
}

function getTodoFilterPredicate(filterId) {
    if (filterId === 'week') return (todo) => window.normalizeTodoBucket(todo?.bucket) === 'week';
    if (filterId === 'someday') return (todo) => window.normalizeTodoBucket(todo?.bucket) === 'someday';
    return (todo) => window.normalizeTodoBucket(todo?.bucket) === 'today';
}

function getTodoEmptyMessage(filterId) {
    if (filterId === 'week') return 'Bu hafta için görev yok';
    if (filterId === 'someday') return 'Bir Ara listesi boş';
    return 'Bugün için görev yok';
}

function renderTodos() {
    const container = document.getElementById('todosContainer');
    const stats = document.getElementById('todoStats');
    const bucketSelect = document.getElementById('todoBucketSelect');

    const filterFn = getTodoFilterPredicate(window.currentTodoFilter);
    const filteredTodos = (window.appData.todos || []).filter(filterFn);
    const sortedTodos = [...filteredTodos].sort((a, b) => {
        if (Boolean(a?.completed) !== Boolean(b?.completed)) return a.completed ? 1 : -1;
        const aTime = Date.parse(a?.updatedAt || a?.createdAt || '') || 0;
        const bTime = Date.parse(b?.updatedAt || b?.createdAt || '') || 0;
        return bTime - aTime;
    });

    const completed = sortedTodos.filter(t => t.completed).length;
    const total = sortedTodos.length;
    stats.textContent = `${completed}/${total} tamamlandi • ${window.getTodoBucketLabel(window.currentTodoFilter)}`;

    document.querySelectorAll('[data-todo-filter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.todoFilter === window.currentTodoFilter);
    });
    if (bucketSelect && document.activeElement !== bucketSelect) {
        bucketSelect.value = window.currentTodoFilter;
    }

    if (sortedTodos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="animated-empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-svg-todo"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <h3>${getTodoEmptyMessage(window.currentTodoFilter)}</h3>
                <p>Yeni görev eklemek için üstten kategori seçebilirsin</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sortedTodos.map(todo => {
        const safeTodoId = window.escapeJsSingleQuote(todo.id || '');
        const safeTodoText = safeText(todo.text);
        const safeTodoDataId = safeText(todo.id);
        const bucketLabel = window.escapeHtml(window.getTodoBucketLabel(window.normalizeTodoBucket(todo.bucket)));
        return `
        <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${safeTodoDataId}">
            <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" onclick="window.toggleTodo(window.decodeJsSingleQuote('${safeTodoId}'))"></div>
            <span class="todo-text">${safeTodoText}${todo.dueDate ? `<span class="todo-due-badge">${safeText(todo.dueDate)}</span>` : ''}</span>
            <button class="todo-bucket-btn" onclick="window.cycleTodoBucket(window.decodeJsSingleQuote('${safeTodoId}'))" title="Kategori değistir">${bucketLabel}</button>
            <button class="todo-delete" onclick="window.deleteTodo(window.decodeJsSingleQuote('${safeTodoId}'))" aria-label="Sil">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
    }).join('');
}

window.createTodo = createTodo;
window.toggleTodo = toggleTodo;
window.setTodoBucket = setTodoBucket;
window.cycleTodoBucket = cycleTodoBucket;
window.deleteTodo = deleteTodo;
window.renderTodos = renderTodos;
