(function (global) {
    'use strict';

    const API_BASE = '/api/edo';

    const SAMPLE_DOCUMENTS = [
        {
            docflowId: 'sample-demo-001',
            documentId: 'msg-001',
            type: 'UniversalTransferDocument',
            status: 'incoming',
            counterparty: 'ООО «Ромашка Снаб»',
            date: '2025-02-14T09:25:00Z',
            total: 12890.45,
            number: 'УПД №154 от 14.02.2025'
        }
    ];

    const SAMPLE_LINES = [
        {
            name: 'Сыр Моцарелла 45%',
            quantity: 10,
            unitName: 'кг',
            price: 820,
            subtotal: 8200,
            vatRate: '20%',
            barcode: '4601234000017',
            article: 'MOZ45',
            itemCode: 'A001'
        }
    ];

    const INVENTORY = [
        { id: 'prd-100', type: 'ingredient', name: 'Соус томатный базовый', barcode: '4601234000024', article: 'SAUCE-TOM', synonyms: ['соус томатный', 'соус для пиццы'], vatRate: '10%' },
        { id: 'prd-101', type: 'ingredient', name: 'Сыр Моцарелла 45%', barcode: '4601234000017', article: 'MOZ45', synonyms: ['моцарелла', 'сыр моцарелла'], vatRate: '20%' },
        { id: 'prd-102', type: 'package', name: 'Коробка пиццы 33 см', barcode: '', article: 'BOX-33', synonyms: ['коробка', 'упаковка пиццы'], vatRate: '20%' },
        { id: 'prd-103', type: 'product', name: 'Пицца Маргарита', barcode: '4607001234567', article: 'PIZZA-MARG', synonyms: ['пицца маргарита'], vatRate: '20%' }
    ];

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function safeToNumber(value) {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num : 0;
    }

    function formatCurrency(value) {
        return value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(value) {
        if (!value) return '';
        try {
            const date = new Date(value);
            return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
                ' ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return value;
        }
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function tokenize(str) {
        return (str || '')
            .toLowerCase()
            .replace(/[^a-zа-я0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(Boolean);
    }

    function wordScore(targetTokens, candidateTokens) {
        let matches = 0;
        targetTokens.forEach((token) => {
            if (candidateTokens.indexOf(token) !== -1) {
                matches += 1;
            }
        });
        return matches;
    }

    function computeMatchScore(line, product) {
        let score = 0;

        if (line.barcode && product.barcode && line.barcode === product.barcode) {
            score += 8;
        }

        if (line.article && product.article && line.article.toLowerCase() === product.article.toLowerCase()) {
            score += 6;
        }

        if (line.itemCode && product.article && line.itemCode.toLowerCase() === product.article.toLowerCase()) {
            score += 4;
        }

        const lineTokens = tokenize(line.name);
        const productTokens = tokenize(product.name).concat(tokenize((product.synonyms || []).join(' ')));
        score += wordScore(lineTokens, productTokens);

        if (line.vatRate && product.vatRate && line.vatRate === product.vatRate) {
            score += 1;
        }

        return score;
    }

    function getBaseUrl() {
        if (typeof window !== 'undefined' && window.location) {
            return window.location.origin;
        }
        return 'https://example.com';
    }

    const edoModule = {
        initialized: false,
        container: null,
        state: {
            loadingDocuments: false,
            loadingLines: false,
            documents: [],
            serverConfig: null,
            selectedDocumentId: null,
            docStore: {},
            ui: {
                detailTab: 'lines'
            },
            inventory: clone(INVENTORY),
            activityLog: [],
            error: null
        },

        init() {
            if (this.initialized) {
                this.render();
                return;
            }
            this.container = document.getElementById('edoModuleRoot');
            if (!this.container) {
                console.warn('[EDO] Container not found');
                return;
            }
            this.bindEvents();
            this.initialized = true;
            this.render();
            this.fetchServerConfig();
            this.fetchInventory();
            this.syncDocuments();
        },

    async fetchServerConfig() {
        try {
            const response = await fetch(`${API_BASE}/config`);
            if (!response.ok) {
                if (response.status === 404) {
                    // API endpoint не существует - работаем в офлайн режиме
                    this.setState({ serverConfig: { diadocConfigured: false } });
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (data.ok) {
                this.setState({ serverConfig: data });
            }
        } catch (error) {
            // Тихая обработка - API может быть не настроен
            this.setState({ serverConfig: { diadocConfigured: false } });
        }
    },

    async fetchInventory() {
        try {
            const data = await this.apiFetch(`${API_BASE}/inventory/products`);
            if (data && data.products) {
                this.state.inventory = data.products;
                this.render();
            }
        } catch (error) {
            // Используем локальный инвентарь если API недоступен
            if (error.status === 404 || (error.message && (error.message.includes('404') || error.message.includes('Not found')))) {
                // Тихая обработка - используем локальные данные
            } else {
                console.warn('[EDO] inventory load failed', error.message);
            }
        }
    },

        bindEvents() {
            this.container.addEventListener('click', (event) => this.handleClick(event));
            this.container.addEventListener('change', (event) => this.handleChange(event));
            this.container.addEventListener('input', (event) => this.handleInput(event));
        },

        promptInput(title, placeholder = '', defaultValue = '') {
            return new Promise((resolve) => {
                // Удаляем существующие модальные окна
                const existingModals = document.querySelectorAll('.edo-prompt-modal');
                existingModals.forEach(modal => modal.remove());

                const modal = document.createElement('div');
                modal.className = 'edo-prompt-modal';
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
                
                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    min-width: 400px;
                    max-width: 90%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                `;
                
                modalContent.innerHTML = `
                    <h3 style="margin: 0 0 16px 0; color: #0a615c;">${escapeHtml(title)}</h3>
                    <input type="text" id="edo-prompt-input" 
                           placeholder="${escapeHtml(placeholder)}" 
                           value="${escapeHtml(defaultValue)}"
                           style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box; margin-bottom: 16px;">
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button id="edo-prompt-cancel" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer;">Отмена</button>
                        <button id="edo-prompt-ok" style="padding: 8px 16px; background: #0a615c; color: white; border: none; border-radius: 6px; cursor: pointer;">OK</button>
                    </div>
                `;
                
                modal.appendChild(modalContent);
                document.body.appendChild(modal);
                
                const input = modalContent.querySelector('#edo-prompt-input');
                const okBtn = modalContent.querySelector('#edo-prompt-ok');
                const cancelBtn = modalContent.querySelector('#edo-prompt-cancel');
                
                const cleanup = () => {
                    modal.remove();
                };
                
                const handleOk = () => {
                    const value = input.value.trim();
                    cleanup();
                    resolve(value || null);
                };
                
                const handleCancel = () => {
                    cleanup();
                    resolve(null);
                };
                
                okBtn.addEventListener('click', handleOk);
                cancelBtn.addEventListener('click', handleCancel);
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        handleCancel();
                    }
                });
                
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        handleOk();
                    } else if (e.key === 'Escape') {
                        handleCancel();
                    }
                });
                
                setTimeout(() => input.focus(), 100);
            });
        },

        log(message, docId) {
            this.state.activityLog.unshift({
                id: 'log_' + Date.now(),
                docId: docId || this.state.selectedDocumentId,
                message,
                timestamp: new Date().toISOString()
            });
        },

        setLoading(key, value) {
            this.state[key] = value;
            this.render();
        },

        setState(patch) {
            Object.assign(this.state, patch);
            this.render();
        },

        ensureDocStore(doc) {
            if (!doc) return null;
            if (!this.state.docStore[doc.docflowId]) {
                this.state.docStore[doc.docflowId] = {
                    document: doc,
                    lines: [],
                    parsedXml: '',
                    matches: {},
                    candidates: {},
                    receiptId: null,
                    receiptStatus: null,
                    signatureStatus: doc.status || 'incoming',
                    history: []
                };
            }
            return this.state.docStore[doc.docflowId];
        },

        appendHistory(docflowId, text) {
            const docData = this.state.docStore[docflowId];
            if (!docData) return;
            docData.history.unshift({
                id: 'hist_' + Date.now(),
                text,
                timestamp: new Date().toISOString()
            });
        },

        async apiFetch(path, options = {}) {
            const defaultHeaders = {
                'X-User-Role': global.EDO_USER_ROLE || 'admin'
            };
            if (options.body && !defaultHeaders['Content-Type'] && !(options.headers && options.headers['Content-Type'])) {
                defaultHeaders['Content-Type'] = 'application/json';
            }
            const headers = Object.assign({}, defaultHeaders, options.headers || {});
            try {
                const response = await fetch(path, Object.assign({}, options, { headers }));
                if (!response.ok) {
                    // Для 404 и 405 не логируем как ошибку - это нормально если API не настроен
                    // Примечание: браузер все равно покажет сетевую ошибку в консоли (inject.js),
                    // но наш код не будет логировать её дополнительно
                    if (response.status === 404 || response.status === 405) {
                        const error = new Error(response.status === 404 ? 'Not found' : 'Method not allowed');
                        error.status = response.status;
                        throw error;
                    }
                    const payload = await response.json().catch(() => ({}));
                    throw new Error(payload.error || ('HTTP ' + response.status));
                }
                const payload = await response.json();
                if (payload.ok === false) {
                    throw new Error(payload.error || 'Request failed');
                }
                return payload;
            } catch (error) {
                // Логируем только если это не 404/405 (API может быть не настроен)
                // Сетевые ошибки 404/405 браузер покажет в консоли автоматически,
                // но мы не дублируем их через console.warn
                if (error.status !== 404 && error.status !== 405) {
                    console.warn('[EDO] API call failed:', path, error.message);
                }
                throw error;
            }
        },

        async syncDocuments() {
            this.setLoading('loadingDocuments', true);
            this.state.error = null;
            try {
                const data = await this.apiFetch(`${API_BASE}/documents`);
                if (data && data.docs) {
                    this.state.documents = data.docs.map(this.normalizeDocument);
                    if (data.cached && data.warning) {
                        this.state.error = data.warning;
                    }
                } else {
                    this.state.documents = clone(SAMPLE_DOCUMENTS);
                    this.state.error = 'Получены данные примера. Проверьте подключение к Диадоку.';
                }
            } catch (error) {
                this.state.error = 'Не удалось загрузить документы из Диадока. Показаны данные примера.';
                this.state.documents = clone(SAMPLE_DOCUMENTS);
            } finally {
                this.setLoading('loadingDocuments', false);
            }
            if (!this.state.selectedDocumentId && this.state.documents.length) {
                this.selectDocument(this.state.documents[0].docflowId);
            } else {
                this.render();
            }
        },

        normalizeDocument(doc) {
            const normalized = Object.assign({}, doc);
            normalized.total = safeToNumber(doc.total);
            normalized.date = doc.date || doc.SendDateTime || doc.createdAt || new Date().toISOString();
            normalized.status = doc.status || doc.DocflowStatus || 'incoming';
            normalized.direction = doc.direction || (normalized.status === 'incoming' ? 'in' : 'out');
            normalized.counterparty = doc.counterparty || doc.CounterpartyBoxId || 'Контрагент';
            normalized.type = doc.type || doc.DocumentType || 'UniversalTransferDocument';
            normalized.docflowId = doc.docflowId || doc.DocflowId || doc.id;
            normalized.documentId = doc.documentId || doc.Document?.EntityId || doc.MessageId;
            normalized.number = doc.number || doc.DocumentNumber || '';
            return normalized;
        },

        async selectDocument(docflowId) {
            if (this.state.selectedDocumentId === docflowId) {
                return;
            }
            this.state.selectedDocumentId = docflowId;
            const doc = this.state.documents.find((item) => item.docflowId === docflowId);
            if (!doc) {
                this.render();
                return;
            }
            const docData = this.ensureDocStore(doc);
            if (!docData.lines || !docData.lines.length) {
                await this.refreshLines(docflowId, { withCandidates: true });
            }
            this.render();
        },

        async parseDocument(doc) {
            this.setLoading('loadingLines', true);
            const docData = this.ensureDocStore(doc);
            if (!docData) {
                this.setLoading('loadingLines', false);
                return;
            }
            try {
                const result = await this.apiFetch(`${API_BASE}/documents/${encodeURIComponent(doc.docflowId)}/parse`);
                if (result && result.items) {
                    docData.parsedXml = result.xml || '';
                    this.appendHistory(doc.docflowId, 'Получен титул продавца и распарсен через API');
                    this.log('Титул продавца загружен и распарсен', doc.docflowId);
                    await this.refreshLines(doc.docflowId, { withCandidates: true });
                } else {
                    docData.lines = clone(SAMPLE_LINES).map((line, index) => this.normalizeLine(line, index));
                    docData.parsedXml = '';
                    this.runLocalAutoMatch(doc.docflowId);
                    this.appendHistory(doc.docflowId, 'Использованы демонстрационные данные по строкам накладной');
                    this.log('Использован демо-набор строк', doc.docflowId);
                }
            } catch (error) {
                docData.lines = clone(SAMPLE_LINES).map((line, index) => this.normalizeLine(line, index));
                docData.parsedXml = '';
                this.state.error = 'Не удалось распарсить документ — отображён демо-набор.';
                this.appendHistory(doc.docflowId, 'Ошибка парсинга: ' + error.message);
                this.log('Ошибка парсинга: ' + error.message, doc.docflowId);
                this.runLocalAutoMatch(doc.docflowId);
            } finally {
                this.setLoading('loadingLines', false);
            }
            this.render();
        },

        normalizeLine(line, index) {
            return {
                index,
                name: line.name || line.Product || 'Позиция',
                quantity: safeToNumber(line.quantity || line.Quantity || 0),
                unitName: line.unitName || line.UnitName || '',
                price: safeToNumber(line.price || line.Price || 0),
                subtotal: safeToNumber(line.subtotal || line.SubtotalWithVatExcluded || line.Subtotal || 0),
                vatRate: line.vatRate || line.TaxRate || '',
                barcode: line.barcode || line.Gtin || line.ItemVendorCode || '',
                article: line.article || line.ItemVendorCode || '',
                raw: line
            };
        },

        normalizeLinePayload(payload) {
            return {
                index: payload.index,
                name: payload.name,
                quantity: safeToNumber(payload.quantity),
                unitName: payload.unitName || '',
                price: safeToNumber(payload.price),
                subtotal: safeToNumber(payload.subtotal),
                vatRate: payload.vatRate || '',
                barcode: payload.barcode || '',
                article: payload.article || '',
                matchStatus: payload.matchStatus || 'pending',
                raw: payload.raw || {}
            };
        },

        applyLines(docflowId, linePayloads) {
            const doc = this.state.documents.find((item) => item.docflowId === docflowId);
            if (!doc) return;
            const docData = this.ensureDocStore(doc);
            docData.lines = linePayloads.map((payload) => this.normalizeLinePayload(payload));
            docData.matches = {};
            docData.candidates = {};
            linePayloads.forEach((payload) => {
                docData.matches[payload.index] = payload.match || null;
                docData.candidates[payload.index] = payload.candidates || [];
            });
        },

        applyLineUpdate(docflowId, linePayload) {
            const doc = this.state.documents.find((item) => item.docflowId === docflowId);
            if (!doc) return;
            const docData = this.ensureDocStore(doc);
            const normalized = this.normalizeLinePayload(linePayload);
            const idx = docData.lines.findIndex((item) => item.index === normalized.index);
            if (idx >= 0) {
                docData.lines[idx] = normalized;
            } else {
                docData.lines.push(normalized);
            }
            docData.matches[normalized.index] = linePayload.match || null;
            docData.candidates[normalized.index] = linePayload.candidates || [];
        },

        async refreshLines(docflowId, options = {}) {
            const doc = this.state.documents.find((item) => item.docflowId === docflowId);
            if (!doc) return;
            const query = options.withCandidates ? '?withCandidates=1' : '';
            try {
                const data = await this.apiFetch(`${API_BASE}/documents/${encodeURIComponent(docflowId)}/lines${query}`);
                if (data && data.lines) {
                    this.applyLines(docflowId, data.lines);
                    this.render();
                    return;
                }
            } catch (error) {
                console.warn('[EDO] refreshLines fallback', error.message);
            }
        },

        async autoMatch(docflowId, options = {}) {
            try {
                const response = await this.apiFetch(`${API_BASE}/documents/${encodeURIComponent(docflowId)}/matches/auto`, {
                    method: 'POST',
                    body: JSON.stringify({
                        threshold: options.threshold || 0.7,
                        withCandidates: true
                    })
                });
                if (response && response.lines) {
                    this.applyLines(docflowId, response.lines);
                }
                if (response && typeof response.matched === 'number') {
                    this.appendHistory(docflowId, 'Автосопоставление: подобрано ' + response.matched + ' строк');
                }
            } catch (error) {
                console.warn('[EDO] autoMatch fallback', error.message);
                this.runLocalAutoMatch(docflowId);
            }
            this.render();
        },

        runLocalAutoMatch(docflowId) {
            const docData = this.state.docStore[docflowId];
            if (!docData || !docData.lines) return;
            docData.lines.forEach((line) => {
                const candidates = this.buildCandidates(line);
                docData.candidates[line.index] = candidates;
                if (!docData.matches[line.index] && candidates.length && candidates[0].score >= 6) {
                    docData.matches[line.index] = {
                        productId: candidates[0].product.id,
                        name: candidates[0].product.name,
                        type: candidates[0].product.type,
                        source: candidates[0].source,
                        score: candidates[0].score
                    };
                }
            });
            this.appendHistory(docflowId, 'Автосопоставление выполнено локально (режим офлайн).');
        },

        buildCandidates(line) {
            const candidates = [];
            this.state.inventory.forEach((product) => {
                const score = computeMatchScore(line, product);
                if (score > 0) {
                    let source = 'название';
                    if (line.barcode && product.barcode && line.barcode === product.barcode) {
                        source = 'штрих-код';
                    } else if (line.article && product.article && line.article.toLowerCase() === product.article.toLowerCase()) {
                        source = 'артикул';
                    }
                    candidates.push({ product, score, source });
                }
            });
            candidates.sort((a, b) => b.score - a.score);
            return candidates.slice(0, 5);
        },

        getSelectedDocument() {
            if (!this.state.selectedDocumentId) return null;
            return this.state.docStore[this.state.selectedDocumentId] || null;
        },

        getDocumentMeta() {
            if (!this.state.selectedDocumentId) return null;
            return this.state.documents.find((doc) => doc.docflowId === this.state.selectedDocumentId) || null;
        },

        getDetailTab() {
            return this.state.ui.detailTab;
        },

        setDetailTab(tabId) {
            this.state.ui.detailTab = tabId;
            this.render();
        },

        ensureMatch(docflowId, lineIndex) {
            const docData = this.state.docStore[docflowId];
            if (!docData) return null;
            if (!docData.matches[lineIndex]) {
                docData.matches[lineIndex] = null;
            }
            return docData.matches[lineIndex];
        },

        async setMatch(docflowId, lineIndex, candidate) {
            const docData = this.state.docStore[docflowId];
            if (!docData) return;
            try {
                const encoded = `${API_BASE}/documents/${encodeURIComponent(docflowId)}/lines/${lineIndex}/match`;
                let payload;
                if (candidate && candidate.productId) {
                    payload = await this.apiFetch(encoded + '?withCandidates=1', {
                        method: 'POST',
                        body: JSON.stringify({
                            productId: candidate.productId,
                            source: candidate.source || 'manual',
                            score: candidate.score || null,
                            manual: candidate.manual !== false,
                            comment: candidate.comment || null
                        })
                    });
                } else {
                    payload = await this.apiFetch(encoded + '?withCandidates=1', {
                        method: 'DELETE'
                    });
                }
                if (payload && payload.line) {
                    this.applyLineUpdate(docflowId, payload.line);
                }
                this.render();
            } catch (error) {
                console.error('[EDO] setMatch failed', error);
                throw error;
            }
        },

        async createManualProduct(line) {
            const name = await this.promptInput('Введите название новой карточки', 'Название карточки', line.name);
            if (!name) return null;
            const type = (await this.promptInput('Тип карточки', 'ingredient/product/package', 'ingredient')) || 'ingredient';
            const productPayload = {
                name,
                type,
                barcode: line.barcode || '',
                article: line.article || '',
                synonyms: [line.name],
                vatRate: line.vatRate || ''
            };
            try {
                const response = await this.apiFetch(`${API_BASE}/inventory/products`, {
                    method: 'POST',
                    body: JSON.stringify(productPayload)
                });
                if (response && response.product) {
                    this.state.inventory.push(response.product);
                    this.log('Создана новая карточка ' + response.product.name);
                    return response.product;
                }
            } catch (error) {
                console.error('[EDO] create product error', error);
                window.alert(error.message || 'Не удалось создать карточку');
            }
            return null;
        },

        getReceiptDraft(docflowId) {
            const docData = this.state.docStore[docflowId];
            if (!docData) return null;
            const lines = docData.lines || [];
            const items = lines.map((line) => {
                const match = docData.matches[line.index];
                return {
                    line,
                    match,
                    ready: !!match,
                    total: safeToNumber(line.quantity) * safeToNumber(line.price)
                };
            });
            const ready = items.every((item) => item.ready);
            return { items, ready };
        },

        async createReceipt(docflowId) {
            const docData = this.state.docStore[docflowId];
            const doc = this.state.documents.find((item) => item.docflowId === docflowId);
            if (!docData || !doc) return;
            const draft = this.getReceiptDraft(docflowId);
            if (!draft.ready) {
                window.alert('Не все строки сопоставлены. Завершите сопоставление перед созданием прихода.');
                return;
            }
            try {
                const payload = {
                    edoDocumentId: docflowId,
                    warehouseId: 'default-warehouse',
                    lines: draft.items.map((item) => ({
                        edoLineId: item.line.index,
                        productId: item.match.productId,
                        qty: item.line.quantity,
                        price: item.line.price,
                        vatRate: item.line.vatRate || null,
                        batch: item.line.raw && (item.line.raw.batch || item.line.raw.BatchNumber) || null,
                        expiry: item.line.raw && (item.line.raw.expiry || item.line.raw.ExpiryDate) || null
                    }))
                };
                const response = await this.apiFetch(`${API_BASE}/receipts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (response && response.ok) {
                    docData.receiptId = response.receiptId;
                    docData.receiptStatus = 'draft';
                    this.appendHistory(docflowId, 'Создан приход #' + response.receiptId);
                    this.log('Создан приход #' + response.receiptId, docflowId);
                } else {
                    throw new Error('Сервер вернул ошибку');
                }
            } catch (error) {
                this.appendHistory(docflowId, 'Не удалось создать приход: ' + error.message);
                this.log('Ошибка создания прихода: ' + error.message, docflowId);
                window.alert('Не удалось создать приход. Проверьте журнал.');
            }
            this.render();
        },

        async signDocument(docflowId) {
            const docData = this.state.docStore[docflowId];
            if (!docData) return;
            try {
                await this.apiFetch(`${API_BASE}/documents/${encodeURIComponent(docflowId)}/sign`, { method: 'POST' });
                docData.signatureStatus = 'signed';
                this.appendHistory(docflowId, 'Документ подписан КЭП.');
                this.log('Документ подписан', docflowId);
            } catch (error) {
                if (error.status === 404 || error.status === 405) {
                    // API не настроен - симулируем подпись для демо
                    docData.signatureStatus = 'signed';
                    this.appendHistory(docflowId, 'Документ подписан (демо-режим, API не настроен).');
                    this.log('Документ подписан (демо)', docflowId);
                    window.alert('⚠️ API подписи не настроен. Документ помечен как подписанный в демо-режиме.');
                } else {
                    this.appendHistory(docflowId, 'Ошибка подписи: ' + error.message);
                    this.log('Ошибка подписи: ' + error.message, docflowId);
                    window.alert('Не удалось подписать документ. Проверьте журнал.');
                }
            }
            this.render();
        },

        async sendDocument(docflowId) {
            const docData = this.state.docStore[docflowId];
            if (!docData) return;
            try {
                await this.apiFetch(`${API_BASE}/documents/${encodeURIComponent(docflowId)}/send`, { method: 'POST' });
                docData.signatureStatus = 'sent';
                this.appendHistory(docflowId, 'Титул покупателя отправлен контрагенту.');
                this.log('Титул покупателя отправлен', docflowId);
            } catch (error) {
                if (error.status === 404 || error.status === 405) {
                    // API не настроен - симулируем отправку для демо
                    docData.signatureStatus = 'sent';
                    this.appendHistory(docflowId, 'Титул покупателя отправлен (демо-режим, API не настроен).');
                    this.log('Титул покупателя отправлен (демо)', docflowId);
                    window.alert('⚠️ API отправки не настроен. Документ помечен как отправленный в демо-режиме.');
                } else {
                    this.appendHistory(docflowId, 'Ошибка отправки: ' + error.message);
                    this.log('Ошибка отправки: ' + error.message, docflowId);
                    window.alert('Не удалось отправить документ.');
                }
            }
            this.render();
        },

        async rejectDocument(docflowId) {
            const reason = await this.promptInput('Укажите причину отказа', 'Причина отказа');
            if (!reason) return;
            const docData = this.state.docStore[docflowId];
            if (!docData) return;
            try {
                await this.apiFetch(`${API_BASE}/documents/${encodeURIComponent(docflowId)}/reject`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason })
                });
                docData.signatureStatus = 'rejected';
                this.appendHistory(docflowId, 'Отказано: ' + reason);
                this.log('Отправлен отказ: ' + reason, docflowId);
            } catch (error) {
                if (error.status === 404 || error.status === 405) {
                    // API не настроен - симулируем отказ для демо
                    docData.signatureStatus = 'rejected';
                    this.appendHistory(docflowId, 'Отказано: ' + reason + ' (демо-режим, API не настроен).');
                    this.log('Отправлен отказ (демо): ' + reason, docflowId);
                    window.alert('⚠️ API отказа не настроен. Документ помечен как отклонённый в демо-режиме.');
                } else {
                    this.appendHistory(docflowId, 'Ошибка отказа: ' + error.message);
                    this.log('Ошибка отправки отказа: ' + error.message, docflowId);
                    window.alert('Не удалось отправить отказ.');
                }
            }
            this.render();
        },

        viewXml(docflowId) {
            const docData = this.state.docStore[docflowId];
            if (!docData || !docData.parsedXml) {
                window.alert('XML ещё не загружен.');
                return;
            }
            const blob = new Blob([docData.parsedXml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        },

        async handleClick(event) {
            const actionEl = event.target.closest('[data-action]');
            if (!actionEl) {
                const navEl = event.target.closest('[data-tab]');
                if (navEl) {
                    this.setDetailTab(navEl.getAttribute('data-tab'));
                }
                return;
            }
            const action = actionEl.getAttribute('data-action');
            const docflowId = actionEl.getAttribute('data-doc');
            try {
                switch (action) {
                    case 'sync-docs':
                        await this.syncDocuments();
                        break;
                    case 'edo-retry-documents':
                        await this.syncDocuments();
                        break;
                    case 'select-document':
                        await this.selectDocument(actionEl.getAttribute('data-doc'));
                        break;
                    case 'parse-document':
                        await this.parseDocument(this.state.documents.find((doc) => doc.docflowId === docflowId));
                        break;
                    case 'auto-match':
                        await this.autoMatch(docflowId);
                        break;
                    case 'edo-match': {
                        const lineIndex = parseInt(actionEl.getAttribute('data-line'), 10);
                        await this.showMatchDialog(docflowId, lineIndex);
                        break;
                    }
                    case 'create-product': {
                        const lineIndex = parseInt(actionEl.getAttribute('data-line'), 10);
                        const docData = this.state.docStore[docflowId];
                        if (!docData) break;
                        const line = docData.lines.find((item) => item.index === lineIndex);
                        if (!line) break;
                        const product = await this.createManualProduct(line);
                        if (product) {
                            await this.setMatch(docflowId, lineIndex, {
                                productId: product.id,
                                source: 'manual',
                                score: 1,
                                manual: true
                            });
                        }
                        break;
                    }
                    case 'create-receipt':
                        await this.createReceipt(docflowId);
                        break;
                    case 'sign-doc':
                        await this.signDocument(docflowId);
                        break;
                    case 'send-doc':
                        await this.sendDocument(docflowId);
                        break;
                    case 'reject-doc':
                        await this.rejectDocument(docflowId);
                        break;
                    case 'view-xml':
                        this.viewXml(docflowId);
                        break;
                    case 'switch-tab':
                        this.setDetailTab(actionEl.getAttribute('data-tab'));
                        break;
                    case 'refresh-doc':
                        await this.parseDocument(this.state.documents.find((doc) => doc.docflowId === docflowId));
                        break;
                    case 'edo-sync-status':
                        if (!this.state.selectedDocumentId) {
                            window.alert('Сначала выберите документ.');
                        } else {
                            await this.syncDocumentStatus(this.state.selectedDocumentId);
                        }
                        break;
                    default:
                        break;
                }
            } catch (error) {
                console.error('[EDO] handleClick error', action, error);
                window.alert(error.message || 'Операция не выполнена');
            }
        },

        async handleChange(event) {
            const select = event.target;
            if (!select) return;
            if (select.matches('[data-match-select]')) {
                const docflowId = select.getAttribute('data-doc');
                const lineIndex = parseInt(select.getAttribute('data-line'), 10);
                const value = select.value;
                const docData = this.state.docStore[docflowId];
                if (!docData) return;
                try {
                    if (!value) {
                        await this.setMatch(docflowId, lineIndex, null);
                        return;
                    }
                    const candidates = docData.candidates[lineIndex] || [];
                    const candidate = candidates.find((item) => item.id === value || (item.product && item.product.id === value));
                    if (candidate) {
                        await this.setMatch(docflowId, lineIndex, {
                            productId: candidate.id || (candidate.product && candidate.product.id),
                            source: candidate.source,
                            score: candidate.score,
                            manual: true
                        });
                    } else {
                        await this.setMatch(docflowId, lineIndex, {
                            productId: value,
                            source: 'manual',
                            manual: true
                        });
                    }
                } catch (error) {
                    console.error('[EDO] match update error', error);
                    window.alert(error.message || 'Не удалось сохранить сопоставление');
                    await this.refreshLines(docflowId, { withCandidates: true });
                }
            } else if (select.matches('[data-tab]')) {
                this.setDetailTab(select.getAttribute('data-tab'));
            }
        },

        handleInput(event) {
            if (event.target.matches('[data-setting]')) {
                // placeholder for future inline settings editing
            }
        },

        render() {
            if (!this.container) return;
            const detailDoc = this.getDocumentMeta();
            const docData = detailDoc ? this.state.docStore[detailDoc.docflowId] : null;
            const detailTab = this.getDetailTab();
        const serverConfig = this.state.serverConfig || {};
        const configBadge = serverConfig.diadocConfigured
            ? '<span class="edo-tag">Диадок: подключён</span>'
            : '<span class="edo-status pending">Диадок: требуется токен</span>';

            const docList = this.renderDocumentList(detailDoc);
            const detail = this.renderDetail(detailDoc, docData, detailTab);
            const errorBanner = this.state.error ? `<div class="edo-info-banner">${escapeHtml(this.state.error)}</div>` : '';

            this.container.innerHTML = (
                '<div class="edo-suite">' +
                    '<aside class="edo-sidebar">' +
                        '<h2>Диадок</h2>' +
                        '<div style="margin-bottom:12px;">' + configBadge + '</div>' +
                        '<div class="edo-actions" style="margin-bottom:12px;">' +
                            '<button class="edo-button primary" data-action="sync-docs">🔄 Синхронизировать</button>' +
                            '<button class="edo-button ghost" data-action="refresh-doc" data-doc="' + (detailDoc ? detailDoc.docflowId : '') + '"' + (detailDoc ? '' : ' disabled') + '>⟳ Обновить документ</button>' +
                        '</div>' +
                        '<div class="edo-tags">' +
                            '<span class="edo-tag">Документов: ' + this.state.documents.length + '</span>' +
                            '<span class="edo-tag">Журнал: ' + this.state.activityLog.length + '</span>' +
                        '</div>' +
                        '<hr style="border-color:rgba(255,255,255,0.08);margin:12px 0;">' +
                        tabsMarkup(this.state.ui.detailTab) +
                    '</aside>' +
                    '<section class="edo-main">' +
                        errorBanner +
                        docList +
                        detail +
                        this.renderHistoryPanel(detailDoc) +
                    '</section>' +
                '</div>'
            );

            function tabsMarkup(active) {
                const buttonTabs = [
                    { id: 'lines', label: 'Строки' },
                    { id: 'receipt', label: 'Приход' },
                    { id: 'signature', label: 'Подпись' },
                    { id: 'history', label: 'История' }
                ];
                return (
                    '<div class="loyalty-inline-actions" style="flex-wrap:wrap;">' +
                        buttonTabs.map(function (tab) {
                            return '<button class="loyalty-button ' + (active === tab.id ? 'primary' : 'secondary') + '" data-action="switch-tab" data-tab="' + tab.id + '">' + escapeHtml(tab.label) + '</button>';
                        }).join('') +
                    '</div>'
                );
            }
        },

        renderDocumentList(selectedDoc) {
            const rows = this.state.documents.map((doc) => {
                const selected = selectedDoc && selectedDoc.docflowId === doc.docflowId ? ' edo-doc-row selected' : ' edo-doc-row';
                const tags = [];
                if (doc.cached) {
                    tags.push('<span class="badge badge-warning">кэш</span>');
                }
                if (doc.status) {
                    tags.push('<span class="badge badge-secondary">' + escapeHtml(doc.status) + '</span>');
                }
                return (
                    '<tr class="' + selected + '" data-action="select-document" data-doc="' + doc.docflowId + '">' +
                        '<td>' + formatDate(doc.date) + '</td>' +
                        '<td>' + escapeHtml(doc.counterparty || 'Контрагент') + '<div class="edo-list-meta">#' + doc.docflowId + ' ' + tags.join(' ') + '</div></td>' +
                        '<td>' + escapeHtml(doc.number || '') + '</td>' +
                        '<td>' + escapeHtml(doc.type || '') + '</td>' +
                        '<td>' + escapeHtml(formatCurrency(doc.total || 0)) + '</td>' +
                        '<td>' + this.renderStatus(doc.status) + '</td>' +
                    '</tr>'
                );
            }).join('');

            return (
                '<div class="edo-panel">' +
                    '<div class="edo-panel-header">' +
                        '<h3>Список документов</h3>' +
                        '<div class="edo-panel-actions">' +
                            '<button class="edo-button ghost" data-action="edo-sync-status">🔄 Обновить статус</button>' +
                            '<button class="edo-button ghost" data-action="edo-retry-documents">🔁 Обновить список</button>' +
                        '</div>' +
                    '</div>' +
                    (this.state.loadingDocuments ? '<p>Загрузка документов...</p>' :
                        this.state.documents.length
                            ? '<div class="edo-scroll" style="max-height:280px;"><table class="edo-table"><thead><tr><th>Дата</th><th>Контрагент</th><th>Номер</th><th>Тип</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>' +
                                rows +
                              '</tbody></table></div>'
                            : '<p>Документы не найдены.</p>') +
                '</div>'
            );
        },

        renderStatus(status) {
            switch ((status || '').toLowerCase()) {
                case 'incoming':
                case 'new':
                    return '<span class="edo-status incoming">входящий</span>';
                case 'awaiting-signature':
                case 'pending':
                    return '<span class="edo-status pending">ожидает подписи</span>';
                case 'signed':
                case 'completed':
                    return '<span class="edo-status completed">подписан</span>';
                case 'rejected':
                    return '<span class="edo-status rejected">отклонён</span>';
                case 'sent':
                    return '<span class="edo-status completed">отправлен</span>';
                default:
                    return '<span class="edo-status pending">' + escapeHtml(status || 'неизвестно') + '</span>';
            }
        },

        renderDetail(doc, docData, tab) {
            if (!doc) {
                return (
                    '<div class="edo-panel">' +
                        '<h3>Информация по документу</h3>' +
                        '<p class="edo-muted">Выберите документ из списка, чтобы увидеть детали, сопоставить строки и подписать.</p>' +
                    '</div>'
                );
            }

            const header = (
                '<div class="edo-detail-header">' +
                    '<div class="edo-detail-col">' +
                        '<strong>' + escapeHtml(doc.number || '-') + '</strong>' +
                        '<span class="edo-muted">' + formatDate(doc.date) + '</span>' +
                        this.renderStatus(docData ? docData.signatureStatus : doc.status) +
                    '</div>' +
                    '<div class="edo-detail-col">' +
                        '<span class="edo-muted">Контрагент</span>' +
                        '<strong>' + escapeHtml(doc.counterparty || '-') + '</strong>' +
                        '<span class="edo-muted">ИНН: ' + escapeHtml(doc.inn || '-') + '</span>' +
                    '</div>' +
                    '<div class="edo-detail-col">' +
                        '<span class="edo-muted">Сумма</span>' +
                        '<strong>' + formatCurrency(doc.total || 0) + ' ₽</strong>' +
                        '<span class="edo-muted">Тип: ' + escapeHtml(doc.type || '-') + '</span>' +
                    '</div>' +
                    '<div class="edo-detail-col edo-actions">' +
                        '<button class="edo-button secondary" data-action="parse-document" data-doc="' + doc.docflowId + '">📥 Получить титул</button>' +
                        '<button class="edo-button ghost" data-action="view-xml" data-doc="' + doc.docflowId + '">📄 XML</button>' +
                    '</div>' +
                '</div>'
            );

            let content = '';
            if (!docData || !docData.lines.length) {
                content = '<p class="edo-muted">Титул ещё не загружен. Нажмите «Получить титул».</p>';
            } else {
                switch (tab) {
                    case 'lines':
                        content = this.renderLinesTab(doc.docflowId, docData);
                        break;
                    case 'receipt':
                        content = this.renderReceiptTab(doc.docflowId, docData);
                        break;
                    case 'signature':
                        content = this.renderSignatureTab(doc.docflowId, docData);
                        break;
                    case 'history':
                        content = this.renderDocHistoryTab(doc.docflowId, docData);
                        break;
                    default:
                        content = this.renderLinesTab(doc.docflowId, docData);
                        break;
                }
            }

            return (
                '<div class="edo-panel">' +
                    header +
                    '<div class="edo-tab-bar">' +
                        this.renderDetailTabButton('lines', 'Строки', tab) +
                        this.renderDetailTabButton('receipt', 'Приход', tab) +
                        this.renderDetailTabButton('signature', 'Подпись', tab) +
                        this.renderDetailTabButton('history', 'История', tab) +
                    '</div>' +
                    content +
                '</div>'
            );
        },

        renderDetailTabButton(id, label, activeTab) {
            return '<div class="edo-tab' + (activeTab === id ? ' active' : '') + '" data-action="switch-tab" data-tab="' + id + '">' + escapeHtml(label) + '</div>';
        },

        renderLinesTab(docflowId, docData) {
            if (this.state.loadingLines) {
                return '<p>Загрузка строк документа...</p>';
            }
            const rows = docData.lines.map((line) => {
                const match = docData.matches[line.index] || null;
                const candidates = docData.candidates[line.index] || this.buildCandidates(line);
                const selectOptions = ['<option value="">— Не сопоставлено —</option>'].concat(candidates.map((candidate) => {
                    const percent = Math.round(candidate.score * 10);
                    return '<option value="' + candidate.product.id + '"' + (match && match.productId === candidate.product.id ? ' selected' : '') + '>' +
                        escapeHtml(candidate.product.name) + ' · ' + candidate.source + ' · ' + percent + '%'+
                    '</option>';
                }));
                const matchInfo = match ? '<div class="edo-match-info">' + escapeHtml(match.name) + ' (' + (match.source || '') + ' · ' + Math.round((match.score || 0) * 10) + '%)</div>' : '';
                return (
                    '<tr>' +
                        '<td>' + escapeHtml(line.name) + matchInfo + '</td>' +
                        '<td>' + formatCurrency(line.quantity) + ' ' + escapeHtml(line.unitName || '') + '</td>' +
                        '<td>' + formatCurrency(line.price) + '</td>' +
                        '<td>' + formatCurrency(line.subtotal) + '</td>' +
                        '<td>' + escapeHtml(line.barcode || '-') + '</td>' +
                        '<td>' + escapeHtml(line.article || '-') + '</td>' +
                        '<td>' +
                            '<div class="edo-line-match">' +
                                '<select class="edo-select" data-match-select data-doc="' + docflowId + '" data-line="' + line.index + '">' +
                                    selectOptions.join('') +
                                '</select>' +
                                '<button class="edo-button ghost" data-action="edo-match" data-doc="' + docflowId + '" data-line="' + line.index + '">🔍 Кандидаты</button>' +
                                '<button class="edo-button secondary" data-action="create-product" data-doc="' + docflowId + '" data-line="' + line.index + '">➕ Новая карточка</button>' +
                            '</div>' +
                        '</td>' +
                    '</tr>'
                );
            }).join('');

            return (
                '<div>' +
                    '<div class="edo-info-banner">Сопоставьте все строки накладной с карточками номенклатуры, после чего можно создать приход.</div>' +
                    '<div class="edo-scroll" style="max-height:360px;">' +
                        '<table class="edo-table">' +
                            '<thead><tr><th>Позиция</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th>Штрих-код</th><th>Артикул</th><th>Сопоставление</th></tr></thead>' +
                            '<tbody>' + rows + '</tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>'
            );
        },

        renderReceiptTab(docflowId, docData) {
            const draft = this.getReceiptDraft(docflowId);
            if (!draft) return '<p>Нет данных по строкам.</p>';
            const rows = draft.items.map((item) => {
                return (
                    '<tr>' +
                        '<td>' + escapeHtml(item.line.name) + '</td>' +
                        '<td>' + formatCurrency(item.line.quantity) + ' ' + escapeHtml(item.line.unitName || '') + '</td>' +
                        '<td>' + formatCurrency(item.line.price) + '</td>' +
                        '<td>' + formatCurrency(item.total) + '</td>' +
                        '<td>' + (item.match ? '<span class="edo-tag"> ' + escapeHtml(item.match.name) + ' </span>' : '<span class="edo-status pending">нет</span>') + '</td>' +
                    '</tr>'
                );
            }).join('');
            return (
                '<div>' +
                    '<p class="edo-muted">После сопоставления всех позиций создайте приход. Он будет сохранён в статусе «draft» и доступен в учётном модуле.</p>' +
                    '<table class="edo-table">' +
                        '<thead><tr><th>Позиция</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th>Карточка</th></tr></thead>' +
                        '<tbody>' + rows + '</tbody>' +
                    '</table>' +
                    '<div class="edo-actions" style="margin-top:12px;">' +
                        '<button class="edo-button primary" data-action="create-receipt" data-doc="' + docflowId + '"' + (draft.ready ? '' : ' disabled') + '>📦 Создать приход</button>' +
                        (docData.receiptId ? '<span class="edo-tag">Приход #' + escapeHtml(String(docData.receiptId)) + ' (' + escapeHtml(docData.receiptStatus || 'draft') + ')</span>' : '') +
                    '</div>' +
                '</div>'
            );
        },

        renderSignatureTab(docflowId, docData) {
            return (
                '<div>' +
                    '<p class="edo-muted">Подпишите документ КЭП и отправьте титул покупателя или извещение.</p>' +
                    '<div class="edo-actions" style="margin-bottom:12px;">' +
                        '<button class="edo-button primary" data-action="sign-doc" data-doc="' + docflowId + '">✍️ Подписать</button>' +
                        '<button class="edo-button secondary" data-action="send-doc" data-doc="' + docflowId + '">📤 Отправить титул</button>' +
                        '<button class="edo-button danger" data-action="reject-doc" data-doc="' + docflowId + '">🚫 Отказ</button>' +
                    '</div>' +
                    '<p class="edo-muted">Статус подписи: ' + this.renderStatus(docData.signatureStatus) + '</p>' +
                '</div>'
            );
        },

        renderDocHistoryTab(docflowId, docData) {
            if (!docData.history.length) {
                return '<p class="edo-muted">История действий по документу появится после выполнения операций.</p>';
            }
            return (
                '<div class="edo-scroll" style="max-height:260px;">' +
                    docData.history.map((entry) => {
                        return '<div style="margin-bottom:8px;"><strong>' + formatDate(entry.timestamp) + ':</strong> ' + escapeHtml(entry.text) + '</div>';
                    }).join('') +
                '</div>'
            );
        },

        renderHistoryPanel(selectedDoc) {
            if (!this.state.activityLog.length) {
                return '';
            }
            return (
                '<div class="edo-panel">' +
                    '<h3>Журнал действий</h3>' +
                    '<div class="edo-scroll" style="max-height:200px;">' +
                        this.state.activityLog.map((log) => {
                            const matchesDoc = selectedDoc && log.docId === selectedDoc.docflowId;
                            return '<div style="margin-bottom:8px;">' +
                                '<strong>' + formatDate(log.timestamp) + '</strong> ' +
                                (matchesDoc ? '<span class="edo-tag">текущий документ</span> ' : '') +
                                escapeHtml(log.message) +
                            '</div>';
                        }).join('') +
                    '</div>' +
                '</div>'
            );
        },

        renderError(message) {
            return `
                <div class="edo-suite-error card">
                    <div class="card-header">
                        <h3 class="card-title">⚠️ Ошибка загрузки документов</h3>
                    </div>
                    <p>${message}</p>
                    <div class="card-actions">
                        <button class="btn btn-secondary" data-action="edo-retry-documents">Повторить</button>
                    </div>
                </div>
            `;
        },

        renderDocumentList(selectedDoc) {
            const rows = this.state.documents.map((doc) => {
                const selected = selectedDoc && selectedDoc.docflowId === doc.docflowId ? ' edo-doc-row selected' : ' edo-doc-row';
                const tags = [];
                if (doc.cached) {
                    tags.push('<span class="badge badge-warning">кэш</span>');
                }
                if (doc.status) {
                    tags.push('<span class="badge badge-secondary">' + escapeHtml(doc.status) + '</span>');
                }
                return (
                    '<tr class="' + selected + '" data-action="select-document" data-doc="' + doc.docflowId + '">' +
                        '<td>' + formatDate(doc.date) + '</td>' +
                        '<td>' + escapeHtml(doc.counterparty || 'Контрагент') + '<div class="edo-list-meta">#' + doc.docflowId + ' ' + tags.join(' ') + '</div></td>' +
                        '<td>' + escapeHtml(doc.number || '') + '</td>' +
                        '<td>' + escapeHtml(doc.type || '') + '</td>' +
                        '<td>' + escapeHtml(formatCurrency(doc.total || 0)) + '</td>' +
                        '<td>' + this.renderStatus(doc.status) + '</td>' +
                    '</tr>'
                );
            }).join('');

            return (
                '<div class="edo-panel">' +
                    '<div class="edo-panel-header">' +
                        '<h3>Список документов</h3>' +
                        '<div class="edo-panel-actions">' +
                            '<button class="edo-button ghost" data-action="edo-sync-status">🔄 Обновить статус</button>' +
                            '<button class="edo-button ghost" data-action="edo-retry-documents">🔁 Обновить список</button>' +
                        '</div>' +
                    '</div>' +
                    (this.state.loadingDocuments ? '<p>Загрузка документов...</p>' :
                        this.state.documents.length
                            ? '<div class="edo-scroll" style="max-height:280px;"><table class="edo-table"><thead><tr><th>Дата</th><th>Контрагент</th><th>Номер</th><th>Тип</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>' +
                                rows +
                              '</tbody></table></div>'
                            : '<p>Документы не найдены.</p>') +
                '</div>'
            );
        },

        renderStatus(status) {
            switch ((status || '').toLowerCase()) {
                case 'incoming':
                case 'new':
                    return '<span class="edo-status incoming">входящий</span>';
                case 'awaiting-signature':
                case 'pending':
                    return '<span class="edo-status pending">ожидает подписи</span>';
                case 'signed':
                case 'completed':
                    return '<span class="edo-status completed">подписан</span>';
                case 'rejected':
                    return '<span class="edo-status rejected">отклонён</span>';
                case 'sent':
                    return '<span class="edo-status completed">отправлен</span>';
                default:
                    return '<span class="edo-status pending">' + escapeHtml(status || 'неизвестно') + '</span>';
            }
        },

        renderDetail(doc, docData, tab) {
            if (!doc) {
                return (
                    '<div class="edo-panel">' +
                        '<h3>Информация по документу</h3>' +
                        '<p class="edo-muted">Выберите документ из списка, чтобы увидеть детали, сопоставить строки и подписать.</p>' +
                    '</div>'
                );
            }

            const header = (
                '<div class="edo-detail-header">' +
                    '<div class="edo-detail-col">' +
                        '<strong>' + escapeHtml(doc.number || '-') + '</strong>' +
                        '<span class="edo-muted">' + formatDate(doc.date) + '</span>' +
                        this.renderStatus(docData ? docData.signatureStatus : doc.status) +
                    '</div>' +
                    '<div class="edo-detail-col">' +
                        '<span class="edo-muted">Контрагент</span>' +
                        '<strong>' + escapeHtml(doc.counterparty || '-') + '</strong>' +
                        '<span class="edo-muted">ИНН: ' + escapeHtml(doc.inn || '-') + '</span>' +
                    '</div>' +
                    '<div class="edo-detail-col">' +
                        '<span class="edo-muted">Сумма</span>' +
                        '<strong>' + formatCurrency(doc.total || 0) + ' ₽</strong>' +
                        '<span class="edo-muted">Тип: ' + escapeHtml(doc.type || '-') + '</span>' +
                    '</div>' +
                    '<div class="edo-detail-col edo-actions">' +
                        '<button class="edo-button secondary" data-action="parse-document" data-doc="' + doc.docflowId + '">📥 Получить титул</button>' +
                        '<button class="edo-button ghost" data-action="view-xml" data-doc="' + doc.docflowId + '">📄 XML</button>' +
                    '</div>' +
                '</div>'
            );

            let content = '';
            if (!docData || !docData.lines.length) {
                content = '<p class="edo-muted">Титул ещё не загружен. Нажмите «Получить титул».</p>';
            } else {
                switch (tab) {
                    case 'lines':
                        content = this.renderLinesTab(doc.docflowId, docData);
                        break;
                    case 'receipt':
                        content = this.renderReceiptTab(doc.docflowId, docData);
                        break;
                    case 'signature':
                        content = this.renderSignatureTab(doc.docflowId, docData);
                        break;
                    case 'history':
                        content = this.renderDocHistoryTab(doc.docflowId, docData);
                        break;
                    default:
                        content = this.renderLinesTab(doc.docflowId, docData);
                        break;
                }
            }

            return (
                '<div class="edo-panel">' +
                    header +
                    '<div class="edo-tab-bar">' +
                        this.renderDetailTabButton('lines', 'Строки', tab) +
                        this.renderDetailTabButton('receipt', 'Приход', tab) +
                        this.renderDetailTabButton('signature', 'Подпись', tab) +
                        this.renderDetailTabButton('history', 'История', tab) +
                    '</div>' +
                    content +
                '</div>'
            );
        },

        renderDetailTabButton(id, label, activeTab) {
            return '<div class="edo-tab' + (activeTab === id ? ' active' : '') + '" data-action="switch-tab" data-tab="' + id + '">' + escapeHtml(label) + '</div>';
        },

        renderLinesTab(docflowId, docData) {
            if (this.state.loadingLines) {
                return '<p>Загрузка строк документа...</p>';
            }
            const rows = docData.lines.map((line) => {
                const match = docData.matches[line.index] || null;
                const candidates = docData.candidates[line.index] || this.buildCandidates(line);
                const selectOptions = ['<option value="">— Не сопоставлено —</option>'].concat(candidates.map((candidate) => {
                    return '<option value="' + candidate.product.id + '"' + (match && match.productId === candidate.product.id ? ' selected' : '') + '>' +
                        escapeHtml(candidate.product.name) + ' · ' + candidate.source + ' · ' + candidate.score +
                    '</option>';
                }));
                return (
                    '<tr>' +
                        '<td>' + escapeHtml(line.name) + '</td>' +
                        '<td>' + formatCurrency(line.quantity) + ' ' + escapeHtml(line.unitName || '') + '</td>' +
                        '<td>' + formatCurrency(line.price) + '</td>' +
                        '<td>' + formatCurrency(line.subtotal) + '</td>' +
                        '<td>' + escapeHtml(line.barcode || '-') + '</td>' +
                        '<td>' + escapeHtml(line.article || '-') + '</td>' +
                        '<td>' +
                            '<div class="edo-line-match">' +
                                '<select class="edo-select" data-match-select data-doc="' + docflowId + '" data-line="' + line.index + '">' +
                                    selectOptions.join('') +
                                '</select>' +
                                '<button class="edo-button secondary" data-action="create-product" data-doc="' + docflowId + '" data-line="' + line.index + '">➕ Новая карточка</button>' +
                            '</div>' +
                        '</td>' +
                    '</tr>'
                );
            }).join('');

            return (
                '<div>' +
                    '<div class="edo-info-banner">Сопоставьте все строки накладной с карточками номенклатуры, после чего можно создать приход.</div>' +
                    '<div class="edo-scroll" style="max-height:360px;">' +
                        '<table class="edo-table">' +
                            '<thead><tr><th>Позиция</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th>Штрих-код</th><th>Артикул</th><th>Сопоставление</th></tr></thead>' +
                            '<tbody>' + rows + '</tbody>' +
                        '</table>' +
                    '</div>' +
                '</div>'
            );
        },

        renderReceiptTab(docflowId, docData) {
            const draft = this.getReceiptDraft(docflowId);
            if (!draft) return '<p>Нет данных по строкам.</p>';
            const rows = draft.items.map((item) => {
                return (
                    '<tr>' +
                        '<td>' + escapeHtml(item.line.name) + '</td>' +
                        '<td>' + formatCurrency(item.line.quantity) + ' ' + escapeHtml(item.line.unitName || '') + '</td>' +
                        '<td>' + formatCurrency(item.line.price) + '</td>' +
                        '<td>' + formatCurrency(item.total) + '</td>' +
                        '<td>' + (item.match ? '<span class="edo-tag"> ' + escapeHtml(item.match.name) + ' </span>' : '<span class="edo-status pending">нет</span>') + '</td>' +
                    '</tr>'
                );
            }).join('');
            return (
                '<div>' +
                    '<p class="edo-muted">После сопоставления всех позиций создайте приход. Он будет сохранён в статусе «draft» и доступен в учётном модуле.</p>' +
                    '<table class="edo-table">' +
                        '<thead><tr><th>Позиция</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th>Карточка</th></tr></thead>' +
                        '<tbody>' + rows + '</tbody>' +
                    '</table>' +
                    '<div class="edo-actions" style="margin-top:12px;">' +
                        '<button class="edo-button primary" data-action="create-receipt" data-doc="' + docflowId + '"' + (draft.ready ? '' : ' disabled') + '>📦 Создать приход</button>' +
                        (docData.receiptId ? '<span class="edo-tag">Приход #' + escapeHtml(String(docData.receiptId)) + ' (' + escapeHtml(docData.receiptStatus || 'draft') + ')</span>' : '') +
                    '</div>' +
                '</div>'
            );
        },

        renderSignatureTab(docflowId, docData) {
            return (
                '<div>' +
                    '<p class="edo-muted">Подпишите документ КЭП и отправьте титул покупателя или извещение.</p>' +
                    '<div class="edo-actions" style="margin-bottom:12px;">' +
                        '<button class="edo-button primary" data-action="sign-doc" data-doc="' + docflowId + '">✍️ Подписать</button>' +
                        '<button class="edo-button secondary" data-action="send-doc" data-doc="' + docflowId + '">📤 Отправить титул</button>' +
                        '<button class="edo-button danger" data-action="reject-doc" data-doc="' + docflowId + '">🚫 Отказ</button>' +
                    '</div>' +
                    '<p class="edo-muted">Статус подписи: ' + this.renderStatus(docData.signatureStatus) + '</p>' +
                '</div>'
            );
        },

        renderDocHistoryTab(docflowId, docData) {
            if (!docData.history.length) {
                return '<p class="edo-muted">История действий по документу появится после выполнения операций.</p>';
            }
            return (
                '<div class="edo-scroll" style="max-height:260px;">' +
                    docData.history.map((entry) => {
                        return '<div style="margin-bottom:8px;"><strong>' + formatDate(entry.timestamp) + ':</strong> ' + escapeHtml(entry.text) + '</div>';
                    }).join('') +
                '</div>'
            );
        },

        renderHistoryPanel(selectedDoc) {
            if (!this.state.activityLog.length) {
                return '';
            }
            return (
                '<div class="edo-panel">' +
                    '<h3>Журнал действий</h3>' +
                    '<div class="edo-scroll" style="max-height:200px;">' +
                        this.state.activityLog.map((log) => {
                            const matchesDoc = selectedDoc && log.docId === selectedDoc.docflowId;
                            return '<div style="margin-bottom:8px;">' +
                                '<strong>' + formatDate(log.timestamp) + '</strong> ' +
                                (matchesDoc ? '<span class="edo-tag">текущий документ</span> ' : '') +
                                escapeHtml(log.message) +
                            '</div>';
                        }).join('') +
                    '</div>' +
                '</div>'
            );
        },

        async syncDocumentStatus(docflowId) {
            try {
                const response = await this.apiFetch(`${API_BASE}/documents/${encodeURIComponent(docflowId)}/sync`, {
                    method: 'POST'
                });
                if (response.warning) {
                    window.alert(response.warning);
                }
                await this.loadDocuments();
                await this.refreshLines(docflowId, { withCandidates: true });
                window.alert('✅ Статус документа обновлён');
            } catch (error) {
                console.error('[EDO] sync status error', error);
                alert(error.message || 'Не удалось обновить статус документа');
            }
        },

        async loadDocuments() {
            this.setLoading('loadingDocuments', true);
            this.state.error = null;
            try {
                const data = await this.apiFetch(`${API_BASE}/documents`);
                if (data && data.docs) {
                    this.state.documents = data.docs.map(this.normalizeDocument);
                } else {
                    this.state.documents = clone(SAMPLE_DOCUMENTS);
                }
            } catch (error) {
                this.state.error = 'Не удалось загрузить документы. Показаны данные примера.';
                this.state.documents = clone(SAMPLE_DOCUMENTS);
            } finally {
                this.setLoading('loadingDocuments', false);
            }
            if (!this.state.selectedDocumentId && this.state.documents.length) {
                await this.selectDocument(this.state.documents[0].docflowId);
            } else {
                this.render();
            }
        },

        async loadDocument(docflowId) {
            const doc = this.state.documents.find((item) => item.docflowId === docflowId);
            if (!doc) {
                this.render();
                return;
            }
            const docData = this.ensureDocStore(doc);
            await this.refreshLines(docflowId, { withCandidates: true });
            if (!docData.lines || !docData.lines.length) {
                await this.parseDocument(doc);
            } else {
                this.render();
            }
        },

        async showMatchDialog(docflowId, lineIndex) {
            const doc = this.state.documents.find((item) => item.docflowId === docflowId);
            if (!doc) return;
            await this.refreshLines(docflowId, { withCandidates: true });
            const docData = this.state.docStore[docflowId];
            if (!docData) return;
            const line = docData.lines.find((item) => item.index === lineIndex);
            const candidates = (docData.candidates && docData.candidates[lineIndex]) || [];
            if (!candidates.length) {
                window.alert('Кандидаты не найдены. Добавьте карточку вручную или настройте правило сопоставления.');
                return;
            }
            const promptText = candidates
                .map((candidate, idx) => `${idx + 1}. ${candidate.name} (${Math.round((candidate.score || 0) * 100)}%, ${candidate.source})`)
                .join('\n');
            const answer = await this.promptInput(
                `Выберите номер кандидата для строки "${line.name}"`,
                `Введите номер (1-${candidates.length})\n\n${promptText}`,
                ''
            );
            if (!answer) return;
            const index = parseInt(answer, 10);
            if (!Number.isFinite(index) || index < 1 || index > candidates.length) {
                window.alert('Неверный номер кандидата');
                return;
            }
            const selected = candidates[index - 1];
            await this.setMatch(docflowId, lineIndex, {
                productId: selected.id,
                source: selected.source,
                score: selected.score,
                manual: true
            });
        }
    };

    if (typeof document !== 'undefined') {
        global.edoModule = edoModule;
    }
})(typeof window !== 'undefined' ? window : globalThis);

