// Модуль управления модификаторами (раздел 3.1 ТЗ)
// CRUD операции для модификаторов, привязка к блюдам и категориям

class ModifiersManager {
    constructor() {
        this.modifiers = [];
        this.groups = [];
        this.products = [];
    }

    async init() {
        await this.loadModifiers();
        await this.loadProducts();
        this.render();
    }

    async loadModifiers() {
        try {
            const response = await fetch('/api/modifiers');
            if (response.ok) {
                const result = await response.json();
                this.modifiers = (result.ok && Array.isArray(result.data)) ? result.data : [];
            } else {
                this.modifiers = [];
            }
        } catch (error) {
            console.warn('Modifiers API not available, using empty array');
            this.modifiers = [];
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            if (response.ok) {
                const result = await response.json();
                this.products = (result.ok && Array.isArray(result.data)) ? result.data : [];
            }
        } catch (error) {
            console.warn('Products API not available');
            this.products = [];
        }
    }

    render() {
        const container = document.getElementById('modifiersContent');
        if (!container) {
            console.warn('Container #modifiersContent not found');
            return;
        }

        container.innerHTML = `
            <div class="modifiers-management">
                <div class="modifiers-header" style="margin-bottom: 2rem;">
                    <h2>⚙️ Управление модификаторами</h2>
                    <p style="color: #666; margin-top: 0.5rem;">
                        Модификаторы — дополнительные параметры блюд (соусы, опции приготовления, доп. ингредиенты)
                    </p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <button class="btn btn-primary" onclick="modifiersManager.showCreateModifierForm()">
                        ➕ Создать модификатор
                    </button>
                    <button class="btn btn-secondary" onclick="modifiersManager.showImportModal()" style="margin-left: 0.5rem;">
                        📥 Импорт модификаторов
                    </button>
                    <button class="btn btn-secondary" onclick="modifiersManager.exportModifiers()" style="margin-left: 0.5rem;">
                        📤 Экспорт модификаторов
                    </button>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 1rem;">📋 Список модификаторов</h3>
                    ${this.renderModifiersTable()}
                </div>
            </div>
        `;
    }

    renderModifiersTable() {
        if (this.modifiers.length === 0) {
            return '<p style="color: #999; padding: 2rem; text-align: center;">Модификаторы не найдены. Создайте первый модификатор.</p>';
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Название</th>
                        <th>Группа</th>
                        <th>Тип</th>
                        <th>Цена</th>
                        <th>Применяется к</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.modifiers.map(modifier => `
                        <tr>
                            <td><strong>${this.escapeHtml(modifier.option_name || modifier.name || '—')}</strong></td>
                            <td>${this.escapeHtml(modifier.group_name || '—')}</td>
                            <td>${this.escapeHtml(modifier.type || 'switch')}</td>
                            <td>${modifier.price_value || 0} ₽</td>
                            <td>${this.getAppliedToText(modifier)}</td>
                            <td>${modifier.is_visible ? '✅ Активен' : '❌ Скрыт'}</td>
                            <td>
                                <button class="btn btn-small" onclick="modifiersManager.editModifier(${modifier.id})">✏️</button>
                                <button class="btn btn-small btn-danger" onclick="modifiersManager.deleteModifier(${modifier.id})">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    getAppliedToText(modifier) {
        if (modifier.item_id) {
            const product = this.products.find(p => p.id === modifier.item_id);
            return product ? product.name : `Товар #${modifier.item_id}`;
        }
        return 'Все блюда';
    }

    showCreateModifierForm(modifier = null) {
        const isEdit = modifier !== null;
        const modal = this.createModal(
            isEdit ? 'Редактировать модификатор' : 'Создать модификатор',
            `
            <form id="modifierForm">
                <div class="form-group">
                    <label class="form-label">Название модификатора *</label>
                    <input type="text" id="modifierName" class="form-input" 
                           value="${isEdit ? this.escapeHtml(modifier.option_name || '') : ''}" 
                           placeholder="Например: Острый соус" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Группа модификаторов</label>
                    <input type="text" id="modifierGroup" class="form-input" 
                           value="${isEdit ? this.escapeHtml(modifier.group_name || '') : ''}" 
                           placeholder="Например: Соусы">
                </div>

                <div class="form-group">
                    <label class="form-label">Тип модификатора</label>
                    <select id="modifierType" class="form-input">
                        <option value="switch" ${isEdit && modifier.type === 'switch' ? 'selected' : ''}>Переключатель (switch)</option>
                        <option value="checkbox" ${isEdit && modifier.type === 'checkbox' ? 'selected' : ''}>Чекбокс (checkbox)</option>
                        <option value="quantity" ${isEdit && modifier.type === 'quantity' ? 'selected' : ''}>Количество (quantity)</option>
                        <option value="group" ${isEdit && modifier.type === 'group' ? 'selected' : ''}>Группа (group)</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Цена (₽)</label>
                    <input type="number" id="modifierPrice" class="form-input" 
                           value="${isEdit ? (modifier.price_value || 0) : 0}" 
                           step="0.01" min="0">
                </div>

                <div class="form-group">
                    <label class="form-label">Режим цены</label>
                    <select id="modifierPriceMode" class="form-input">
                        <option value="fixed" ${isEdit && modifier.price_mode === 'fixed' ? 'selected' : 'selected'}>Фиксированная</option>
                        <option value="percent" ${isEdit && modifier.price_mode === 'percent' ? 'selected' : ''}>Процент от цены</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Применить к блюду (опционально)</label>
                    <select id="modifierItemId" class="form-input">
                        <option value="">— Все блюда —</option>
                        ${this.products.filter(p => p.type === 'dish' || p.type === 'product').map(p => `
                            <option value="${p.id}" ${isEdit && modifier.item_id == p.id ? 'selected' : ''}>
                                ${this.escapeHtml(p.name)}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Максимальное количество</label>
                    <input type="number" id="modifierMaxQty" class="form-input" 
                           value="${isEdit ? (modifier.max_qty || '') : ''}" 
                           placeholder="Оставьте пустым для неограниченного">
                </div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="modifierDefaultOn" ${isEdit && modifier.default_on ? 'checked' : ''}>
                        Включен по умолчанию
                    </label>
                </div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="modifierVisible" ${isEdit && modifier.is_visible !== false ? 'checked' : ''}>
                        Видимый на сайте
                    </label>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">💾 ${isEdit ? 'Сохранить' : 'Создать'}</button>
                    <button type="button" class="btn btn-secondary" onclick="modifiersManager.closeModal()">Отмена</button>
                </div>
            </form>
        `);

        modal.querySelector('#modifierForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isEdit) {
                await this.updateModifier(modifier.id);
            } else {
                await this.createModifier();
            }
        });
    }

    async createModifier() {
        const data = {
            option_name: document.getElementById('modifierName').value.trim(),
            group_name: document.getElementById('modifierGroup').value.trim() || null,
            type: document.getElementById('modifierType').value,
            price_value: parseFloat(document.getElementById('modifierPrice').value) || 0,
            price_mode: document.getElementById('modifierPriceMode').value,
            item_id: document.getElementById('modifierItemId').value || null,
            max_qty: document.getElementById('modifierMaxQty').value ? parseInt(document.getElementById('modifierMaxQty').value) : null,
            default_on: document.getElementById('modifierDefaultOn').checked ? 1 : 0,
            is_visible: document.getElementById('modifierVisible').checked ? 1 : 0
        };

        if (!data.option_name) {
            alert('❌ Заполните название модификатора');
            return;
        }

        try {
            const response = await fetch('/api/modifiers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.ok || result.success) {
                alert('✅ Модификатор создан');
                this.closeModal();
                await this.loadModifiers();
                this.render();
            } else {
                throw new Error(result.error || 'Ошибка создания');
            }
        } catch (error) {
            console.error('Create modifier error:', error);
            alert('❌ Ошибка: ' + error.message);
        }
    }

    async updateModifier(modifierId) {
        const data = {
            option_name: document.getElementById('modifierName').value.trim(),
            group_name: document.getElementById('modifierGroup').value.trim() || null,
            type: document.getElementById('modifierType').value,
            price_value: parseFloat(document.getElementById('modifierPrice').value) || 0,
            price_mode: document.getElementById('modifierPriceMode').value,
            item_id: document.getElementById('modifierItemId').value || null,
            max_qty: document.getElementById('modifierMaxQty').value ? parseInt(document.getElementById('modifierMaxQty').value) : null,
            default_on: document.getElementById('modifierDefaultOn').checked ? 1 : 0,
            is_visible: document.getElementById('modifierVisible').checked ? 1 : 0
        };

        if (!data.option_name) {
            alert('❌ Заполните название модификатора');
            return;
        }

        try {
            const response = await fetch(`/api/modifiers/${modifierId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.ok || result.success) {
                alert('✅ Модификатор обновлён');
                this.closeModal();
                await this.loadModifiers();
                this.render();
            } else {
                throw new Error(result.error || 'Ошибка обновления');
            }
        } catch (error) {
            console.error('Update modifier error:', error);
            alert('❌ Ошибка: ' + error.message);
        }
    }

    async deleteModifier(modifierId) {
        if (!confirm('Удалить модификатор?')) return;

        try {
            const response = await fetch(`/api/modifiers/${modifierId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            if (result.ok || result.success) {
                alert('✅ Модификатор удалён');
                await this.loadModifiers();
                this.render();
            } else {
                throw new Error(result.error || 'Ошибка удаления');
            }
        } catch (error) {
            console.error('Delete modifier error:', error);
            alert('❌ Ошибка: ' + error.message);
        }
    }

    editModifier(modifierId) {
        const modifier = this.modifiers.find(m => m.id === modifierId);
        if (!modifier) {
            alert('Модификатор не найден');
            return;
        }
        this.showCreateModifierForm(modifier);
    }

    showImportModal() {
        const modal = this.createModal('Импорт модификаторов', `
            <p style="margin-bottom: 1rem;">Выберите CSV файл для импорта модификаторов</p>
            <input type="file" id="modifiersImportFile" accept=".csv" class="form-input" style="margin-bottom: 1rem;">
            <div class="form-actions">
                <button class="btn btn-primary" onclick="modifiersManager.importModifiers()">📥 Импортировать</button>
                <button class="btn btn-secondary" onclick="modifiersManager.closeModal()">Отмена</button>
            </div>
        `);
    }

    async importModifiers() {
        const fileInput = document.getElementById('modifiersImportFile');
        if (!fileInput || !fileInput.files[0]) {
            alert('Выберите файл');
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/importModifiers', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success || result.ok) {
                alert(`✅ Импортировано модификаторов: ${result.imported || 0}`);
                this.closeModal();
                await this.loadModifiers();
                this.render();
            } else {
                throw new Error(result.error || 'Ошибка импорта');
            }
        } catch (error) {
            console.error('Import modifiers error:', error);
            alert('❌ Ошибка: ' + error.message);
        }
    }

    async exportModifiers() {
        try {
            const csv = this.modifiersToCSV();
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `modifiers_export_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export modifiers error:', error);
            alert('❌ Ошибка экспорта');
        }
    }

    modifiersToCSV() {
        const headers = ['Название', 'Группа', 'Тип', 'Цена', 'Режим цены', 'Товар ID', 'Макс. количество', 'По умолчанию', 'Видимый'];
        const rows = this.modifiers.map(m => [
            m.option_name || '',
            m.group_name || '',
            m.type || 'switch',
            m.price_value || 0,
            m.price_mode || 'fixed',
            m.item_id || '',
            m.max_qty || '',
            m.default_on ? 'Да' : 'Нет',
            m.is_visible ? 'Да' : 'Нет'
        ]);

        return [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    }

    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="modifiersManager.closeModal()">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация
if (typeof window !== 'undefined') {
    window.ModifiersManager = ModifiersManager;
    window.modifiersManager = new ModifiersManager();
}

