const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

const staticDir = path.join(__dirname, 'public');
app.use('/api/public', express.static(staticDir));

const edoRouter = require('./api/edo_backend');
app.use('/api/edo', edoRouter);

const importRouter = require('./api/import_backend');
app.use('/api/import', importRouter);

const loyaltyRouter = require('./api/loyalty_backend');
app.use('/api/loyalty', loyaltyRouter);

const complianceRouter = require('./api/compliance_backend');
app.use('/api', complianceRouter);

const authRouter = require('./api/auth_backend');
app.use('/api/auth', authRouter);

const catalogRouter = require('./api/catalog_backend');
app.use('/api/catalog', catalogRouter);

const inventoryRouter = require('./api/inventory_backend');
app.use('/api/inventory', inventoryRouter);

const adminStateRouter = require('./api/admin_state_backend');
app.use('/api/admin-state', adminStateRouter);

const cashierRouter = require('./api/cashier_backend');
app.use('/api/cashier-report', cashierRouter);

const aggregatorRouter = require('./api/aggregator_backend');
app.use('/api/aggregators', aggregatorRouter);

const PORT = process.env.PORT || 8080;

app.get('/api/edo/health', (req, res) => {
    const configured = Boolean(process.env.DIADOC_API_TOKEN && process.env.DIADOC_BOX_ID);
    res.json({
        ok: true,
        service: 'diadoc-connector',
        environmentConfigured: configured
    });
});

app.listen(PORT, () => {
    console.log(`[Server] Listening on port ${PORT}`);
});

