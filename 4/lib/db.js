const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'kitchen.db');
const fs = require('fs');

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  const createStoresTable = `
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createMaterialsTable = `
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      unit TEXT NOT NULL DEFAULT '公斤',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createInventoryTable = `
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL UNIQUE,
      quantity REAL NOT NULL DEFAULT 0,
      safe_threshold REAL NOT NULL DEFAULT 10,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    )
  `;

  const createApplicationsTable = `
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_no TEXT NOT NULL UNIQUE,
      store_id INTEGER NOT NULL,
      application_date DATE NOT NULL,
      expected_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT '待审核',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    )
  `;

  const createApplicationItemsTable = `
    CREATE TABLE IF NOT EXISTS application_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
      UNIQUE(application_id, material_id)
    )
  `;

  const createProductionOrdersTable = `
    CREATE TABLE IF NOT EXISTS production_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      material_id INTEGER NOT NULL,
      required_quantity REAL NOT NULL,
      actual_quantity REAL NOT NULL DEFAULT 0,
      planned_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT '进行中',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    )
  `;

  const createDeliveryRecordsTable = `
    CREATE TABLE IF NOT EXISTS delivery_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_no TEXT NOT NULL UNIQUE,
      application_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL,
      delivery_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    )
  `;

  const createDeliveryItemsTable = `
    CREATE TABLE IF NOT EXISTS delivery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_id INTEGER NOT NULL,
      material_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      FOREIGN KEY (delivery_id) REFERENCES delivery_records(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
    )
  `;

  const createApplicationProductionLinkTable = `
    CREATE TABLE IF NOT EXISTS application_production_link (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      production_order_id INTEGER NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
      FOREIGN KEY (production_order_id) REFERENCES production_orders(id) ON DELETE CASCADE,
      UNIQUE(application_id, production_order_id)
    )
  `;

  db.exec(createStoresTable);
  db.exec(createMaterialsTable);
  db.exec(createInventoryTable);
  db.exec(createApplicationsTable);
  db.exec(createApplicationItemsTable);
  db.exec(createProductionOrdersTable);
  db.exec(createDeliveryRecordsTable);
  db.exec(createDeliveryItemsTable);
  db.exec(createApplicationProductionLinkTable);

  const storeCount = db.prepare('SELECT COUNT(*) as count FROM stores').get().count;
  if (storeCount === 0) {
    const insertStores = db.prepare('INSERT INTO stores (name, address) VALUES (?, ?)');
    insertStores.run('王府井店', '北京市东城区王府井大街138号');
    insertStores.run('西单店', '北京市西城区西单北大街120号');
    insertStores.run('朝阳大悦城店', '北京市朝阳区朝阳北路101号');
  }

  const materialCount = db.prepare('SELECT COUNT(*) as count FROM materials').get().count;
  if (materialCount === 0) {
    const insertMaterials = db.prepare('INSERT INTO materials (name, unit) VALUES (?, ?)');
    insertMaterials.run('猪肉', '公斤');
    insertMaterials.run('面粉', '公斤');
    insertMaterials.run('食用油', '升');
    insertMaterials.run('白菜', '公斤');
    insertMaterials.run('土豆', '公斤');

    const materials = db.prepare('SELECT id, name FROM materials').all();
    const insertInventory = db.prepare('INSERT INTO inventory (material_id, quantity, safe_threshold) VALUES (?, ?, 10)');
    
    const initialStock = {
      '猪肉': 20,
      '面粉': 30,
      '食用油': 15,
      '白菜': 5,
      '土豆': 8
    };

    materials.forEach(m => {
      insertInventory.run(m.id, initialStock[m.name] || 0);
    });
  }
}

initDatabase();

function generateApplicationNo() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const count = db.prepare('SELECT COUNT(*) as count FROM applications WHERE DATE(created_at) = DATE(?)').get(date.toISOString()).count;
  return `AP${dateStr}${String(count + 1).padStart(4, '0')}`;
}

function generateProductionOrderNo() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const count = db.prepare('SELECT COUNT(*) as count FROM production_orders WHERE DATE(created_at) = DATE(?)').get(date.toISOString()).count;
  return `PO${dateStr}${String(count + 1).padStart(4, '0')}`;
}

function generateDeliveryNo() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const count = db.prepare('SELECT COUNT(*) as count FROM delivery_records WHERE DATE(created_at) = DATE(?)').get(date.toISOString()).count;
  return `DL${dateStr}${String(count + 1).padStart(4, '0')}`;
}

function getAllStores() {
  return db.prepare('SELECT * FROM stores ORDER BY id').all();
}

function getAllMaterials() {
  return db.prepare('SELECT m.*, i.quantity as stock FROM materials m LEFT JOIN inventory i ON m.id = i.material_id ORDER BY m.id').all();
}

function getInventory() {
  return db.prepare('SELECT i.*, m.name, m.unit FROM inventory i JOIN materials m ON i.material_id = m.id ORDER BY m.id').all();
}

function createApplication(storeId, applicationDate, expectedDate, items) {
  const tx = db.transaction(() => {
    const applicationNo = generateApplicationNo();
    
    const result = db.prepare(`
      INSERT INTO applications (application_no, store_id, application_date, expected_date, status)
      VALUES (?, ?, ?, ?, '待审核')
    `).run(applicationNo, storeId, applicationDate, expectedDate);

    const applicationId = result.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO application_items (application_id, material_id, quantity)
      VALUES (?, ?, ?)
    `);

    items.forEach(item => {
      insertItem.run(applicationId, item.materialId, item.quantity);
    });

    return { applicationId, applicationNo };
  });

  return tx();
}

function getApplications(storeId = null, status = null) {
  let sql = `
    SELECT a.*, s.name as store_name
    FROM applications a
    JOIN stores s ON a.store_id = s.id
  `;
  const params = [];
  const conditions = [];

  if (storeId) {
    conditions.push('a.store_id = ?');
    params.push(storeId);
  }
  if (status) {
    conditions.push('a.status = ?');
    params.push(status);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY a.created_at DESC';

  const applications = db.prepare(sql).all(...params);

  const getItems = db.prepare(`
    SELECT ai.*, m.name as material_name, m.unit
    FROM application_items ai
    JOIN materials m ON ai.material_id = m.id
    WHERE ai.application_id = ?
  `);

  applications.forEach(app => {
    app.items = getItems.all(app.id);
  });

  return applications;
}

function getApplicationById(id) {
  const app = db.prepare(`
    SELECT a.*, s.name as store_name
    FROM applications a
    JOIN stores s ON a.store_id = s.id
    WHERE a.id = ?
  `).get(id);

  if (app) {
    app.items = db.prepare(`
      SELECT ai.*, m.name as material_name, m.unit
      FROM application_items ai
      JOIN materials m ON ai.material_id = m.id
      WHERE ai.application_id = ?
    `).all(id);
  }

  return app;
}

function cancelApplication(id) {
  const app = db.prepare('SELECT status FROM applications WHERE id = ?').get(id);
  if (!app || app.status !== '待审核') {
    throw new Error('只有待审核状态的申请单才能取消');
  }

  return db.prepare('UPDATE applications SET status = ? WHERE id = ?').run('已取消', id);
}

function approveApplication(id) {
  return db.prepare('UPDATE applications SET status = ? WHERE id = ?').run('已审核', id);
}

function getApprovedApplications() {
  const applications = db.prepare(`
    SELECT a.*, s.name as store_name
    FROM applications a
    JOIN stores s ON a.store_id = s.id
    WHERE a.status = '已审核'
    ORDER BY a.created_at ASC
  `).all();

  const getItems = db.prepare(`
    SELECT ai.*, m.name as material_name, m.unit
    FROM application_items ai
    JOIN materials m ON ai.material_id = m.id
    WHERE ai.application_id = ?
  `);

  applications.forEach(app => {
    app.items = getItems.all(app.id);
  });

  return applications;
}

function convertApplicationsToProduction(applicationIds, plannedDate) {
  const tx = db.transaction(() => {
    const materialQuantities = new Map();
    const applicationItemsMap = new Map();

    applicationIds.forEach(appId => {
      const items = db.prepare(`
        SELECT material_id, quantity FROM application_items WHERE application_id = ?
      `).all(appId);
      
      applicationItemsMap.set(appId, items);
      
      items.forEach(item => {
        const current = materialQuantities.get(item.material_id) || 0;
        materialQuantities.set(item.material_id, current + item.quantity);
      });
    });

    const createdOrders = [];

    for (const [materialId, quantity] of materialQuantities.entries()) {
      const orderNo = generateProductionOrderNo();
      const result = db.prepare(`
        INSERT INTO production_orders (order_no, material_id, required_quantity, planned_date, status)
        VALUES (?, ?, ?, ?, '进行中')
      `).run(orderNo, materialId, quantity, plannedDate);

      createdOrders.push({
        id: result.lastInsertRowid,
        orderNo,
        materialId,
        requiredQuantity: quantity,
        plannedDate
      });
    }

    const insertLink = db.prepare(`
      INSERT INTO application_production_link (application_id, production_order_id)
      VALUES (?, ?)
    `);

    applicationIds.forEach(appId => {
      db.prepare('UPDATE applications SET status = ? WHERE id = ?').run('生产中', appId);
      
      createdOrders.forEach(order => {
        insertLink.run(appId, order.id);
      });
    });

    return createdOrders;
  });

  return tx();
}

function getProductionOrders(status = null) {
  let sql = `
    SELECT po.*, m.name as material_name, m.unit
    FROM production_orders po
    JOIN materials m ON po.material_id = m.id
  `;
  const params = [];

  if (status) {
    sql += ' WHERE po.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY po.planned_date ASC, po.created_at ASC';

  return db.prepare(sql).all(...params);
}

function updateProductionOrder(id, actualQuantity, plannedDate) {
  const tx = db.transaction(() => {
    const order = db.prepare('SELECT * FROM production_orders WHERE id = ?').get(id);
    if (!order) {
      throw new Error('工单不存在');
    }

    const previousActual = order.actual_quantity;

    db.prepare(`
      UPDATE production_orders
      SET actual_quantity = ?, planned_date = ?, status = ?
      WHERE id = ?
    `).run(
      actualQuantity,
      plannedDate,
      actualQuantity >= order.required_quantity ? '已完成' : '进行中',
      id
    );

    const addedQuantity = actualQuantity - previousActual;
    if (addedQuantity > 0) {
      db.prepare(`
        UPDATE inventory
        SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
        WHERE material_id = ?
      `).run(addedQuantity, order.material_id);
    }

    const appsToUpdate = db.prepare(`
      SELECT DISTINCT apl.application_id
      FROM application_production_link apl
      WHERE apl.production_order_id = ?
    `).all(id);

    appsToUpdate.forEach(link => {
      const allOrdersForApp = db.prepare(`
        SELECT po.status
        FROM production_orders po
        JOIN application_production_link apl ON po.id = apl.production_order_id
        WHERE apl.application_id = ?
      `).all(link.application_id);

      const allCompleted = allOrdersForApp.every(o => o.status === '已完成');
      
      if (allCompleted) {
        db.prepare(`
          UPDATE applications SET status = ? WHERE id = ? AND status = ?
        `).run('已完成生产', link.application_id, '生产中');
      }
    });

    return true;
  });

  return tx();
}

function getApplicationsReadyForDelivery() {
  const applications = db.prepare(`
    SELECT a.*, s.name as store_name
    FROM applications a
    JOIN stores s ON a.store_id = s.id
    WHERE a.status = '已完成生产'
    ORDER BY a.created_at ASC
  `).all();

  const getItems = db.prepare(`
    SELECT ai.*, m.name as material_name, m.unit
    FROM application_items ai
    JOIN materials m ON ai.material_id = m.id
    WHERE ai.application_id = ?
  `);

  applications.forEach(app => {
    app.items = getItems.all(app.id);
  });

  return applications;
}

function checkDeliveryFeasibility(applicationId) {
  const items = db.prepare(`
    SELECT ai.material_id, ai.quantity, m.name, m.unit
    FROM application_items ai
    JOIN materials m ON ai.material_id = m.id
    WHERE ai.application_id = ?
  `).all(applicationId);

  const shortages = [];

  items.forEach(item => {
    const inventory = db.prepare('SELECT quantity FROM inventory WHERE material_id = ?').get(item.material_id);
    if (!inventory || inventory.quantity < item.quantity) {
      shortages.push({
        name: item.name,
        required: item.quantity,
        available: inventory ? inventory.quantity : 0,
        unit: item.unit
      });
    }
  });

  return shortages;
}

function deliverApplication(applicationId) {
  const tx = db.transaction(() => {
    const shortages = checkDeliveryFeasibility(applicationId);
    if (shortages.length > 0) {
      const shortageText = shortages.map(s => `${s.name}（需${s.required}${s.unit}，现有${s.available}${s.unit}）`).join('、');
      throw new Error(`库存不足，缺少：${shortageText}`);
    }

    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(applicationId);
    if (!app || app.status !== '已完成生产') {
      throw new Error('申请单状态不正确');
    }

    const items = db.prepare(`
      SELECT ai.material_id, ai.quantity FROM application_items ai WHERE ai.application_id = ?
    `).all(applicationId);

    items.forEach(item => {
      db.prepare(`
        UPDATE inventory SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
        WHERE material_id = ?
      `).run(item.quantity, item.material_id);
    });

    const deliveryNo = generateDeliveryNo();
    const today = new Date().toISOString().slice(0, 10);
    
    const deliveryResult = db.prepare(`
      INSERT INTO delivery_records (delivery_no, application_id, store_id, delivery_date)
      VALUES (?, ?, ?, ?)
    `).run(deliveryNo, applicationId, app.store_id, today);

    const deliveryId = deliveryResult.lastInsertRowid;

    const insertDeliveryItem = db.prepare(`
      INSERT INTO delivery_items (delivery_id, material_id, quantity)
      VALUES (?, ?, ?)
    `);

    items.forEach(item => {
      insertDeliveryItem.run(deliveryId, item.material_id, item.quantity);
    });

    db.prepare('UPDATE applications SET status = ? WHERE id = ?').run('已配送', applicationId);

    return { deliveryId, deliveryNo };
  });

  return tx();
}

function getDeliveryRecords() {
  const records = db.prepare(`
    SELECT dr.*, a.application_no, s.name as store_name
    FROM delivery_records dr
    JOIN applications a ON dr.application_id = a.id
    JOIN stores s ON dr.store_id = s.id
    ORDER BY dr.delivery_date DESC, dr.created_at DESC
  `).all();

  const getItems = db.prepare(`
    SELECT di.*, m.name as material_name, m.unit
    FROM delivery_items di
    JOIN materials m ON di.material_id = m.id
    WHERE di.delivery_id = ?
  `);

  records.forEach(record => {
    record.items = getItems.all(record.id);
  });

  return records;
}

function getDashboardStats() {
  const lowStockMaterials = db.prepare(`
    SELECT i.*, m.name, m.unit
    FROM inventory i
    JOIN materials m ON i.material_id = m.id
    WHERE i.quantity < i.safe_threshold
    ORDER BY i.quantity ASC
  `).all();

  const pendingCount = db.prepare(`
    SELECT COUNT(*) as count FROM applications WHERE status IN ('待审核', '已审核', '生产中')
  `).get().count;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const deliveriesByDay = db.prepare(`
    SELECT DATE(delivery_date) as date, COUNT(*) as count
    FROM delivery_records
    WHERE delivery_date >= ?
    GROUP BY DATE(delivery_date)
    ORDER BY date ASC
  `).all(sevenDaysAgo.toISOString().slice(0, 10));

  const storeApplicationStats = db.prepare(`
    SELECT s.id, s.name, COUNT(a.id) as count
    FROM stores s
    LEFT JOIN applications a ON s.id = a.store_id AND a.status = '已配送'
    GROUP BY s.id, s.name
    ORDER BY count DESC
  `).all();

  const threeDaysLater = new Date();
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  threeDaysLater.setHours(23, 59, 59, 999);

  const purchaseSuggestions = db.prepare(`
    SELECT 
      m.id,
      m.name,
      m.unit,
      COALESCE(SUM(po.required_quantity - po.actual_quantity), 0) as planned_production,
      COALESCE(i.quantity, 0) as current_stock,
      MAX(0, COALESCE(SUM(po.required_quantity - po.actual_quantity), 0) - COALESCE(i.quantity, 0)) as suggested_purchase
    FROM materials m
    LEFT JOIN production_orders po ON m.id = po.material_id 
      AND po.status = '进行中' 
      AND po.planned_date <= ?
    LEFT JOIN inventory i ON m.id = i.material_id
    GROUP BY m.id, m.name, m.unit, i.quantity
    ORDER BY suggested_purchase DESC
  `).all(threeDaysLater.toISOString().slice(0, 10));

  return {
    lowStockMaterials,
    pendingCount,
    deliveriesByDay,
    storeApplicationStats,
    purchaseSuggestions
  };
}

module.exports = {
  db,
  getAllStores,
  getAllMaterials,
  getInventory,
  createApplication,
  getApplications,
  getApplicationById,
  cancelApplication,
  approveApplication,
  getApprovedApplications,
  convertApplicationsToProduction,
  getProductionOrders,
  updateProductionOrder,
  getApplicationsReadyForDelivery,
  checkDeliveryFeasibility,
  deliverApplication,
  getDeliveryRecords,
  getDashboardStats
};
