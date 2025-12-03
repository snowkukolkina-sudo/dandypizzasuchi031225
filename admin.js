// DANDY CRM/АРМ — Админка для сайта DANDY Pizza
// Полная функциональность управления рестораном

class DandyAdmin {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'dashboard';
        this.currentLang = 'ru';
        this.currentTab = 'dishes';
        
        // Данные - инициализируем пустыми массивами, загрузка будет в init()
        this.dishes = [];
        this.products = [];
        
        this.promotions = this.getDefaultPromotions();
        
        this.orders = [];
        
        this.couriers = [
            { id: 1, name: "Алексей", phone: "+7 900 000-00-01", status: "free" },
            { id: 2, name: "Марина", phone: "+7 900 000-00-02", status: "to-order" },
            { id: 3, name: "Павел", phone: "+7 900 000-00-03", status: "back" }
        ];
        
        // Данные - инициализируем пустыми массивами, загрузка будет в init()
        this.dishes = [];
        this.products = [];
        this.loadPromotions();
        
        this.init();
    }
    
    async init() {
        // Сначала пытаемся загрузить данные с сервера
        if (!(await this.loadDishesFromAPI())) {
            // Если данных нет, используем дефолтные (только при первом запуске)
            this.dishes = [
                { id: 1, name: "Пепперони 30 см", cat: "Пицца", price: 399, cost: 180, desc: "Острая пицца с пепперони", mods: ["Острый соус", "Доп. сыр"], alrg: "молоко", nutrition: "б/ж/у", photo: "" },
                { id: 2, name: "Филадельфия", cat: "Роллы", price: 459, cost: 220, desc: "Классический ролл с лососем", mods: ["Соус унаги", "Кунжут"], alrg: "рыба", nutrition: "б/ж/у", photo: "" },
                { id: 3, name: "Маргарита 25 см", cat: "Пицца", price: 330, cost: 150, desc: "Классическая пицца с томатами и моцареллой", mods: ["Базилик"], alrg: "молоко", nutrition: "б/ж/у", photo: "" },
                { id: 4, name: "Калифорния", cat: "Роллы", price: 360, cost: 180, desc: "Ролл с крабом и авокадо", mods: ["Икра", "Кунжут"], alrg: "рыба", nutrition: "б/ж/у", photo: "" },
                { id: 5, name: "4 Сыра 33 см", cat: "Пицца", price: 450, cost: 200, desc: "Пицца с четырьмя видами сыра", mods: ["Моцарелла", "Пармезан", "Чеддер", "Горгонзола"], alrg: "молоко", nutrition: "б/ж/у", photo: "" },
                { id: 6, name: "Салат Цезарь", cat: "Салаты", price: 320, cost: 120, desc: "Классический салат с курицей и сухариками", mods: ["Соус цезарь"], alrg: "молоко", nutrition: "б/ж/у", photo: "" },
                { id: 7, name: "Греческий салат", cat: "Салаты", price: 280, cost: 100, desc: "Свежий салат с овощами и фетой", mods: ["Оливковое масло"], alrg: "молоко", nutrition: "б/ж/у", photo: "" },
                { id: 8, name: "Комбо Семейный", cat: "Комбо", price: 1599, cost: 800, desc: "Большое комбо для всей семьи", mods: ["2 пиццы", "Напитки"], alrg: "молоко", nutrition: "б/ж/у", photo: "" }
            ];
            
            this.products = [
                { id: 1001, name: "Соус фирменный", cat: "Соусы", price: 49, cost: 15, sku: "SAUCE-001", photo: "" },
                { id: 1002, name: "Кока-Кола 0.5л", cat: "Напитки", price: 120, cost: 60, sku: "DRINK-001", photo: "" },
                { id: 1003, name: "Пепси 0.5л", cat: "Напитки", price: 120, cost: 60, sku: "DRINK-002", photo: "" },
                { id: 1004, name: "Картофель фри", cat: "Закуски", price: 150, cost: 50, sku: "SNACK-001", photo: "" },
                { id: 1005, name: "Сырные палочки", cat: "Закуски", price: 200, cost: 80, sku: "SNACK-002", photo: "" }
            ];
            
            // Сохраняем дефолтные данные при первом запуске
            this.saveDishesToServer();
        }
        
        this.setupEventListeners();
        // Не загружаем данные при инициализации - только при переключении на страницы
        // this.loadAllProducts();
        // this.loadPromotions();
        // this.loadOrders();
    }
    
    setupEventListeners() {
        // Кнопка выхода
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // Кнопка "Войти в кассир"
        const openCashierBtn = document.getElementById('openCashier');
        if (openCashierBtn) {
            openCashierBtn.addEventListener('click', () => {
                window.open('pos.html', '_blank');
            });
        }
        
        // Navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPage(e.target.dataset.page);
            });
        });
        
        // Language switch
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchLanguage(e.target.dataset.lang);
            });
        });
        
        // Menu tabs
        const dishesTab = document.getElementById('dishesTab');
        if (dishesTab) {
            dishesTab.addEventListener('click', () => {
                this.switchMenuTab('dishes');
            });
        }
        
        const productsTab = document.getElementById('productsTab');
        if (productsTab) {
            productsTab.addEventListener('click', () => {
                this.switchMenuTab('products');
            });
        }
        
        // Add item
        const addItem = document.getElementById('addItem');
        if (addItem) {
            addItem.addEventListener('click', () => {
                this.addMenuItem();
            });
        }
        
        // Photo preview
        const itemPhoto = document.getElementById('itemPhoto');
        if (itemPhoto) {
            itemPhoto.addEventListener('input', (e) => {
                this.handlePhotoPreview(e.target.value);
            });
        }
        
        // CSV import
        const csvImport = document.getElementById('csvImport');
        if (csvImport) {
            csvImport.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                        this.importExcel(file);
                    } else {
                        this.importCSV(file);
                    }
                    // Сбрасываем input для возможности повторного выбора того же файла
                    e.target.value = '';
                }
            });
        }
        
        const loadSample = document.getElementById('loadSample');
        if (loadSample) {
            loadSample.addEventListener('click', () => {
                this.loadSampleCSV();
            });
        }
        
        // Order filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterOrders(e.target.dataset.filter);
            });
        });
        
        // Search functionality
        const searchInput = document.getElementById('adminSearch');
        if (searchInput) {
            console.log('Поиск подключен'); // Отладка
            searchInput.addEventListener('input', (e) => {
                console.log('Ввод в поиск:', e.target.value); // Отладка
                this.searchItems(e.target.value);
            });
        } else {
            console.log('Поле поиска не найдено!'); // Отладка
        }
    }
    
    handleLogout() {
        // Очистка данных пользователя
        this.currentUser = null;
        
        // Очищаем localStorage
        localStorage.removeItem('dandy_user');
        
        // Перенаправляем на страницу входа
        window.location.href = 'login-system.html';
        
        console.log('Выход выполнен');
    }
    
    switchPage(page) {
        this.currentPage = page;
        
        // Update navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-page="${page}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
            
            // Scroll to active tab
            setTimeout(() => {
                const tabsWrap = document.querySelector('.tabs-wrap');
                if (tabsWrap) {
                    const tabRect = activeTab.getBoundingClientRect();
                    const containerRect = tabsWrap.getBoundingClientRect();
                    const tabCenter = tabRect.left - containerRect.left + tabRect.width / 2;
                    const containerCenter = tabsWrap.clientWidth / 2;
                    const scrollLeft = tabsWrap.scrollLeft + (tabCenter - containerCenter);
                    
                    tabsWrap.scrollTo({
                        left: scrollLeft,
                        behavior: 'smooth'
                    });
                }
            }, 50);
        }
        
        // Update content
        document.querySelectorAll('.page-content').forEach(content => {
            content.classList.remove('active');
        });
        const pageElement = document.getElementById(page);
        if (pageElement) {
            pageElement.classList.add('active');
        } else {
            console.warn(`⚠️ Page element #${page} not found`);
        }
        
        // Load page-specific data
        this.loadPageData(page);
    }
    
    switchLanguage(lang) {
        this.currentLang = lang;
        
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-lang="${lang}"]`).classList.add('active');
        
        // Update all text content
        this.updateLanguageContent();
    }
    
    switchMenuTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.getElementById('dishesTab').classList.toggle('btn-primary', tab === 'dishes');
        document.getElementById('dishesTab').classList.toggle('btn-secondary', tab !== 'dishes');
        document.getElementById('productsTab').classList.toggle('btn-primary', tab === 'products');
        document.getElementById('productsTab').classList.toggle('btn-secondary', tab !== 'products');
        
        // Update form fields
        const modifiersGroup = document.getElementById('modifiersGroup');
        const allergensGroup = document.getElementById('allergensGroup');
        const skuGroup = document.getElementById('skuGroup');
        const addItemTitle = document.getElementById('addItemTitle');
        
        if (tab === 'dishes') {
            modifiersGroup.style.display = 'block';
            allergensGroup.style.display = 'block';
            skuGroup.style.display = 'none';
            addItemTitle.textContent = 'Добавить блюдо';
        } else {
            modifiersGroup.style.display = 'none';
            allergensGroup.style.display = 'none';
            skuGroup.style.display = 'block';
            addItemTitle.textContent = 'Добавить товар';
        }
        
        this.updateMenuTable();
    }
    
    addMenuItem() {
        const name = document.getElementById('itemName').value;
        const category = document.getElementById('itemCategory').value;
        const price = parseFloat(document.getElementById('itemPrice').value) || 0;
        const cost = parseFloat(document.getElementById('itemCost').value) || 0;
        const description = document.getElementById('itemDescription').value;
        const photoUrl = document.getElementById('itemPhoto').value;
        const weight = document.getElementById('itemWeight') ? document.getElementById('itemWeight').value : '';
        
        if (!name) {
            alert('Введите название');
            return;
        }
        
        const newItem = {
            id: String(Date.now()),
            name,
            cat: category,
            category: category,
            price,
            cost,
            description: description,
            desc: description,
            photo: photoUrl,
            picture: photoUrl,
            weight: weight
        };
        
        if (this.currentTab === 'dishes') {
            const modifiers = document.getElementById('itemModifiers').value;
            const allergens = document.getElementById('itemAllergens').value;
            const nutrition = document.getElementById('itemNutrition')?.value || '';
            
            newItem.mods = modifiers ? modifiers.split(',').map(s => s.trim()) : [];
            newItem.alrg = allergens;
            newItem.nutrition = nutrition;
            
            this.dishes.push(newItem);
        } else {
            const sku = document.getElementById('itemSku').value || `SKU-${Date.now()}`;
            newItem.sku = sku;
            
            this.products.push(newItem);
        }
        
        // Сохраняем в localStorage для синхронизации с сайтом
            this.saveDishesToServer();
        
        this.clearForm();
        this.updateMenuTable();
        alert('✅ Товар успешно добавлен!\n\nИзменения сохранены и отобразятся на сайте.');
    }
    
    clearForm() {
        document.getElementById('itemName').value = '';
        document.getElementById('itemCategory').value = '';
        document.getElementById('itemPrice').value = '0';
        document.getElementById('itemCost').value = '0';
        document.getElementById('itemModifiers').value = '';
        document.getElementById('itemAllergens').value = '';
        document.getElementById('itemSku').value = '';
        document.getElementById('itemDescription').value = '';
        document.getElementById('itemPhoto').value = '';
        document.getElementById('photoPreview').innerHTML = '';
    }
    
    handlePhotoPreview(url) {
        const preview = document.getElementById('photoPreview');
        if (!url) {
            preview.innerHTML = '';
            return;
        }
        
        preview.innerHTML = `
            <img src="${url}" 
                 alt="превью" 
                 style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #e5e7eb;"
                 onerror="this.style.display='none'; this.parentElement.innerHTML='<div style=\\'color: red;\\'>❌ Ошибка загрузки фото</div>';">
        `;
    }
    
    updateMenuTable(filteredItems = null) {
        const tableContainer = document.getElementById('menuTable');
        const items = filteredItems || (this.currentTab === 'dishes' ? this.dishes : this.products);
        
        console.log('Обновление таблицы:', items.length, 'товаров'); // Отладка
        
        // Убираем сообщение о результатах поиска если показываем все товары
        if (!filteredItems) {
            const existingMessage = document.getElementById('searchResultsMessage');
            if (existingMessage) {
                existingMessage.remove();
            }
        }
        
        let tableHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Фото</th>
                        <th>Название</th>
                        <th>Категория</th>
                        ${this.currentTab === 'dishes' ? '<th>Ингредиенты</th><th>Время</th>' : '<th>SKU</th>'}
                        <th>Цена</th>
                        <th>Себестоимость</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        items.forEach(item => {
            // Получаем категорию из разных возможных источников
            let categoryDisplay = '—';
            if (item.cat) {
                categoryDisplay = item.cat;
            } else if (item.category_name) {
                categoryDisplay = item.category_name;
            } else if (item.category) {
                categoryDisplay = item.category;
            } else if (Array.isArray(item.categories) && item.categories.length > 0) {
                // Если категории в виде массива объектов, берем первую
                const firstCat = item.categories[0];
                categoryDisplay = typeof firstCat === 'object' ? (firstCat.name || firstCat) : firstCat;
            } else if (Array.isArray(item.category_ids) && item.category_ids.length > 0) {
                // Если есть только ID категорий, пытаемся найти название
                categoryDisplay = `Категория #${item.category_ids[0]}`;
            }
            
            // Для блюд: количество ингредиентов и время приготовления
            let ingredientsCount = '—';
            let prepTime = '—';
            if (this.currentTab === 'dishes') {
                if (item.ingredients && Array.isArray(item.ingredients)) {
                    ingredientsCount = item.ingredients.length;
                } else if (item.recipe_id) {
                    ingredientsCount = '📋';
                }
                if (item.prep_time) {
                    prepTime = `${item.prep_time} мин`;
                } else if (item.cooking_time) {
                    prepTime = `${item.cooking_time} мин`;
                }
            }
            
            // Статус (активен/неактивен)
            const isActive = item.visible_on_site !== false && item.available !== false;
            const statusBadge = isActive 
                ? '<span style="padding: 4px 8px; background: #28a745; color: white; border-radius: 4px; font-size: 0.85rem;">✓ Активен</span>'
                : '<span style="padding: 4px 8px; background: #dc3545; color: white; border-radius: 4px; font-size: 0.85rem;">✗ Неактивен</span>';
            
            tableHTML += `
                <tr>
                    <td>${item.photo || item.image_url ? `<img src="${item.photo || item.image_url}" alt="фото" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">` : '—'}</td>
                    <td><strong>${item.name || '—'}</strong></td>
                    <td>${categoryDisplay}</td>
                    ${this.currentTab === 'dishes' 
                        ? `<td>${ingredientsCount}</td><td>${prepTime}</td>` 
                        : `<td>${item.sku || '—'}</td>`}
                    <td>₽ ${item.price || 0}</td>
                    <td>₽ ${item.cost || item.cost_price || 0}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-primary btn-small" onclick="admin.editItem(${item.id})">✏️</button>
                        <button class="btn btn-secondary btn-small" onclick="admin.deleteItem(${item.id})">🗑️</button>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += '</tbody></table>';
        tableContainer.innerHTML = tableHTML;
        console.log('Таблица обновлена'); // Отладка
    }

    editItem(itemId) {
        console.log('Редактирование товара:', itemId);
        
        // Находим товар
        const allItems = [...this.dishes, ...this.products];
        const item = allItems.find(i => String(i.id) === String(itemId));
        
        if (!item) {
            alert('Товар не найден!');
            return;
        }

        // Создаём модальное окно для редактирования
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); display: flex; align-items: center;
            justify-content: center; z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; padding: 2rem; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
                <h2 style="margin: 0 0 1.5rem 0; color: var(--dandy-green);">✏️ Редактирование товара</h2>
                
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Название:</label>
                    <input type="text" id="editName" value="${item.name}" 
                           style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px;">
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Описание:</label>
                    <textarea id="editDescription" rows="3"
                              style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px;">${item.description || ''}</textarea>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Цена (₽):</label>
                        <input type="number" id="editPrice" value="${item.price}" 
                               style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Себестоимость (₽):</label>
                        <input type="number" id="editCost" value="${item.cost || 0}" 
                               style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                    </div>
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Категория:</label>
                    <input type="text" id="editCategory" value="${item.cat || ''}" 
                           style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Вес/Граммы:</label>
                    <input type="text" id="editWeight" value="${item.weight || ''}" placeholder="например: 500г, 30см"
                           style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Фото URL:</label>
                    <input type="text" id="editPhoto" value="${item.photo || item.picture || ''}" 
                           style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px;">
                    ${item.photo || item.picture ? `<img src="${item.photo || item.picture}" style="max-width: 100px; margin-top: 0.5rem; border-radius: 8px;">` : ''}
                </div>

                <div style="display: flex; gap: 1rem;">
                    <button onclick="admin.saveEditedItem('${itemId}')" 
                            style="flex: 1; padding: 1rem; background: var(--dandy-green); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">
                        💾 Сохранить
                    </button>
                    <button onclick="this.closest('.modal-overlay').remove()" 
                            style="flex: 1; padding: 1rem; background: #6b7280; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        ❌ Отмена
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        // Закрытие по клику на overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    saveEditedItem(itemId) {
        const name = document.getElementById('editName').value;
        const description = document.getElementById('editDescription').value;
        const price = parseFloat(document.getElementById('editPrice').value);
        const cost = parseFloat(document.getElementById('editCost').value);
        const category = document.getElementById('editCategory').value;
        const weight = document.getElementById('editWeight').value;
        const photo = document.getElementById('editPhoto').value;

        // Находим товар
        let item = this.dishes.find(d => String(d.id) === String(itemId));
        let isDish = true;
        
        if (!item) {
            item = this.products.find(p => String(p.id) === String(itemId));
            isDish = false;
        }

        if (item) {
            // Обновляем данные
            item.name = name;
            item.description = description;
            item.price = price;
            item.cost = cost;
            item.cat = category;
            item.weight = weight;
            if (photo) {
                item.photo = photo;
                item.picture = photo;
            }

            // Сохраняем в localStorage для синхронизации с сайтом
            this.saveDishesToServer();

            // Обновляем таблицу
            this.updateMenuTable();

            // Закрываем модалку
            document.querySelector('.modal-overlay').remove();

            alert('✅ Товар успешно обновлён!\n\nИзменения сохранены и отобразятся на сайте.');
        }
    }

    async saveDishesToServer() {
        // Сохраняем все товары на сервер для синхронизации с сайтом
        // ВАЖНО: Название функции устарело, но она уже использует API, а не localStorage
        const allItems = [...this.dishes, ...this.products];
        
        // Синхронизируем с сайтом через API
        try {
            const websiteProducts = allItems.map(item => ({
                id: item.id || item.name,
                name: item.name,
                description: item.description || item.desc || '',
                price: parseFloat(item.price) || 0,
                picture: item.image_url || item.picture || item.photo || item.image || '',
                category: item.category || item.cat || '',
                weight: item.weight || null,
                calories: item.calories || null,
                available: item.available !== false,
                sku: item.sku || null,
                // ✅ КРИТИЧНО: Добавлены поля, которые терялись при отправке
                mods: item.mods || [],                    // Модификаторы/допы
                alrg: item.alrg || '',                    // Аллергены
                nutrition: item.nutrition || ''           // Пищевая ценность/питательность
            }));
            
            const response = await fetch('/api/products/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    products: websiteProducts
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    console.log('✅ Товары синхронизированы с сайтом:', allItems.length, '(блюд:', this.dishes.length, ', товаров:', this.products.length, ')');
                }
            }
        } catch (error) {
            console.error('❌ Ошибка синхронизации с сервером:', error);
        }
    }
    
    async loadDishesFromAPI() {
        try {
            // Загружаем товары с сервера
            const response = await fetch('/api/products');
            if (response.ok) {
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    const serverProducts = result.data;
                    
                    // Обрабатываем категории для каждого товара
                    const processedProducts = serverProducts.map(p => {
                        // Получаем категорию из разных источников
                        let category = p.category || p.category_name || '';
                        
                        // Если категории в виде массива объектов, берем первую
                        if (Array.isArray(p.categories) && p.categories.length > 0) {
                            const firstCat = p.categories[0];
                            category = typeof firstCat === 'object' ? (firstCat.name || firstCat.slug || '') : firstCat;
                        }
                        
                        // Если есть category_ids, но нет названий, оставляем пустым (будет показано как "—")
                        if (!category && Array.isArray(p.category_ids) && p.category_ids.length > 0) {
                            category = ''; // Будет показано как "—" в таблице
                        }
                        
                        return {
                            ...p,
                            cat: category,
                            category: category,
                            category_name: category
                        };
                    });
                    
                    // Разделяем на dishes и products по типу (type='dish' или type='product')
                    // Если тип не указан, используем эвристику: товары с SKU или в категориях "Напитки", "Соусы"
                    this.dishes = processedProducts.filter(p => {
                        if (p.type === 'dish' || p.item_type === 'dish') return true;
                        if (p.type === 'product' || p.item_type === 'product') return false;
                        // Эвристика: если есть SKU или категория "Напитки"/"Соусы" - это товар
                        if (p.sku || (p.cat && ['Напитки', 'Соусы', 'Допы'].includes(p.cat))) {
                            return false;
                        }
                        return true; // По умолчанию считаем блюдом
                    });
                    this.products = processedProducts.filter(p => {
                        if (p.type === 'product' || p.item_type === 'product') return true;
                        if (p.type === 'dish' || p.item_type === 'dish') return false;
                        // Эвристика: если есть SKU или категория "Напитки"/"Соусы" - это товар
                        return p.sku || (p.cat && ['Напитки', 'Соусы', 'Допы'].includes(p.cat));
                    });
                    
                    if (this.dishes.length > 0 || this.products.length > 0) {
                        console.log('✅ Загружено товаров с сервера: блюд:', this.dishes.length, ', товаров:', this.products.length);
                        this.updateMenuTable();
                        return true;
                    }
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки с сервера:', error);
        }
        return false;
    }

    deleteItem(itemId) {
        // Находим товар для отображения имени
        const allItems = [...this.dishes, ...this.products];
        const itemToDelete = allItems.find(i => String(i.id) === String(itemId));
        const itemName = itemToDelete ? itemToDelete.name : 'Товар';
        
        if (!confirm(`❌ Удалить "${itemName}"?\n\nЭто действие нельзя отменить!`)) {
            return;
        }

        console.log('🗑️ Удаление товара:', itemId, itemName);

        // Удаляем из массивов
        const beforeDishes = this.dishes.length;
        const beforeProducts = this.products.length;
        const beforeTotal = beforeDishes + beforeProducts;
        
        this.dishes = this.dishes.filter(d => String(d.id) !== String(itemId));
        this.products = this.products.filter(p => String(p.id) !== String(itemId));

        const afterTotal = this.dishes.length + this.products.length;
        const deleted = beforeTotal - afterTotal;

        console.log(`📊 Было: ${beforeTotal}, Стало: ${afterTotal}, Удалено: ${deleted}`);

        if (deleted > 0) {
            // Сохраняем изменения
            this.saveDishesToServer();

            // Обновляем таблицу
            this.updateMenuTable();

            alert(`✅ Товар "${itemName}" удалён!\n\nОсталось товаров: ${afterTotal}\n\nОбнови главную страницу (Ctrl+Shift+R) чтобы увидеть изменения!`);
        } else {
            console.error('❌ Товар не найден, ID:', itemId);
            alert('⚠️ Товар не найден');
        }
    }
    
    async updateLoyalty() {
        const defaults = { pointsPercent: 5, pointValue: 1 };
        let settings = { ...defaults };
        
        try {
            const response = await fetch('/api/loyalty/config');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (data?.ok) {
                settings = {
                    pointsPercent: Number(data.pointsPercent ?? data.pointsPerRub ?? defaults.pointsPercent),
                    pointValue: Number(data.pointValue ?? data.rubPerPoint ?? defaults.pointValue),
                    enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
                    minOrderAmount: Number(data.minOrderAmount ?? 0),
                    welcomeBonus: Number(data.welcomeBonus ?? 0),
                    birthdayBonus: Number(data.birthdayBonus ?? 0),
                    updatedAt: data.updatedAt || null
                };
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить настройки лояльности', error);
        }
        
        const pointsPercent = document.getElementById('loyaltyPointsPercent');
        const pointValue = document.getElementById('loyaltyPointValue');
        
        if (pointsPercent) pointsPercent.value = settings.pointsPercent ?? defaults.pointsPercent;
        if (pointValue) pointValue.value = settings.pointValue ?? defaults.pointValue;
        
        await this.updateLoyaltyStats();
    }
    
    async updateLoyaltyStats() {
        const totalEarned = document.getElementById('totalPointsEarned');
        const totalReceived = document.getElementById('totalPointsReceived');
        const activeUsers = document.getElementById('activeUsers');
        
        let stats = { earned: 0, received: 0, activeUsers: 0 };
        try {
            const response = await fetch('/api/loyalty/stats');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const payload = await response.json();
            if (payload?.success) {
                stats = payload.data || stats;
            } else if (payload?.ok) {
                stats = payload;
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить статистику лояльности', error);
        }
        
        if (totalEarned) {
            totalEarned.value = stats.total_earned ?? stats.earned ?? 0;
        }
        if (totalReceived) {
            totalReceived.value = stats.total_redeemed ?? stats.received ?? 0;
        }
        if (activeUsers) {
            const byTier = Array.isArray(stats.customers_by_tier)
                ? stats.customers_by_tier.reduce((sum, tier) => sum + (tier['count'] ?? 0), 0)
                : null;
            activeUsers.value = stats.activeUsers ?? byTier ?? 0;
        }
    }
    
    updateOrdersTable() {
        const tbody = document.querySelector('#ordersTable tbody');
        let html = '';
        
        this.orders.forEach(order => {
            html += `
                <tr style="cursor: pointer;" onclick="admin.showOrderDetails('${order.id}')" title="Нажмите для просмотра деталей">
                    <td><strong>${order.id}</strong></td>
                    <td>
                        <div>${order.client}</div>
                        ${order.phone ? `<div style="font-size: 0.85em; color: #666;">${order.phone}</div>` : ''}
                    </td>
                    <td>${order.channel}</td>
                    <td>${order.courier}</td>
                    <td>${order.eta} мин</td>
                    <td><strong>₽ ${order.amount}</strong></td>
                    <td><span class="status-badge status-${order.status.replace(' ', '-')}">${order.status}</span></td>
                </tr>
            `;
        });
        
        if (this.orders.length === 0) {
            html = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #999;">Заказов пока нет</td></tr>';
        }
        
        tbody.innerHTML = html;
    }
    
    async showOrderDetails(orderId) {
        // Пытаемся загрузить свежие данные с API
        try {
            const response = await fetch(`/api/orders/${orderId}`);
            if (response.ok) {
                const result = await response.json();
                const apiOrder = result.data || result;
                
                // Обновляем локальные данные
                const localOrderIndex = this.orders.findIndex(o => o.id === orderId);
                if (localOrderIndex !== -1) {
                    this.orders[localOrderIndex] = {
                        id: apiOrder.id,
                        client: apiOrder.customerName || apiOrder.customer_name || 'Клиент',
                        phone: apiOrder.customerPhone || apiOrder.customer_phone || '',
                        amount: apiOrder.total || 0,
                        status: this.mapStatusToRussian(apiOrder.status),
                        channel: 'Сайт',
                        courier: '—',
                        eta: this.calculateETA(apiOrder.createdAt || apiOrder.created_at, apiOrder.status),
                        items: apiOrder.items || [],
                        address: apiOrder.address || apiOrder.deliveryAddress || '',
                        deliveryType: apiOrder.deliveryType || apiOrder.delivery_type || 'delivery',
                        paymentMethod: apiOrder.paymentMethod || apiOrder.payment_method || 'cash'
                    };
                }
            }
        } catch (error) {
            console.log('Используем локальные данные:', error);
        }
        
        const order = this.orders.find(o => o.id === orderId);
        if (!order) {
            alert('Заказ не найден');
            return;
        }
        
        // Создаем модальное окно с деталями заказа
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const itemsList = order.items && order.items.length > 0 
            ? order.items.map(item => {
                const itemName = item.name || item.product_name || item.productName || 'Товар';
                const itemPrice = item.price || item.product_price || item.productPrice || 0;
                const itemQty = item.quantity || item.qty || 1;
                const itemTotal = item.total || (itemPrice * itemQty);
                const itemExtras = item.extras || item.modifiers || null;
                
                return `
                <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 1.05em; margin-bottom: 0.25rem;">${itemName}</div>
                            ${itemExtras ? `<div style="font-size: 0.9em; color: #6b7280; margin-top: 0.25rem;">
                                Дополнения: ${typeof itemExtras === 'string' ? JSON.parse(itemExtras).join(', ') : (Array.isArray(itemExtras) ? itemExtras.join(', ') : itemExtras)}
                            </div>` : ''}
                        </div>
                        <div style="text-align: right; margin-left: 1rem;">
                            <div style="font-size: 0.9em; color: #6b7280;">${itemQty} шт × ${itemPrice} ₽</div>
                            <div style="font-weight: 700; font-size: 1.1em; color: var(--dandy-green);">${itemTotal} ₽</div>
                        </div>
                    </div>
                </div>
            `}).join('')
            : '<p style="color: #999; text-align: center; padding: 2rem;">Нет информации о составе заказа</p>';
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--dandy-green);">
                    <h2 style="margin: 0; color: var(--dandy-green);">Заказ ${order.id}</h2>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999; padding: 0.25rem 0.5rem;">×</button>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="color: var(--dandy-green); margin-bottom: 0.75rem;">Информация о клиенте</h3>
                    <div style="background: #f9f9f9; padding: 1rem; border-radius: 8px;">
                        <p><strong>Имя:</strong> ${order.client}</p>
                        ${order.phone ? `<p><strong>Телефон:</strong> ${order.phone}</p>` : ''}
                        <div style="margin: 0.75rem 0;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <strong>Адрес:</strong>
                                <button onclick="admin.toggleAddressEdit('${order.id}')" 
                                        style="background: var(--dandy-green); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
                                    ✏️ Редактировать
                                </button>
                            </div>
                            <div id="address-display-${order.id}">
                                <p style="margin: 0; padding: 0.5rem; background: white; border-radius: 4px; border: 1px solid #ddd;">
                                    ${order.address || 'Адрес не указан'}
                                </p>
                            </div>
                            <div id="address-edit-${order.id}" style="display: none;">
                                <div style="display: flex; gap: 0.5rem; align-items: center;">
                                    <input type="text" id="address-input-${order.id}" 
                                           value="${order.address || ''}" 
                                           placeholder="Введите адрес доставки"
                                           style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem;">
                                    <button onclick="admin.saveOrderAddress('${order.id}')" 
                                            style="background: var(--dandy-green); color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                                        💾 Сохранить
                                    </button>
                                    <button onclick="admin.cancelAddressEdit('${order.id}')" 
                                            style="background: #6b7280; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                                        ❌ Отмена
                                    </button>
                                </div>
                                <div style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">
                                    Пример: ул. Ленина, д. 15, кв. 42
                                </div>
                            </div>
                        </div>
                        <p><strong>Тип доставки:</strong> ${order.deliveryType === 'delivery' ? '🚚 Доставка' : '🏪 Самовывоз'}</p>
                        <p><strong>Способ оплаты:</strong> ${this.getPaymentMethodText(order.paymentMethod)}</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="color: var(--dandy-green); margin-bottom: 0.75rem;">Состав заказа</h3>
                    <div style="background: #f9f9f9; padding: 1rem; border-radius: 8px;">
                        ${itemsList}
                    </div>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="color: var(--dandy-green); margin-bottom: 0.75rem;">Информация о заказе</h3>
                    <div style="background: #f9f9f9; padding: 1rem; border-radius: 8px;">
                        <p><strong>Статус:</strong> <span class="status-badge status-${order.status.replace(' ', '-')}">${order.status}</span></p>
                        <p><strong>Канал:</strong> ${order.channel}</p>
                        <p><strong>Курьер:</strong> ${order.courier}</p>
                        <p><strong>Время до готовности:</strong> ${order.eta} мин</p>
                    </div>
                </div>
                
                <div style="background: var(--dandy-green); color: white; padding: 1rem; border-radius: 8px; text-align: center;">
                    <h2 style="margin: 0;">Сумма: ₽${order.amount}</h2>
                </div>
                
                <div style="margin-top: 1.5rem;">
                    <h3 style="color: var(--dandy-green); margin-bottom: 1rem; text-align: center;">🎯 Управление статусом заказа</h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
                        <button onclick="admin.updateOrderStatus('${order.id}', 'pending')" 
                                style="padding: 0.75rem; border-radius: 8px; border: 2px solid #6b7280; background: ${order.status === 'принят' ? '#6b7280' : 'white'}; color: ${order.status === 'принят' ? 'white' : '#6b7280'}; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                            📋 Принят
                        </button>
                        <button onclick="admin.updateOrderStatus('${order.id}', 'preparing')" 
                                style="padding: 0.75rem; border-radius: 8px; border: 2px solid #ea580c; background: ${order.status === 'готовится' ? '#ea580c' : 'white'}; color: ${order.status === 'готовится' ? 'white' : '#ea580c'}; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                            👨‍🍳 Готовится
                        </button>
                        <button onclick="admin.updateOrderStatus('${order.id}', 'ready')" 
                                style="padding: 0.75rem; border-radius: 8px; border: 2px solid #2563eb; background: ${order.status === 'готов' ? '#2563eb' : 'white'}; color: ${order.status === 'готов' ? 'white' : '#2563eb'}; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                            📦 Готов
                        </button>
                        <button onclick="admin.updateOrderStatus('${order.id}', 'with_courier')" 
                                style="padding: 0.75rem; border-radius: 8px; border: 2px solid #7c3aed; background: ${order.status === 'у курьера' ? '#7c3aed' : 'white'}; color: ${order.status === 'у курьера' ? 'white' : '#7c3aed'}; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                            🚚 У курьера
                        </button>
                        <button onclick="admin.updateOrderStatus('${order.id}', 'in_transit')" 
                                style="padding: 0.75rem; border-radius: 8px; border: 2px solid #c026d3; background: ${order.status === 'в пути' ? '#c026d3' : 'white'}; color: ${order.status === 'в пути' ? 'white' : '#c026d3'}; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                            🛵 В пути
                        </button>
                        <button onclick="admin.updateOrderStatus('${order.id}', 'delivered')" 
                                style="padding: 0.75rem; border-radius: 8px; border: 2px solid #16a34a; background: ${order.status === 'доставлен' ? '#16a34a' : 'white'}; color: ${order.status === 'доставлен' ? 'white' : '#16a34a'}; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                            ✅ Доставлен
                        </button>
                    </div>
                    <div style="margin-top: 0.75rem; padding: 0.75rem; background: #f0f9ff; border-radius: 8px; font-size: 0.875rem; color: #0369a1;">
                        💡 Совет: Нажмите на кнопку, чтобы изменить статус заказа. Клиент увидит обновление на странице отслеживания.
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Закрытие по клику на overlay
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    getPaymentMethodText(method) {
        const methods = {
            'cash': '💵 Наличные',
            'card': '💳 Картой',
            'online': '🌐 Онлайн',
            'sbp': '📱 СБП'
        };
        return methods[method] || method;
    }
    
    async updateOrderStatus(orderId, newStatus) {
        try {
            const response = await fetch(`/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (response.ok) {
                console.log('Order status updated:', newStatus);
                
                // Показываем уведомление
                this.showNotification('✅ Статус заказа обновлен!', 'success');
                
                // Обновляем локальные данные
                const order = this.orders.find(o => o.id === orderId);
                if (order) {
                    order.status = this.mapStatusToRussian(newStatus);
                }
                
                // Обновляем таблицу
                this.updateOrdersTable();
                
                // Закрываем и переоткрываем модальное окно для обновления
                document.querySelector('.modal-overlay')?.remove();
                setTimeout(() => this.showOrderDetails(orderId), 300);
            } else {
                this.showNotification('❌ Ошибка при обновлении статуса', 'error');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            this.showNotification('❌ Ошибка соединения с сервером', 'error');
        }
    }

    /**
     * Валидация адреса доставки
     */
    validateAddress(address) {
        if (!address || typeof address !== 'string') {
            return { valid: false, error: 'Адрес не может быть пустым' };
        }

        const trimmedAddress = address.trim();
        
        // Проверка минимальной длины
        if (trimmedAddress.length < 10) {
            return { valid: false, error: 'Адрес должен содержать минимум 10 символов' };
        }

        // Проверка максимальной длины
        if (trimmedAddress.length > 200) {
            return { valid: false, error: 'Адрес не может быть длиннее 200 символов' };
        }

        // Проверка на наличие улицы (должно быть слово "улица", "ул.", "проспект", "пр.", "переулок", "пер." и т.д.)
        const streetPatterns = [
            /улица|ул\.|ул\s/i,
            /проспект|пр\.|пр\s/i,
            /переулок|пер\.|пер\s/i,
            /бульвар|бул\.|бул\s/i,
            /набережная|наб\.|наб\s/i,
            /шоссе|ш\.|ш\s/i,
            /площадь|пл\.|пл\s/i,
            /проезд|пр-д/i,
            /тупик|туп\.|туп\s/i,
            /аллея|ал\.|ал\s/i
        ];

        const hasStreet = streetPatterns.some(pattern => pattern.test(trimmedAddress));
        if (!hasStreet) {
            return { valid: false, error: 'Адрес должен содержать название улицы (ул., пр., пер. и т.д.)' };
        }

        // Проверка на наличие номера дома (цифры)
        const hasHouseNumber = /\d/.test(trimmedAddress);
        if (!hasHouseNumber) {
            return { valid: false, error: 'Адрес должен содержать номер дома' };
        }

        // Проверка на недопустимые символы
        const invalidChars = /[<>{}[\]\\|`~!@#$%^&*()+=]/;
        if (invalidChars.test(trimmedAddress)) {
            return { valid: false, error: 'Адрес содержит недопустимые символы' };
        }

        // Проверка на повторяющиеся пробелы
        if (/\s{2,}/.test(trimmedAddress)) {
            return { valid: false, error: 'Адрес содержит множественные пробелы' };
        }

        return { valid: true, error: null };
    }

    /**
     * Обновление адреса заказа
     */
    async updateOrderAddress(orderId, newAddress) {
        // Валидация адреса
        const validation = this.validateAddress(newAddress);
        if (!validation.valid) {
            this.showNotification(`❌ ${validation.error}`, 'error');
            return false;
        }

        try {
            const response = await fetch(`/api/orders/${orderId}/address`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ address: newAddress.trim() })
            });
            
            if (response.ok) {
                console.log('Order address updated:', newAddress);
                
                // Показываем уведомление
                this.showNotification('✅ Адрес заказа обновлен!', 'success');
                
                // Обновляем локальные данные
                const order = this.orders.find(o => o.id === orderId);
                if (order) {
                    order.address = newAddress.trim();
                }
                
                // Обновляем таблицу
                this.updateOrdersTable();
                
                // Закрываем и переоткрываем модальное окно для обновления
                document.querySelector('.modal-overlay')?.remove();
                setTimeout(() => this.showOrderDetails(orderId), 300);
                
                return true;
            } else {
                this.showNotification('❌ Ошибка при обновлении адреса', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error updating order address:', error);
            this.showNotification('❌ Ошибка соединения с сервером', 'error');
            return false;
        }
    }

    /**
     * Переключение режима редактирования адреса
     */
    toggleAddressEdit(orderId) {
        const displayDiv = document.getElementById(`address-display-${orderId}`);
        const editDiv = document.getElementById(`address-edit-${orderId}`);
        
        if (displayDiv && editDiv) {
            displayDiv.style.display = 'none';
            editDiv.style.display = 'block';
            
            // Фокусируемся на поле ввода
            const input = document.getElementById(`address-input-${orderId}`);
            if (input) {
                input.focus();
                input.select();
            }
        }
    }

    /**
     * Отмена редактирования адреса
     */
    cancelAddressEdit(orderId) {
        const displayDiv = document.getElementById(`address-display-${orderId}`);
        const editDiv = document.getElementById(`address-edit-${orderId}`);
        
        if (displayDiv && editDiv) {
            displayDiv.style.display = 'block';
            editDiv.style.display = 'none';
            
            // Возвращаем исходное значение
            const input = document.getElementById(`address-input-${orderId}`);
            const order = this.orders.find(o => o.id === orderId);
            if (input && order) {
                input.value = order.address || '';
            }
        }
    }

    /**
     * Сохранение адреса заказа
     */
    async saveOrderAddress(orderId) {
        const input = document.getElementById(`address-input-${orderId}`);
        if (!input) return;
        
        const newAddress = input.value.trim();
        
        // Валидация адреса
        const validation = this.validateAddress(newAddress);
        if (!validation.valid) {
            this.showNotification(`❌ ${validation.error}`, 'error');
            return;
        }
        
        // Обновляем адрес
        const success = await this.updateOrderAddress(orderId, newAddress);
        if (success) {
            // Переключаем обратно в режим просмотра
            this.cancelAddressEdit(orderId);
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideIn 0.3s ease-out;
            ${type === 'success' ? 'background: #16a34a;' : ''}
            ${type === 'error' ? 'background: #dc2626;' : ''}
            ${type === 'info' ? 'background: #2563eb;' : ''}
        `;
        notification.textContent = message;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styleSheet);
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    filterOrders(filter) {
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active', 'btn-primary');
            btn.classList.add('btn-secondary');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active', 'btn-primary');
        document.querySelector(`[data-filter="${filter}"]`).classList.remove('btn-secondary');
        
        // Filter orders
        const filteredOrders = filter === 'all' ? this.orders : this.orders.filter(order => order.status === filter);
        
        const tbody = document.querySelector('#ordersTable tbody');
        let html = '';
        
        filteredOrders.forEach(order => {
            html += `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.client}</td>
                    <td>${order.channel}</td>
                    <td>${order.courier}</td>
                    <td>${order.eta}</td>
                    <td>₽ ${order.amount}</td>
                    <td><span class="status-badge status-${order.status.replace(' ', '-')}">${order.status}</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }
    
    async importExcel(file) {
        if (!file) return;
        
        if (typeof XLSX === 'undefined') {
            alert('Библиотека для чтения Excel не загружена. Попробуйте обновить страницу.');
            return;
        }
        
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Проверяем, что workbook содержит листы
            if (!workbook || !workbook.SheetNames || !Array.isArray(workbook.SheetNames) || workbook.SheetNames.length === 0) {
                alert('Файл не содержит листов или поврежден. Убедитесь, что это корректный Excel файл.');
                return;
            }
            
            // Берем первый лист
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            if (!worksheet) {
                alert(`Не удалось прочитать данные из листа "${firstSheetName}".`);
                return;
            }
            
            // Конвертируем в JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            
            if (jsonData.length < 2) {
                alert("Excel файл пустой или содержит только заголовки");
                return;
            }
            
            // Первая строка - заголовки
            const header = jsonData[0].map(h => String(h || '').trim().toLowerCase());
            const idx = (k) => {
                const lower = k.toLowerCase();
                return header.findIndex(h => h === lower || h.includes(lower));
            };
            
            // Поиск индексов колонок (поддержка разных названий)
            const iType = idx("type") >= 0 ? idx("type") : idx("тип");
            const iName = idx("name") >= 0 ? idx("name") : idx("название") >= 0 ? idx("название") : idx("блюдо");
            const iCat = idx("category") >= 0 ? idx("category") : idx("категория");
            const iPrice = idx("price") >= 0 ? idx("price") : idx("цена");
            const iCost = idx("cost") >= 0 ? idx("cost") : idx("себестоимость");
            const iDesc = idx("desc") >= 0 ? idx("desc") : idx("description") >= 0 ? idx("description") : idx("описание");
            const iMods = idx("mods") >= 0 ? idx("mods") : idx("modifiers") >= 0 ? idx("modifiers") : idx("модификаторы");
            const iAlrg = idx("alrg") >= 0 ? idx("alrg") : idx("allergens") >= 0 ? idx("allergens") : idx("аллергены");
            const iNut = idx("nutrition") >= 0 ? idx("nutrition") : idx("nutritional") >= 0 ? idx("nutritional") : idx("калории");
            const iSku = idx("sku") >= 0 ? idx("sku") : idx("артикул");
            const iPhoto = idx("photo") >= 0 ? idx("photo") : idx("picture") >= 0 ? idx("picture") : idx("изображение") >= 0 ? idx("изображение") : idx("фото");
            const iWeight = idx("weight") >= 0 ? idx("weight") : idx("вес");
            
            const newDishes = [];
            const newProducts = [];
            
            // Обрабатываем строки начиная со второй
            for (let li = 1; li < jsonData.length; li++) {
                const row = jsonData[li];
                if (!row || row.length === 0) continue;
                
                const type = iType >= 0 && row[iType] ? String(row[iType] || '').trim().toLowerCase() : 'dish';
                const name = iName >= 0 && row[iName] ? String(row[iName] || '').trim() : '';
                
                if (!name) continue;
                
                const cat = iCat >= 0 && row[iCat] ? String(row[iCat] || '').trim() : 'Прочее';
                const price = iPrice >= 0 && row[iPrice] ? parseFloat(String(row[iPrice]).replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;
                const cost = iCost >= 0 && row[iCost] ? parseFloat(String(row[iCost]).replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;
                const photo = iPhoto >= 0 && row[iPhoto] ? String(row[iPhoto] || '').trim() : '';
                const weight = iWeight >= 0 && row[iWeight] ? String(row[iWeight] || '').trim() : '';
                
                if (type === 'product' || type === 'товар') {
                    const sku = iSku >= 0 && row[iSku] ? String(row[iSku] || '').trim() : `SKU-${Date.now()}-${li}`;
                    newProducts.push({ 
                        id: String(Date.now() + li), 
                        name, 
                        cat, 
                        price, 
                        cost, 
                        sku, 
                        photo,
                        weight 
                    });
                } else {
                    const desc = iDesc >= 0 && row[iDesc] ? String(row[iDesc] || '').trim() : '';
                    
                    // ✅ УЛУЧШЕННЫЙ ПАРСИНГ МОДИФИКАТОРОВ: поддержка формата lpmotor "30см:0|35см:150|40см:250"
                    let mods = [];
                    if (iMods >= 0 && row[iMods]) {
                        const modsValue = String(row[iMods] || '').trim();
                        if (modsValue && modsValue.length > 0) {
                            mods = modsValue
                                .split(/[\|,;]/)  // Разделители: | или , или ;
                                .map(s => s.trim())
                                .filter(s => s.length > 0)
                                .map(m => {
                                    // Если есть формат "название:цена" (lpmotor)
                                    if (m.includes(':')) {
                                        const [modName, modPrice] = m.split(':').map(s => s.trim());
                                        return {
                                            name: modName,
                                            price: parseFloat(modPrice) || 0,
                                            default: false
                                        };
                                    }
                                    // Просто название модификатора
                                    return {
                                        name: m,
                                        price: 0,
                                        default: false
                                    };
                                });
                            
                            // Первый модификатор по умолчанию
                            if (mods.length > 0) {
                                mods[0].default = true;
                            }
                        }
                    }
                    
                    const alrg = iAlrg >= 0 && row[iAlrg] ? String(row[iAlrg] || '').trim() : '';
                    const nutrition = iNut >= 0 && row[iNut] ? String(row[iNut] || '').trim() : '';
                    
                    newDishes.push({ 
                        id: String(Date.now() + li), 
                        name, 
                        cat, 
                        category: cat,
                        price, 
                        cost, 
                        desc, 
                        description: desc,
                        mods, 
                        alrg, 
                        nutrition, 
                        photo,
                        picture: photo,
                        weight 
                    });
                }
            }
            
            if (newDishes.length) {
                this.dishes.push(...newDishes);
            }
            if (newProducts.length) {
                this.products.push(...newProducts);
            }
            
            // Сохраняем в localStorage
            this.saveDishesToServer();
            
            alert(`✅ Импортировано: блюд ${newDishes.length}, товаров ${newProducts.length}`);
            this.updateMenuTable();
            
        } catch (error) {
            console.error('Ошибка импорта Excel:', error);
            alert(`Ошибка импорта Excel: ${error.message}`);
        }
    }
    
    importCSV(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                
                if (lines.length < 2) {
                    alert("CSV пустой");
                    return;
                }
                
                const header = lines[0].split(",").map(h => h.trim().toLowerCase());
                const idx = (k) => {
                    const index = header.indexOf(k);
                    // Также ищем альтернативные варианты названий
                    if (index === -1) {
                        // Попытка найти похожие названия
                        const lowerK = k.toLowerCase();
                        if (lowerK === 'name' || lowerK === 'название') {
                            const altIndex = header.findIndex(h => 
                                h.includes('название') || h.includes('name') || 
                                h === 'значение' || h === 'value'
                            );
                            if (altIndex !== -1) return altIndex;
                        }
                        if (lowerK === 'type' || lowerK === 'тип') {
                            const altIndex = header.findIndex(h => h.includes('тип') || h.includes('type'));
                            if (altIndex !== -1) return altIndex;
                        }
                        if (lowerK === 'category' || lowerK === 'категория') {
                            const altIndex = header.findIndex(h => h.includes('категория') || h.includes('category'));
                            if (altIndex !== -1) return altIndex;
                        }
                    }
                    return index;
                };
                
                const iType = idx("type");
                const iName = idx("name");
                const iCat = idx("category");
                const iPrice = idx("price");
                const iCost = idx("cost");
                const iDesc = idx("desc");
                const iMods = idx("mods");
                const iAlrg = idx("alrg");
                const iNut = idx("nutrition");
                const iSku = idx("sku");
                const iPhoto = idx("photo");
                
                // Проверяем обязательные колонки
                if (iName === -1) {
                    alert("❌ ОШИБКА: Не найдена колонка 'name' (название).\nПроверьте заголовки CSV файла.");
                    console.error("Заголовки CSV:", header);
                    return;
                }
                
                const newDishes = [];
                const newProducts = [];
                
                for (let li = 1; li < lines.length; li++) {
                    try {
                        const raw = lines[li].split(",");
                        
                        // Безопасное получение значений с проверкой индекса
                        const getValue = (index, defaultValue = "") => {
                            if (index === -1) return defaultValue;
                            const val = raw[index];
                            return (val !== undefined && val !== null) ? String(val).trim() : defaultValue;
                        };
                        
                        const type = iType >= 0 ? getValue(iType, "dish").toLowerCase() : "dish";
                        const name = getValue(iName);
                        
                        // Пропускаем строки без названия
                        if (!name || name.length === 0) {
                            console.warn(`Строка ${li + 1}: пропущена (нет названия)`);
                            continue;
                        }
                        
                        const cat = getValue(iCat, "Прочее");
                        const price = iPrice >= 0 ? Number(getValue(iPrice, "0")) || 0 : 0;
                        const cost = iCost >= 0 ? Number(getValue(iCost, "0")) || 0 : 0;
                        const photo = getValue(iPhoto, "");
                        
                        if (type === "product") {
                            const sku = getValue(iSku) || `SKU-${Date.now()}-${li}`;
                            newProducts.push({ id: Date.now() + li, name, cat, price, cost, sku, photo });
                        } else {
                            const desc = getValue(iDesc, "");
                            
                            // ✅ УЛУЧШЕННАЯ ОБРАБОТКА МОДИФИКАТОРОВ - поддержка формата lpmotor с ценами
                            let mods = [];
                            if (iMods >= 0 && raw[iMods]) {
                                const modsStr = String(raw[iMods]).trim();
                                if (modsStr && modsStr.length > 0) {
                                    // Разделяем по запятой, точке с запятой или трубе (без \n, так как в CSV это обычно не нужно)
                                    mods = modsStr
                                        .split(/[\|,;]/)  // Убрали \n из разделителей
                                        .map(s => s.trim())
                                        .filter(s => s.length > 0)
                                        .map(m => {
                                            // Если есть формат "название:цена" (lpmotor формат)
                                            if (m.includes(':')) {
                                                const [modName, modPrice] = m.split(':').map(s => s.trim());
                                                return {
                                                    name: modName,
                                                    price: parseFloat(modPrice) || 0,
                                                    default: false
                                                };
                                            }
                                            // Просто название модификатора
                                            return {
                                                name: m,
                                                price: 0,
                                                default: false
                                            };
                                        });
                                    
                                    // Первый модификатор по умолчанию
                                    if (mods.length > 0) {
                                        mods[0].default = true;
                                    }
                                }
                            }
                            
                            // ✅ ПАРСИНГ АЛЛЕРГЕНОВ: формат "глютен|молоко|яйца"
                            let alrg = '';
                            if (iAlrg >= 0 && raw[iAlrg]) {
                                const alrgValue = String(raw[iAlrg] || '').trim();
                                if (alrgValue && alrgValue.length > 0) {
                                    alrg = alrgValue.split(/[\|,;]/)
                                        .map(a => a.trim())
                                        .filter(a => a.length > 0)
                                        .join('|');
                                }
                            }
                            
                            // ✅ ПАРСИНГ ПИТАТЕЛЬНОСТИ: формат "калории:250|белки:12|жиры:10|углеводы:30"
                            let nutrition = '';
                            if (iNut >= 0 && raw[iNut]) {
                                const nutValue = String(raw[iNut] || '').trim();
                                if (nutValue && nutValue.length > 0) {
                                    const nutritionObj = {};
                                    nutValue.split(/[\|,;]/).forEach(pair => {
                                        const [key, val] = pair.split(':').map(s => s.trim());
                                        if (key && val) {
                                            nutritionObj[key.toLowerCase()] = val;
                                        }
                                    });
                                    nutrition = Object.keys(nutritionObj).length > 0 ? JSON.stringify(nutritionObj) : nutValue;
                                }
                            }
                            
                            newDishes.push({ id: Date.now() + li, name, cat, price, cost, desc, mods, alrg, nutrition, photo });
                        }
                    } catch (rowError) {
                        console.error(`Ошибка обработки строки ${li + 1}:`, rowError, lines[li]);
                        // Продолжаем обработку следующих строк
                    }
                }
                
                if (newDishes.length) {
                    this.dishes.push(...newDishes);
                }
                if (newProducts.length) {
                    this.products.push(...newProducts);
                }
                
                if (newDishes.length === 0 && newProducts.length === 0) {
                    alert("⚠️ Внимание: Не удалось импортировать ни одного товара.\n\n" +
                          "Проверьте:\n" +
                          "1. Правильность заголовков CSV\n" +
                          "2. Наличие колонки с названиями товаров\n" +
                          "3. Что строки не пустые");
                    return;
                }
                
                // Сохраняем в localStorage
                this.saveDishesToServer();
                
                alert(`✅ Импортировано успешно:\n- Блюд: ${newDishes.length}\n- Товаров: ${newProducts.length}`);
                this.updateMenuTable();
                
            } catch (error) {
                console.error("Ошибка импорта CSV:", error);
                alert(`❌ Ошибка разбора CSV:\n\n${error.message || 'Неизвестная ошибка'}\n\n` +
                      "Убедитесь, что:\n" +
                      "1. Используется запятая (,) как разделитель\n" +
                      "2. CSV файл имеет правильную структуру\n" +
                      "3. Все строки имеют одинаковое количество колонок\n\n" +
                      "Подробности в консоли (F12)");
            }
        };
        reader.readAsText(file, 'utf-8');
    }
    
    loadSampleCSV() {
        const sample = `type,name,category,price,cost,desc,mods,alrg,nutrition,sku,photo
dish,Маргарита 30 см,Пицца,349,160,Классика,Острый соус|Доп. сыр,молоко,б/ж/у,,,
dish,Калифорния,Роллы,429,210,Краб,Соус унаги|Кунжут,рыба,б/ж/у,,,
product,Кола 0.5,Напитки,120,40,Газ.напиток,,, ,COLA-05,`;
        
        const blob = new Blob([sample], { type: 'text/csv' });
        const file = new File([blob], 'sample.csv');
        this.importCSV(file);
    }
    
    async loadAllProducts() {
        try {
            const response = await fetch('/menu_data.json');
            const data = await response.json();
            
            // Конвертируем данные из menu_data.json в формат админки
            this.dishes = data.offers.map(item => ({
                id: parseInt(item.id),
                name: item.name,
                cat: item.category_name,
                price: parseInt(item.price),
                cost: Math.round(parseInt(item.price) * 0.4), // Примерная себестоимость 40%
                desc: item.description ? item.description.replace(/<[^>]*>/g, '') : '', // Убираем HTML теги
                mods: [],
                alrg: '',
                nutrition: '',
                photo: item.picture || ''
            }));
            
            console.log('Загружено блюд:', this.dishes.length);
            this.updateMenuTable();
        } catch (error) {
            console.error('Ошибка загрузки продуктов:', error);
            // Fallback на демо данные
            this.loadSampleData();
        }
    }
    
    loadSampleData() {
        // Add some sample data if needed
        console.log('Sample data loaded');
    }
    
    async loadPageData(page) {
        console.log('🚀 loadPageData called for page:', page);
        console.log('🔍 Debug: page type:', typeof page);
        console.log('🔍 Debug: page value:', JSON.stringify(page));
        console.log('🔍 Debug: page === "account-rules":', page === 'account-rules');
        
        // Специальная обработка для account-rules ДО switch (на случай если switch не сработает)
        if (page === 'account-rules') {
            console.log('🎯 ACCOUNT-RULES DETECTED! Processing...');
            try {
                const accountRulesPage = document.getElementById('account-rules');
                const accountRulesContainer = document.getElementById('accountRulesContent');
                
                console.log('🔍 Debug: accountRulesPage found:', !!accountRulesPage);
                console.log('🔍 Debug: accountRulesContainer found:', !!accountRulesContainer);
                
                if (accountRulesPage && accountRulesContainer) {
                    // Показываем страницу
                    if (accountRulesPage.style.display === 'none') {
                        accountRulesPage.style.display = 'block';
                    }
                    if (!accountRulesPage.classList.contains('active')) {
                        accountRulesPage.classList.add('active');
                    }
                    
                    // Показываем индикатор загрузки
                    accountRulesContainer.innerHTML = '<div style="padding: 2rem; text-align: center;"><p>⏳ Загрузка планов счетов...</p></div>';
                    
                    // Инициализируем модуль
                    if (window.accountRulesManager) {
                        console.log('✅ AccountRulesManager found, calling init()...');
                        try {
                            await window.accountRulesManager.init();
                            console.log('✅ AccountRulesManager initialized successfully');
                        } catch (error) {
                            console.error('❌ Error in init():', error);
                            accountRulesContainer.innerHTML = `
                                <div style="padding: 2rem; text-align: center;">
                                    <h3>❌ Ошибка инициализации</h3>
                                    <p>${error.message || 'Неизвестная ошибка'}</p>
                                    <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 1rem;">Обновить страницу</button>
                                </div>
                            `;
                        }
                    } else if (window.AccountRulesManager) {
                        console.log('⚠️ Creating new instance...');
                        window.accountRulesManager = new window.AccountRulesManager();
                        await window.accountRulesManager.init();
                        console.log('✅ AccountRulesManager created and initialized');
                    } else {
                        console.error('❌ AccountRulesManager not found!');
                        accountRulesContainer.innerHTML = `
                            <div style="padding: 2rem; text-align: center;">
                                <h3>⚠️ Модуль не загружен</h3>
                                <p>Попробуйте обновить страницу (F5)</p>
                            </div>
                        `;
                    }
                    return; // Выходим, не заходя в switch
                } else {
                    console.error('❌ Page or container not found!');
                }
            } catch (error) {
                console.error('❌ Error in account-rules handler:', error);
            }
        }
        
        try {
            // Ленивая загрузка модулей - инициализируем только нужный модуль
            console.log('🔍 Debug: Entering switch statement, page =', page);
            switch(page) {
                case 'account-rules':
                    console.log('📊 Loading account rules page...');
                    console.log('🔍 Debug: Entered account-rules case');
                    // Убеждаемся, что контейнер видим
                    const accountRulesPage = document.getElementById('account-rules');
                    const accountRulesContainer = document.getElementById('accountRulesContent');
                    
                    console.log('🔍 Debug: accountRulesPage found:', !!accountRulesPage);
                    console.log('🔍 Debug: accountRulesContainer found:', !!accountRulesContainer);
                    
                    if (!accountRulesPage) {
                        console.error('❌ Page #account-rules not found!');
                        console.error('🔍 Debug: Available page elements:', Array.from(document.querySelectorAll('.page-content')).map(el => el.id));
                        break;
                    }
                    
                    if (!accountRulesContainer) {
                        console.error('❌ Container #accountRulesContent not found!');
                        console.error('Available elements:', {
                            page: accountRulesPage,
                            pageVisible: accountRulesPage?.style.display,
                            container: accountRulesContainer
                        });
                        console.error('🔍 Debug: Available elements with "account" in id:', 
                            Array.from(document.querySelectorAll('[id*="account"]')).map(el => el.id));
                        break;
                    }
                    
                    console.log('🔍 Debug: Both page and container found, continuing...');
                    
                    // Показываем страницу, если она скрыта
                    if (accountRulesPage.style.display === 'none') {
                        accountRulesPage.style.display = 'block';
                    }
                    
                    // Убеждаемся, что страница имеет класс active
                    if (!accountRulesPage.classList.contains('active')) {
                        accountRulesPage.classList.add('active');
                        console.log('✅ Added active class to account-rules page');
                    }
                    
                    // Показываем индикатор загрузки
                    accountRulesContainer.innerHTML = '<div style="padding: 2rem; text-align: center;"><p>⏳ Загрузка планов счетов...</p></div>';
                    
                    console.log('🔍 Debug: window.accountRulesManager =', window.accountRulesManager);
                    console.log('🔍 Debug: window.AccountRulesManager =', window.AccountRulesManager);
                    
                    // Пытаемся инициализировать модуль
                    (async () => {
                        try {
                            console.log('🔍 Debug: Checking for AccountRulesManager...');
                            console.log('🔍 Debug: window.accountRulesManager =', window.accountRulesManager);
                            console.log('🔍 Debug: window.AccountRulesManager =', window.AccountRulesManager);
                            
                            if (window.accountRulesManager) {
                                console.log('✅ AccountRulesManager found, initializing...');
                                console.log('🔍 Debug: accountRulesManager type:', typeof window.accountRulesManager);
                                console.log('🔍 Debug: accountRulesManager.init type:', typeof window.accountRulesManager.init);
                                console.log('🔍 Debug: Container exists:', !!accountRulesContainer);
                                console.log('🔍 Debug: Container parent page:', accountRulesPage?.id);
                                console.log('🔍 Debug: Container parent has active class:', accountRulesPage?.classList.contains('active'));
                                
                                if (typeof window.accountRulesManager.init === 'function') {
                                    console.log('🔍 Debug: Calling init()...');
                                    const initPromise = window.accountRulesManager.init();
                                    console.log('🔍 Debug: init() called, waiting for promise...');
                                    await initPromise;
                                    console.log('✅ AccountRulesManager initialized successfully');
                                    
                                    // Проверяем, что контент отрендерился
                                    setTimeout(() => {
                                        const contentLength = accountRulesContainer.innerHTML.length;
                                        console.log('🔍 Debug: Container content length after init:', contentLength);
                                        if (contentLength < 100) {
                                            console.warn('⚠️ Container content seems empty, forcing render...');
                                            if (window.accountRulesManager && typeof window.accountRulesManager.render === 'function') {
                                                window.accountRulesManager.render();
                                            }
                                        }
                                    }, 500);
                                } else {
                                    console.error('❌ accountRulesManager.init is not a function!');
                                    accountRulesContainer.innerHTML = `
                                        <div style="padding: 2rem; text-align: center;">
                                            <h3>❌ Ошибка инициализации</h3>
                                            <p>Метод init() не найден в модуле</p>
                                            <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 1rem;">Обновить страницу</button>
                                        </div>
                                    `;
                                }
                            } else if (window.AccountRulesManager) {
                                console.log('⚠️ accountRulesManager not found, but AccountRulesManager class exists. Creating instance...');
                                window.accountRulesManager = new window.AccountRulesManager();
                                console.log('✅ Instance created, initializing...');
                                await window.accountRulesManager.init();
                                console.log('✅ AccountRulesManager created and initialized successfully');
                            } else {
                                console.warn('⚠️ AccountRulesManager not found, waiting...');
                                // Ждем загрузки модуля
                                let attempts = 0;
                                const maxAttempts = 10;
                                const checkInterval = setInterval(() => {
                                    attempts++;
                                    if (window.accountRulesManager) {
                                        clearInterval(checkInterval);
                                        console.log('✅ AccountRulesManager loaded, initializing...');
                                        window.accountRulesManager.init().catch(err => {
                                            console.error('❌ Error initializing AccountRulesManager:', err);
                                        });
                                    } else if (attempts >= maxAttempts) {
                                        clearInterval(checkInterval);
                                        console.error('❌ AccountRulesManager not available after waiting');
                                        console.error('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('account')));
                                        accountRulesContainer.innerHTML = `
                                            <div style="padding: 2rem; text-align: center;">
                                                <h3>⚠️ Модуль не загружен</h3>
                                                <p>Попробуйте обновить страницу (F5)</p>
                                                <p style="color: #999; font-size: 0.9rem;">Если проблема сохраняется, проверьте консоль браузера</p>
                                                <p style="color: #999; font-size: 0.9rem; margin-top: 1rem;">Проверьте, что файл modules/admin-account-rules.js загружен</p>
                                            </div>
                                        `;
                                    }
                                }, 100);
                            }
                        } catch (error) {
                            console.error('❌ Error in account-rules initialization:', error);
                            if (accountRulesContainer) {
                                accountRulesContainer.innerHTML = `
                                    <div style="padding: 2rem; text-align: center;">
                                        <h3>❌ Ошибка загрузки модуля</h3>
                                        <p>${error.message || 'Неизвестная ошибка'}</p>
                                        <p style="color: #999; font-size: 0.9rem;">Проверьте консоль браузера для деталей</p>
                                        <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 1rem;">Обновить страницу</button>
                                    </div>
                                `;
                            }
                        }
                    })(); // Вызываем IIFE немедленно
                    break;
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'menu':
                // Загружаем данные с сервера при открытии вкладки
                if (!(await this.loadDishesFromAPI())) {
                    // Если данных нет на сервере, пытаемся загрузить из API
                    this.updateMenuTable();
                }
                break;
            case 'product-cards':
                this.updateProductCards();
                break;
            case 'modifiers':
                if (window.modifiersManager) {
                    window.modifiersManager.init();
                }
                break;
            case 'product-groups':
                if (window.productGroupsManager) {
                    window.productGroupsManager.init();
                } else {
                    console.warn('ProductGroupsManager not loaded');
                }
                break;
            case 'data-import':
                console.log('📥 Calling updateDataImport()...');
                try {
                    this.updateDataImport();
                } catch (error) {
                    console.error('❌ Error in updateDataImport():', error);
                }
                break;
            case 'advanced-import':
                if (window.advancedImportManager) {
                    window.advancedImportManager.init();
                } else {
                    console.warn('AdvancedImportManager not loaded');
                }
                break;
            case 'recipes':
                this.updateRecipes();
                break;
            case 'promotions':
                this.updatePromotionsNew();
                break;
            case 'loyalty':
                await this.updateLoyalty();
                break;
            case 'orders':
                this.updateOrdersTable();
                break;
            case 'kds':
                this.updateKDS();
                break;
            case 'stock':
                this.updateStock();
                // Инициализируем модуль импорта остатков
                if (window.stockImportManager) {
                    window.stockImportManager.init();
                }
                break;
            case 'cashier-report':
                this.updateCashierReportNew();
                break;
            case 'pos':
                this.updatePOS();
                break;
            case 'edo':
                this.updateEDO();
                break;
            case 'mercury':
                this.updateMercury();
                break;
            case 'honest':
                this.updateHonest();
                break;
            case 'egais':
                this.updateEGAIS();
                break;
            case 'couriers':
                console.log('Loading couriers page...');
                this.updateCouriers();
                break;
            case 'inventory':
                console.log('Loading inventory page...');
                this.updateInventory();
                break;
            case 'pricing':
                console.log('Loading pricing page...');
                this.updatePricing();
                break;
            case 'marketing':
                console.log('Loading marketing page...');
                this.updateMarketing();
                break;
            case 'integrations':
                console.log('Loading integrations page...');
                this.updateIntegrations();
                break;
            case 'onec-integration':
                if (window.onecIntegrationManager) {
                    window.onecIntegrationManager.init();
                } else {
                    console.warn('OneCIntegrationManager not loaded');
                }
                break;
            case 'reports':
                this.updateReports();
                break;
            case 'alerts':
                this.updateAlerts();
                break;
            case 'profile':
                this.updateProfile();
                break;
            default:
                console.log('🔍 Debug: No case matched for page:', page);
                break;
        }
        } catch (error) {
            console.error('❌ Error in loadPageData for page', page, ':', error);
            console.error('❌ Error stack:', error.stack);
        }
    }
    
    updateDashboard() {
        // Dashboard is already static in HTML
    }
    
    updateKDS() {
        // Инициализируем новый KDS модуль
        if (window.initKDS) {
            window.initKDS();
        }
    }
    
    updateStock() {
        // Инициализируем новый модуль складского учёта
        console.log('Loading warehouse management module...');
        if (window.warehouseModule) {
            window.warehouseModule.init();
        } else {
            console.error('WarehouseModule not found');
        }
    }

    updateCashierReport() {
        // Cashier report is already static in HTML
    }

    updateCashierReportNew() {
        console.log('Loading cashier report module...');
        if (window.cashierReportModule) {
            window.cashierReportModule.init();
        } else {
            console.error('Cashier report module not found');
        }
    }

    // ===== POS =====
    updatePOS() {
        if (window.adminModules) {
            const posElement = document.getElementById('posContent');
            if (posElement) {
                posElement.innerHTML = adminModules.createPOSContent();
            }
        }
    }

    // ===== EDO =====
    updateEDO() {
        // EDO is already static in HTML
    }

    // ===== Mercury =====
    updateMercury() {
        // Mercury is already static in HTML
    }

    // ===== HonestSign =====
    updateHonest() {
        console.log('Loading Honest Sign page...');
        if (window.honestSignDashboard) {
            window.honestSignDashboard.init();
        } else {
            console.log('honestSignDashboard not found');
        }
    }

    // ===== EGAIS =====
    updateEGAIS() {
        console.log('Loading EGAIS page...');
        if (window.egaisDashboard) {
            window.egaisDashboard.init();
        } else {
            console.log('egaisDashboard not found');
        }
    }

    // ===== Карточки товаров =====
    async updateProductCards() {
        console.log('Loading product cards page...');
        if (window.ProductCardsManager) {
            await window.ProductCardsManager.render();
        } else {
            console.error('ProductCardsManager not found');
        }
    }

    // ===== Импорт данных =====
    updateDataImport() {
        console.log('📥 Loading data import page...');
        console.log('📥 window.dataImportModule exists:', typeof window.dataImportModule !== 'undefined');
        console.log('📥 window.dataImportModule:', window.dataImportModule);
        
        const root = document.getElementById('dataImportRoot');
        if (!root) {
            console.error('❌ dataImportRoot element not found!');
            return;
        }
        console.log('✅ dataImportRoot element found');
        
        // Инициализируем модуль импорта если он доступен
        if (window.dataImportModule) {
            if (typeof window.dataImportModule.init === 'function') {
                console.log('🚀 Initializing dataImportModule...');
                try {
                    const result = window.dataImportModule.init();
                    if (result) {
                        console.log('✅ DataImportModule initialized successfully');
                    } else {
                        console.warn('⚠️ DataImportModule.init() returned false');
                    }
                } catch (error) {
                    console.error('❌ Error initializing DataImportModule:', error);
                }
            } else {
                console.warn('⚠️ dataImportModule.init() function missing!');
                console.log('📥 Available methods:', Object.keys(window.dataImportModule));
                console.log('📥 Module version on server is OLD - need to update modules/data-import-module.js?v=3');
                
                // Временное решение: попробуем вызвать render напрямую
                if (typeof window.dataImportModule.render === 'function') {
                    console.log('🔄 Trying to call render() directly...');
                    try {
                        window.dataImportModule.render();
                        console.log('✅ Render called successfully');
                    } catch (error) {
                        console.error('❌ Error calling render():', error);
                    }
                } else {
                    if (root) {
                        root.innerHTML = `
                            <div class="card">
                                <h3 class="card-title">📥 Импорт и распознавание данных</h3>
                                <p style="color:#dc2626; font-weight:600;">⚠️ Модуль импорта загружен, но версия устарела!</p>
                                <p style="color:#666;">Нужно обновить файл <code>modules/data-import-module.js</code> на сервере до версии 3.</p>
                                <p style="color:#999; font-size:0.9rem; margin-top:0.5rem;">Текущая версия файла не содержит метод init().</p>
                                <p style="color:#999; font-size:0.9rem;">Доступные методы: ${Object.keys(window.dataImportModule).join(', ')}</p>
                            </div>
                        `;
                    }
                }
            }
        } else {
            console.warn('⚠️ dataImportModule not found');
            if (root) {
                root.innerHTML = `
                    <div class="card">
                        <h3 class="card-title">📥 Импорт и распознавание данных</h3>
                        <p style="color:#666;">Модуль импорта не загружен. Проверьте, что файл modules/data-import-module.js загружен на сервере.</p>
                        <p style="color:#999; font-size:0.9rem; margin-top:0.5rem;">Проверь консоль (F12) для деталей.</p>
                    </div>
                `;
            }
        }
    }

    // ===== Техкарты =====
    updateRecipes() {
        console.log('Loading recipes management module...');
        if (window.recipesModule) {
            window.recipesModule.init();
        } else {
            console.error('Recipes module not found');
        }
    }

    // ===== Курьеры =====
    updateCouriers() {
        console.log('Loading couriers management module...');
        if (window.couriersModule) {
            window.couriersModule.init();
        } else {
            console.error('CouriersModule not found');
        }
    }

    // ===== Инвентаризация =====
    updateInventory() {
        console.log('updateInventory called');
        if (window.inventoryModule) {
            window.inventoryModule.init();
        } else {
            console.log('inventoryModule not found, trying to initialize...');
            // Попробуем инициализировать модуль
            setTimeout(() => {
                if (window.inventoryModule) {
                    window.inventoryModule.init();
                } else {
                    console.error('inventoryModule still not found after timeout');
                }
            }, 100);
        }
    }

    // ===== Пересчёт цен =====
    updatePricing() {
        console.log('Loading pricing page...');
        if (window.pricingModule) {
            window.pricingModule.init();
        } else {
            console.log('pricingModule not found');
        }
    }

    // ===== ЭДО =====
    updateEDO() {
        console.log('Loading EDO page...');
        if (window.edoModule) {
            window.edoModule.init();
        } else {
            console.log('edoModule not found');
        }
    }

    // ===== Меркурий =====
    updateMercury() {
        console.log('Loading Mercury page...');
        if (window.mercuryModule) {
            window.mercuryModule.init();
        } else {
            console.log('mercuryModule not found');
        }
    }

    // ===== Маркетинг =====
    updateMarketing() {
        console.log('Loading marketing page...');
        if (window.marketingModule) {
            window.marketingModule.init();
        } else {
            console.log('marketingModule not found');
        }
    }

    // ===== Интеграции =====
    updateIntegrations() {
        if (window.initIntegrations) {
            window.initIntegrations();
        } else if (window.adminModules) {
            window.adminModules.updateIntegrationsContent();
        }
    }

    // ===== Отчётность =====
    updateReports() {
        console.log('📊 Loading Reports Module...');
        if (window.initReports) {
            window.initReports();
        } else {
            console.error('Reports module (initReports) not found');
        }
    }

    // ===== Уведомления =====
    updateAlerts() {
        console.log('🔔 Loading Alerts Module...');
        if (window.initAlerts) {
            window.initAlerts();
        } else {
            console.error('Alerts module (initAlerts) not found');
        }
    }

    // ===== Профиль =====
    updateProfile() {
        console.log('👤 Loading Profile Module...');
        if (window.initProfile) {
            window.initProfile();
        } else {
            console.error('Profile module (initProfile) not found');
        }
    }

    // ===== Language Content =====
    updateLanguageContent() {
        // Update all text content based on current language
        const translations = {
            ru: {
                dashboard: "Дашборд",
                menu: "Меню и товары",
                orders: "Заказы",
                kds: "KDS",
                stock: "Склад",
                "cashier-report": "Отчёт кассира",
                pos: "Касса/ККТ",
                edo: "ЭДО",
                mercury: "Меркурий",
                honest: "Честный знак",
                egais: "ЕГАИС",
                couriers: "Курьеры",
                inventory: "Инвентаризация",
                pricing: "Пересчёт цен",
                marketing: "Маркетинг",
                integrations: "Интеграции",
                reports: "Отчётность",
                alerts: "Уведомления",
                profile: "Профиль"
            },
            en: {
                dashboard: "Dashboard",
                menu: "Menu & Products",
                orders: "Orders",
                kds: "KDS",
                stock: "Stock",
                "cashier-report": "Cashier report",
                pos: "POS/Fiscal",
                edo: "EDO",
                mercury: "Mercury",
                honest: "HonestSign",
                egais: "EGAIS",
                couriers: "Couriers",
                inventory: "Inventory",
                pricing: "Repricing",
                marketing: "Marketing",
                integrations: "Integrations",
                reports: "Reports",
                alerts: "Alerts",
                profile: "Profile"
            }
        };
        
        const currentTranslations = translations[this.currentLang];
        
        document.querySelectorAll('.tab').forEach(item => {
            const page = item.dataset.page;
            if (currentTranslations[page]) {
                item.textContent = currentTranslations[page];
            }
        });
    }

    // ===== Orders Management =====
    async loadOrders() {
        try {
            const response = await fetch('/api/orders');
            if (response.ok) {
                const result = await response.json();
                // API возвращает {success: true, data: [...]}
                const orders = result.data || result || [];
                this.orders = orders.map(order => ({
                    id: order.id,
                    client: order.customerName || order.customer_name || 'Клиент',
                    phone: order.customerPhone || order.customer_phone || '',
                    amount: order.total || 0,
                    status: this.mapStatusToRussian(order.status),
                    channel: 'Сайт',
                    courier: '—',
                    eta: this.calculateETA(order.createdAt || order.created_at, order.status),
                    items: order.items || [],
                    address: order.address || '',
                    deliveryType: order.deliveryType || order.delivery_type || 'delivery',
                    paymentMethod: order.paymentMethod || order.payment_method || 'cash'
                }));
                this.updateOrdersTable();
            } else {
                console.error('Failed to load orders');
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    mapStatusToRussian(status) {
        const statusMap = {
            'accepted': 'принят',
            'preparing': 'готовится',
            'ready': 'готов',
            'with_courier': 'у курьера',
            'in_transit': 'в пути',
            'delivered': 'доставлен',
            'cancelled': 'отменен'
        };
        return statusMap[status] || status;
    }

    calculateETA(createdAt, status) {
        const orderTime = new Date(createdAt);
        const now = new Date();
        const elapsedMinutes = Math.floor((now - orderTime) / (1000 * 60));
        
        if (status === 'delivered') return '0';
        if (status === 'cancelled') return '—';
        
        const remainingTime = Math.max(0, 45 - elapsedMinutes);
        return remainingTime > 0 ? `${remainingTime} мин` : '—';
    }

    updateOrdersTable() {
        const tbody = document.querySelector('#ordersTable tbody');
        if (!tbody) return;

        tbody.innerHTML = this.orders.map(order => `
            <tr style="cursor: pointer;" onclick="admin.showOrderDetails('${order.id}')" title="Нажмите для просмотра деталей">
                <td><strong>${order.id}</strong></td>
                <td>
                    <div>${order.client}</div>
                    ${order.phone ? `<div style="font-size: 0.85em; color: #666;">${order.phone}</div>` : ''}
                </td>
                <td>${order.channel}</td>
                <td>${order.courier}</td>
                <td>${order.eta} мин</td>
                <td><strong>${order.amount} ₽</strong></td>
                <td>
                    <span class="status-badge status-${order.status.replace(' ', '_')}">
                        ${order.status}
                    </span>
                </td>
            </tr>
        `).join('');
    }
    
    searchItems(query) {
        const searchTerm = query.toLowerCase().trim();
        console.log('Поиск:', searchTerm); // Отладка
        
        // Переключаемся на страницу меню если мы не на ней
        if (this.currentPage !== 'menu') {
            this.switchPage('menu');
        }
        
        if (!searchTerm) {
            this.updateMenuTable();
            return;
        }
        
        const items = this.currentTab === 'dishes' ? this.dishes : this.products;
        console.log('Текущая вкладка:', this.currentTab, 'Товары:', items); // Отладка
        
        const filteredItems = items.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            item.cat.toLowerCase().includes(searchTerm) ||
            (item.desc && item.desc.toLowerCase().includes(searchTerm))
        );
        
        console.log('Найдено товаров:', filteredItems.length); // Отладка
        this.updateMenuTable(filteredItems);
        
        // Добавляем сообщение о результатах поиска
        this.showSearchResults(filteredItems.length, searchTerm);
    }
    
    getDefaultPromotions() {
        return [
            { 
                id: 1, 
                title: "Скидка 20% на все пиццы", 
                description: "Специальное предложение на все виды пиццы", 
                discount: 20, 
                startDate: "2024-01-01", 
                endDate: "2024-12-31", 
                photo: "", 
                isActive: true,
                products: ["Пепперони 30 см", "Маргарита 25 см", "4 Сыра 33 см"]
            },
            { 
                id: 2, 
                title: "Комбо со скидкой", 
                description: "Большое комбо для всей семьи со скидкой 15%", 
                discount: 15, 
                startDate: "2024-01-01", 
                endDate: "2024-12-31", 
                photo: "", 
                isActive: true,
                products: ["Комбо Семейный"]
            }
        ];
    }
    
    // Методы для работы с акциями
    createPromotion() {
        const title = prompt('Название акции:');
        if (!title) return;
        
        const description = prompt('Описание акции:');
        const discount = parseInt(prompt('Размер скидки (%):')) || 0;
        const startDate = prompt('Дата начала (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        const endDate = prompt('Дата окончания (YYYY-MM-DD):', new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]);
        
        const newPromotion = {
            id: Date.now(),
            title,
            description: description || '',
            discount,
            startDate,
            endDate,
            photo: '',
            isActive: true,
            products: []
        };
        
        this.promotions.push(newPromotion);
        this.updatePromotionsTable();
        this.savePromotions();
    }
    
    updatePromotionsNew() {
        console.log('Loading promotions management module...');
        if (window.promotionsModule) {
            window.promotionsModule.init();
        } else {
            console.error('Promotions module not found');
        }
    }

    updatePromotionsTable() {
        const container = document.getElementById('promotionsTable');
        if (!container) {
            return;
        }
        let html = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Фото</th>
                        <th>Название</th>
                        <th>Описание</th>
                        <th>Скидка</th>
                        <th>Период</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        this.promotions.forEach(promo => {
            const isActive = promo.isActive && 
                new Date(promo.startDate) <= new Date() && 
                new Date(promo.endDate) >= new Date();
            
            html += `
                <tr>
                    <td>${promo.photo ? `<img src="${promo.photo}" alt="фото" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">` : '—'}</td>
                    <td>${promo.title}</td>
                    <td>${promo.description}</td>
                    <td>${promo.discount}%</td>
                    <td>${promo.startDate} - ${promo.endDate}</td>
                    <td><span class="badge ${isActive ? 'badge-success' : 'badge-secondary'}">${isActive ? 'Активна' : 'Неактивна'}</span></td>
                    <td>
                        <button class="btn btn-primary btn-small" onclick="admin.editPromotion(${promo.id})">Редактировать</button>
                        <button class="btn btn-secondary btn-small" onclick="admin.deletePromotion(${promo.id})">Удалить</button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    }
    
    editPromotion(id) {
        const promo = this.promotions.find(p => p.id === id);
        if (!promo) return;
        
        const newTitle = prompt('Название акции:', promo.title);
        if (newTitle) promo.title = newTitle;
        
        const newDescription = prompt('Описание акции:', promo.description);
        if (newDescription !== null) promo.description = newDescription;
        
        const newDiscount = prompt('Размер скидки (%):', promo.discount);
        if (newDiscount) promo.discount = parseInt(newDiscount) || 0;
        
        this.updatePromotionsTable();
        this.savePromotions();
    }
    
    deletePromotion(id) {
        if (confirm('Удалить акцию?')) {
            this.promotions = this.promotions.filter(p => p.id !== id);
            this.updatePromotionsTable();
            this.savePromotions();
        }
    }
    
    exportPromotions() {
        const csv = this.promotions.map(promo => 
            `promotion,${promo.title},${promo.description},${promo.discount},${promo.startDate},${promo.endDate},${promo.isActive}`
        ).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'promotions.csv';
        a.click();
        URL.revokeObjectURL(url);
    }
    
    savePromotions() {
        this.setAdminStateKey('promotions', this.promotions).catch((error) => {
            console.warn('⚠️ Не удалось сохранить акции', error);
        });
    }
    
    async loadPromotions() {
        const fallback = this.getDefaultPromotions();
        const data = await this.getAdminStateKey('promotions', fallback);
        if (Array.isArray(data) && data.length > 0) {
            this.promotions = data;
            console.log('✅ Акции загружены из сервера:', this.promotions.length);
        } else {
            this.promotions = fallback;
            console.log('ℹ️ Используем акции по умолчанию');
        }
        this.updatePromotionsTable();
    }

    activatePromotion(promoId) {
        const promo = this.promotions.find(p => p.id === promoId);
        if (promo) {
            promo.isActive = !promo.isActive;
            console.log(`🎁 Акция "${promo.title}":`, promo.isActive ? 'Активирована ✅' : 'Деактивирована ⚠️');
            this.savePromotions();
            this.updatePromotionsTable();
            
            const message = promo.isActive 
                ? `✅ Акция "${promo.title}" активирована!\n\n⚠️ Проверь даты!\nСейчас: ${promo.startDate} - ${promo.endDate}\n\nОбнови главную страницу (Ctrl+Shift+R) чтобы увидеть изменения!`
                : `⚠️ Акция "${promo.title}" деактивирована!\n\nОбнови главную страницу (Ctrl+Shift+R) чтобы увидеть изменения!`;
            
            alert(message);
        }
    }
    
    showSearchResults(count, searchTerm) {
        // Удаляем предыдущее сообщение если есть
        const existingMessage = document.getElementById('searchResultsMessage');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        if (count === 0) {
            // Показываем сообщение "ничего не найдено"
            const message = document.createElement('div');
            message.id = 'searchResultsMessage';
            message.style.cssText = 'padding: 1rem; margin: 1rem 0; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; text-align: center;';
            message.innerHTML = `🔍 По запросу "<strong>${searchTerm}</strong>" ничего не найдено`;
            
            const menuTable = document.getElementById('menuTable');
            menuTable.parentNode.insertBefore(message, menuTable);
        } else {
            // Показываем количество найденных результатов
            const message = document.createElement('div');
            message.id = 'searchResultsMessage';
            message.style.cssText = 'padding: 0.5rem 1rem; margin: 1rem 0; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; color: #0369a1; text-align: center;';
            message.innerHTML = `🔍 Найдено <strong>${count}</strong> товаров по запросу "<strong>${searchTerm}</strong>"`;
            
            const menuTable = document.getElementById('menuTable');
            menuTable.parentNode.insertBefore(message, menuTable);
        }
    }
    
    async getAdminStateKey(key, fallback = null) {
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
            console.warn(`[AdminState] Не удалось загрузить ключ ${key}:`, error.message || error);
        }
        return fallback;
    }
    
    async setAdminStateKey(key, data) {
        try {
            const response = await fetch(`/api/admin-state/keys/${encodeURIComponent(key)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data })
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return true;
        } catch (error) {
            console.warn(`[AdminState] Не удалось сохранить ключ ${key}:`, error.message || error);
            throw error;
        }
    }
}

// Глобальная функция для генерации отчёта кассира
function generateCashierReport() {
    const cashier = document.getElementById('cashierSelect').value;
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    // Показываем результаты
    const resultsDiv = document.getElementById('cashierReportResults');
    const contentDiv = document.getElementById('cashierReportContent');
    
    resultsDiv.style.display = 'block';
    
    // Генерируем отчёт
    const reportData = {
        cashier: cashier,
        period: `${startDate} - ${endDate}`,
        totalOrders: 156,
        totalAmount: 89450,
        averageOrder: 573,
        cashOrders: 45,
        cardOrders: 111,
        refunds: 3,
        refundAmount: 1200
    };
    
    contentDiv.innerHTML = `
        <div class="grid grid-3">
            <div class="card">
                <h4>Общая статистика</h4>
                <p><strong>Заказов:</strong> ${reportData.totalOrders}</p>
                <p><strong>Сумма:</strong> ${reportData.totalAmount.toLocaleString()} ₽</p>
                <p><strong>Средний чек:</strong> ${reportData.averageOrder} ₽</p>
            </div>
            <div class="card">
                <h4>По типам оплаты</h4>
                <p><strong>Наличные:</strong> ${reportData.cashOrders} заказов</p>
                <p><strong>Карта:</strong> ${reportData.cardOrders} заказов</p>
            </div>
            <div class="card">
                <h4>Возвраты</h4>
                <p><strong>Количество:</strong> ${reportData.refunds}</p>
                <p><strong>Сумма:</strong> ${reportData.refundAmount} ₽</p>
            </div>
        </div>
        <div style="margin-top: 1rem;">
            <button class="btn btn-primary" onclick="exportCashierReport()">Экспорт в Excel</button>
            <button class="btn btn-secondary" onclick="printCashierReport()">Печать</button>
        </div>
    `;
}

function exportCashierReport() {
    alert('Отчёт экспортирован в Excel!');
}

function printCashierReport() {
    window.print();
}

// Функции для работы с кассой
function openPOS() {
    window.open('pos.html', '_blank');
}

function openPOSOrders() {
    window.open('pos.html', '_blank');
}

function openPOSReports() {
    window.open('pos.html', '_blank');
}

// Функции для быстрых действий в дашборде
function openShift() {
    alert('Смена открыта! Время: ' + new Date().toLocaleTimeString());
}

function createOrder() {
    // Переключаемся на раздел заказов
    if (window.admin) {
        admin.switchPage('orders');
    }
}

function openInventory() {
    // Переключаемся на раздел инвентаризации
    if (window.admin) {
        admin.switchPage('inventory');
    }
}

// Функция сохранения настроек системы лояльности
async function saveLoyaltySettings() {
    const pointsPercent = document.getElementById('loyaltyPointsPercent')?.value;
    const pointValue = document.getElementById('loyaltyPointValue')?.value;
    const messageEl = document.getElementById('loyaltySettingsMessage');
    const showMessage = (text, type = 'error') => {
        if (messageEl) {
            messageEl.style.color = type === 'error' ? '#dc2626' : '#065f46';
            messageEl.textContent = text || '';
        } else if (type === 'error') {
            alert(text);
        }
    };
    showMessage('');
    
    if (pointsPercent === '' || pointValue === '') {
        showMessage('⚠️ Заполните все поля');
        return;
    }

    const percentValue = parseFloat(pointsPercent);
    const pointValueNumber = parseFloat(pointValue);

    if (!Number.isFinite(percentValue) || percentValue < 0 || percentValue > 100) {
        showMessage('⚠️ Процент начисления должен быть от 0 до 100%');
        return;
    }

    if (!Number.isFinite(pointValueNumber) || pointValueNumber <= 0) {
        showMessage('⚠️ Стоимость балла должна быть больше 0');
        return;
    }
    
    const settings = {
        pointsPercent: percentValue,
        pointValue: pointValueNumber
    };
    
    try {
        const response = await fetch('/api/loyalty/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
            throw new Error(payload?.error || 'Не удалось сохранить настройки');
        }
        if (window.admin && typeof window.admin.showNotification === 'function') {
            window.admin.showNotification('✅ Настройки системы лояльности сохранены', 'success');
        } else {
            alert('✅ Настройки сохранены');
        }
        showMessage('Настройки сохранены', 'success');
        console.log('Loyalty settings saved:', payload?.config || settings);
    } catch (error) {
        console.error('❌ Ошибка сохранения настроек лояльности', error);
        if (window.admin && typeof window.admin.showNotification === 'function') {
            window.admin.showNotification(`❌ ${error.message || 'Не удалось сохранить настройки'}`, 'error');
        } else {
            alert('❌ ' + (error.message || 'Не удалось сохранить настройки'));
        }
        showMessage(error.message || 'Не удалось сохранить настройки');
    }
}

// Initialize admin when page loads
let admin;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing admin...');
    admin = new DandyAdmin();
    window.admin = admin; // Make it globally available
    console.log('Admin initialized:', admin);
    console.log('Admin couriers:', admin.couriers);
    
    // Админка открывается сразу без проверки
    // Не вызываем updateMenuTable и updateOrdersTable при инициализации
    // Они будут вызваны при переключении на соответствующие страницы
    
    // Инициализируем только основные модули сразу
    setTimeout(() => {
        console.log('Initializing core modules...');
        
        // Инициализируем только модули, которые нужны на дашборде
        if (window.soundNotificationsModule) {
            window.soundNotificationsModule.init();
        }
        
        // Проверяем доступность модулей
        console.log('✅ Checking modules availability:');
        console.log('  - initReports:', typeof window.initReports);
        console.log('  - initAlerts:', typeof window.initAlerts);
        console.log('  - initProfile:', typeof window.initProfile);
    }, 200);
});
