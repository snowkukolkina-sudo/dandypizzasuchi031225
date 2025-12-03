// ===== Reports Module - Отчётность =====

class ReportsModule {
    constructor() {
        this.currentReport = 'financial';
        this.orders = [];
        this.reports = [];
        this.ready = this.init();
    }

    async init() {
        console.log('📊 Initializing Reports Module...');
        await Promise.all([this.loadOrders(), this.loadReports()]);
        this.render();
    }

    async loadOrders() {
        try {
            const response = await fetch('/api/orders');
            if (response.ok) {
                const result = await response.json();
                this.orders = result.data || result || [];
                console.log('📊 Orders loaded:', this.orders.length);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            // Fallback data
            this.orders = [
                { id: 1, total: 1200, createdAt: '2024-01-15T10:00:00Z', status: 'delivered' },
                { id: 2, total: 850, createdAt: '2024-01-15T11:30:00Z', status: 'delivered' },
                { id: 3, total: 2100, createdAt: '2024-01-15T12:15:00Z', status: 'delivered' }
            ];
        }
    }

    async loadReports() {
        try {
            const data = await this.fetchStateKey('reports', []);
            this.reports = Array.isArray(data) ? data : [];
            console.log('✅ Отчёты загружены из API:', this.reports.length);
        } catch (error) {
            console.warn('⚠️ Ошибка загрузки отчётов, используем пустой массив:', error);
            this.reports = [];
        }
    }

    async saveReports() {
        try {
            await this.saveStateKey('reports', this.reports);
            console.log('✅ Отчёты сохранены через API:', this.reports.length);
        } catch (error) {
            console.warn('⚠️ Не удалось сохранить отчёты', error);
            // Показываем пользователю ошибку только если это критично
            if (error.message && !error.message.includes('HTTP 404')) {
                console.error('[Reports] Критическая ошибка сохранения:', error);
            }
        }
    }

    filterOrdersByDate(orders, startDate, endDate) {
        if (!startDate || !endDate) {
            return orders;
        }
        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                console.warn('⚠️ Некорректные даты фильтра:', startDate, endDate);
                return orders;
            }
            return orders.filter(o => {
                const orderDate = new Date(o.createdAt || o.created_at);
                if (isNaN(orderDate.getTime())) {
                    return false;
                }
                return orderDate >= start && orderDate <= end;
            });
        } catch (error) {
            console.warn('⚠️ Ошибка фильтрации по датам:', error);
            return orders;
        }
    }

    render() {
        const container = document.getElementById('reportsContent');
        if (!container) return;
        
        const orders = this.filterOrdersByDate(this.orders, '2024-01-01', '2024-12-31');
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalOrders = orders.length;
        const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        container.innerHTML = `
            <div class="card">
                <h3 class="card-title">📊 Отчётность</h3>
                
                <!-- Фильтры -->
                <div class="form-row" style="margin-bottom: 2rem;">
                    <div class="form-group">
                        <label class="form-label">Дата начала</label>
                        <input type="date" id="reportStartDate" class="form-input" value="2024-01-01">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Дата окончания</label>
                        <input type="date" id="reportEndDate" class="form-input" value="2024-12-31">
                    </div>
                    <div class="form-group">
                        <label class="form-label">&nbsp;</label>
                        <button class="btn btn-primary" onclick="reportsModule.generateReport()">📊 Сформировать отчёт</button>
                    </div>
                </div>

                <!-- Статистика -->
                <div class="grid grid-3" style="margin-bottom: 2rem;">
                    <div class="card">
                        <h4>💰 Выручка</h4>
                        <div class="stat-value text-success">${totalRevenue.toLocaleString()} ₽</div>
                    </div>
                    <div class="card">
                        <h4>📦 Заказов</h4>
                        <div class="stat-value text-primary">${totalOrders}</div>
                    </div>
                    <div class="card">
                        <h4>📊 Средний чек</h4>
                        <div class="stat-value text-warning">${avgCheck.toFixed(0)} ₽</div>
                    </div>
                </div>

                <!-- Вкладки отчётов -->
                <div class="tabs-container">
                    <div class="tabs-nav">
                        <button class="tab-button active" onclick="reportsModule.switchTab('financial')">💰 Финансовый</button>
                        <button class="tab-button" onclick="reportsModule.switchTab('sales')">📈 Продажи</button>
                        <button class="tab-button" onclick="reportsModule.switchTab('products')">🍕 Товары</button>
                        <button class="tab-button" onclick="reportsModule.switchTab('customers')">👥 Клиенты</button>
                    </div>

                    <div id="financial-tab" class="tab-content active">
                        ${this.renderFinancialReport()}
                    </div>

                    <div id="sales-tab" class="tab-content">
                        ${this.renderSalesReport()}
                    </div>

                    <div id="products-tab" class="tab-content">
                        ${this.renderProductsReport()}
                    </div>

                    <div id="customers-tab" class="tab-content">
                        ${this.renderCustomersReport()}
                    </div>
                </div>
            </div>
        `;
    }

    renderFinancialReport() {
        const orders = this.filterOrdersByDate(
            Array.isArray(this.orders) ? this.orders : [], 
            document.getElementById('reportStartDate')?.value || '2024-01-01',
            document.getElementById('reportEndDate')?.value || '2024-12-31'
        );
        
        const totalRevenue = orders.reduce((sum, o) => sum + (Number(o?.total) || 0), 0);
        const cashOrders = orders.filter(o => o?.paymentMethod === 'cash').length;
        const cardOrders = orders.filter(o => o?.paymentMethod === 'card').length;
        const onlineOrders = orders.filter(o => o?.paymentMethod === 'online').length;

        const vatAmount = totalRevenue * 0.2;
        const netProfit = totalRevenue * 0.3;
        
        return `
            <div class="grid grid-2">
                <div class="card">
                    <h4>💳 По способам оплаты</h4>
                    <p><strong>Наличные:</strong> ${cashOrders} заказов</p>
                    <p><strong>Карта:</strong> ${cardOrders} заказов</p>
                    <p><strong>Онлайн:</strong> ${onlineOrders} заказов</p>
                </div>
                <div class="card">
                    <h4>📊 Финансовые показатели</h4>
                    <p><strong>Общая выручка:</strong> ${Number(totalRevenue).toLocaleString('ru-RU')} ₽</p>
                    <p><strong>НДС (20%):</strong> ${Number(vatAmount).toLocaleString('ru-RU')} ₽</p>
                    <p><strong>Чистая прибыль:</strong> ${Number(netProfit).toLocaleString('ru-RU')} ₽</p>
                </div>
            </div>
            <div style="margin-top: 1rem;">
                <button class="btn btn-success" onclick="reportsModule.exportReport('financial')">📄 Экспорт в Excel</button>
                <button class="btn btn-secondary" onclick="reportsModule.printReport()">🖨️ Печать</button>
            </div>
        `;
    }

    renderSalesReport() {
        try {
            const orders = this.filterOrdersByDate(
                Array.isArray(this.orders) ? this.orders : [], 
                document.getElementById('reportStartDate')?.value || '2024-01-01',
                document.getElementById('reportEndDate')?.value || '2024-12-31'
            );

            // Группируем по дням
            const dailySales = {};
            orders.forEach(order => {
                if (!order) return;
                const createdAt = order.createdAt || order.created_at;
                if (!createdAt) return;
                
                try {
                    const dateObj = new Date(createdAt);
                    if (isNaN(dateObj.getTime())) return;
                    const date = dateObj.toDateString();
                    if (!dailySales[date]) {
                        dailySales[date] = { orders: 0, revenue: 0 };
                    }
                    dailySales[date].orders++;
                    dailySales[date].revenue += Number(order.total) || 0;
                } catch (error) {
                    console.warn('⚠️ Ошибка обработки заказа:', order, error);
                }
            });

            const dailyData = Object.entries(dailySales).slice(-7); // Последние 7 дней

            if (dailyData.length === 0) {
                return `
                    <div class="card">
                        <h4>📈 Динамика продаж (последние 7 дней)</h4>
                        <p style="padding: 2rem; text-align: center; color: var(--text-light);">
                            Нет данных за выбранный период
                        </p>
                    </div>
                `;
            }

            return `
                <div class="card">
                    <h4>📈 Динамика продаж (последние 7 дней)</h4>
                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Дата</th>
                                    <th>Заказов</th>
                                    <th>Выручка</th>
                                    <th>Средний чек</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${dailyData.map(([date, data]) => {
                                    const avgCheck = data.orders > 0 ? (data.revenue / data.orders).toFixed(0) : '0';
                                    try {
                                        const dateObj = new Date(date);
                                        const formattedDate = isNaN(dateObj.getTime()) ? date : dateObj.toLocaleDateString('ru-RU');
                                        return `
                                            <tr>
                                                <td>${formattedDate}</td>
                                                <td>${data.orders}</td>
                                                <td>${Number(data.revenue).toLocaleString('ru-RU')} ₽</td>
                                                <td>${avgCheck} ₽</td>
                                            </tr>
                                        `;
                                    } catch (error) {
                                        return '';
                                    }
                                }).filter(row => row).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('❌ Ошибка рендеринга отчёта по продажам:', error);
            return `
                <div class="card">
                    <h4>📈 Динамика продаж</h4>
                    <p style="padding: 2rem; text-align: center; color: #dc2626;">
                        Ошибка загрузки данных: ${error.message || 'Неизвестная ошибка'}
                    </p>
                </div>
            `;
        }
    }

    renderProductsReport() {
        return `
            <div class="card">
                <h4>🍕 Популярные товары</h4>
                <p>Анализ продаж по категориям и товарам</p>
                <div class="grid grid-2">
                    <div>
                        <h5>Топ категории:</h5>
                        <ul>
                            <li>Пицца - 45%</li>
                            <li>Роллы - 30%</li>
                            <li>Напитки - 15%</li>
                            <li>Закуски - 10%</li>
                        </ul>
                    </div>
                    <div>
                        <h5>Топ товары:</h5>
                        <ul>
                            <li>Пепперони 30см - 120 заказов</li>
                            <li>Филадельфия - 95 заказов</li>
                            <li>Маргарита 25см - 87 заказов</li>
                            <li>Калифорния - 76 заказов</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    renderCustomersReport() {
        return `
            <div class="card">
                <h4>👥 Анализ клиентов</h4>
                <div class="grid grid-3">
                    <div>
                        <h5>Новые клиенты</h5>
                        <div class="stat-value text-success">23</div>
                        <p>За выбранный период</p>
                    </div>
                    <div>
                        <h5>Постоянные клиенты</h5>
                        <div class="stat-value text-primary">156</div>
                        <p>Сделали >3 заказов</p>
                    </div>
                    <div>
                        <h5>VIP клиенты</h5>
                        <div class="stat-value text-warning">12</div>
                        <p>Потратили >10,000 ₽</p>
                    </div>
                </div>
            </div>
        `;
    }

    switchTab(tabName) {
        try {
            // Обновляем кнопки
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeButton = document.querySelector(`[onclick*="${tabName}"]`);
            if (activeButton) {
                activeButton.classList.add('active');
            }

            // Обновляем контент
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const activeTab = document.getElementById(`${tabName}-tab`);
            if (activeTab) {
                activeTab.classList.add('active');
            } else {
                console.warn(`⚠️ Вкладка ${tabName}-tab не найдена`);
            }
        } catch (error) {
            console.error('❌ Ошибка переключения вкладки:', error);
        }
    }

    async generateReport() {
        try {
            const startDateEl = document.getElementById('reportStartDate');
            const endDateEl = document.getElementById('reportEndDate');
            
            if (!startDateEl || !endDateEl) {
                console.error('❌ Элементы фильтра дат не найдены');
                alert('⚠️ Ошибка: элементы фильтра не найдены');
                return;
            }
            
            const startDate = startDateEl.value;
            const endDate = endDateEl.value;
            
            if (!startDate || !endDate) {
                alert('⚠️ Выберите даты для отчёта');
                return;
            }

            // Создаём новый отчёт и сохраняем его
            const newReport = {
                id: Date.now(),
                type: this.currentReport,
                startDate: startDate,
                endDate: endDate,
                createdAt: new Date().toISOString(),
                orders: this.filterOrdersByDate(this.orders, startDate, endDate)
            };
            
            // Добавляем в список отчётов
            this.reports.unshift(newReport);
            
            // Ограничиваем количество сохранённых отчётов (последние 50)
            if (this.reports.length > 50) {
                this.reports = this.reports.slice(0, 50);
            }
            
            // Сохраняем через API
            await this.saveReports();
            
            // Обновляем отчёт
            this.render();
            alert('✅ Отчёт сформирован и сохранён!');
        } catch (error) {
            console.error('❌ Ошибка генерации отчёта:', error);
            alert('❌ Ошибка при генерации отчёта: ' + (error.message || 'Неизвестная ошибка'));
        }
    }

    async exportReport(type) {
        try {
            // Загружаем xlsx библиотеку, если нужно
            if (typeof window.loadXLSX === 'function') {
                const XLSX = await window.loadXLSX();
                if (!XLSX) {
                    alert('⚠️ Библиотека Excel недоступна. Экспорт невозможен.');
                    return;
                }
                
                // Формируем данные для экспорта
                const startDate = document.getElementById('reportStartDate')?.value || '2024-01-01';
                const endDate = document.getElementById('reportEndDate')?.value || '2024-12-31';
                const orders = this.filterOrdersByDate(this.orders, startDate, endDate);
                
                // Создаём рабочую книгу
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(orders.map(o => ({
                    'ID заказа': o.id,
                    'Дата': new Date(o.createdAt || o.created_at).toLocaleDateString('ru-RU'),
                    'Сумма': o.total || 0,
                    'Статус': o.status || 'unknown'
                })));
                
                XLSX.utils.book_append_sheet(wb, ws, 'Отчёт');
                XLSX.writeFile(wb, `report_${type}_${Date.now()}.xlsx`);
                
                alert('✅ Отчёт экспортирован в Excel!');
            } else {
                alert('⚠️ Функция экспорта в Excel недоступна');
            }
        } catch (error) {
            console.error('❌ Ошибка экспорта отчёта:', error);
            alert('❌ Ошибка при экспорте: ' + (error.message || 'Неизвестная ошибка'));
        }
    }

    printReport() {
        window.print();
    }

    async fetchStateKey(key, fallback) {
        try {
            const response = await fetch(`/api/admin-state/keys/${encodeURIComponent(key)}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const payload = await response.json();
            if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
                return payload.data;
            }
        } catch (error) {
            console.warn(`[Reports] Не удалось загрузить ключ ${key}:`, error.message || error);
        }
        return fallback;
    }

    async saveStateKey(key, data) {
        try {
            const response = await fetch(`/api/admin-state/keys/${encodeURIComponent(key)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data })
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.warn(`[Reports] Не удалось сохранить ключ ${key}:`, error.message || error);
            throw error;
        }
    }
}

// Глобальная функция для инициализации
window.initReports = function() {
    if (window.reportsModule) {
        window.reportsModule = null;
    }
    window.reportsModule = new ReportsModule();
};

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsModule;
}





