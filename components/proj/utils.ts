

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const calculateProductTotals = (product) => {
    const totalRevenue = product.items.filter(i => i.type === 'revenue').reduce((sum, r) => sum + r.amount, 0);
    const totalCost = product.items.filter(i => i.type === 'cost').reduce((sum, c) => sum + c.amount, 0);
    const profit = totalRevenue - totalCost;
    return { totalRevenue, totalCost, profit };
};

export const calculateProjectTotals = (project) => {
  let totalRevenue = 0;
  
  const financialTotals = (project.products || []).reduce((totals, p) => {
    totals.cost += (p.items || []).filter(i => i.type === 'cost').reduce((sum, c) => sum + c.amount, 0);
    totals.revenue += (p.items || []).filter(i => i.type === 'revenue').reduce((sum, r) => sum + r.amount, 0);
    return totals;
  }, { revenue: 0, cost: 0 });


  if (project.projectType === 'Measurement') {
    const totalOldSqm = (project.measurements || []).reduce((sqmSum, m) => {
        const sqm = (m.oldWidth / 1000) * (m.oldHeight / 1000) * m.oldQty;
        return sqmSum + sqm;
    }, 0);
    totalRevenue = totalOldSqm * (project.measurementRate || 0) + financialTotals.revenue;
  } else {
    totalRevenue = financialTotals.revenue;
  }
  
  const totalCost = financialTotals.cost;
  const grossProfit = totalRevenue - totalCost;
  return { totalRevenue, totalCost, grossProfit };
};

export const deepCopy = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    return JSON.parse(JSON.stringify(obj));
};

// --- DATE UTILITIES ---

const dateStringToJulian = (isoDate) => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        const today = new Date();
        const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
        return (todayUtc.getTime() / 86400000) + 2440587.5;
    }
    const date = new Date(`${isoDate}T00:00:00Z`);
    return (date.getTime() / 86400000) + 2440587.5;
};

const julianToDateString = (jd) => {
    const time = (jd - 2440587.5) * 86400000;
    const date = new Date(time);
    return date.toISOString().slice(0, 10);
};

export const formatDateForDisplay = (isoDate) => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
    const [year, month, day] = isoDate.split('-');
    return `${day}-${month}-${year}`;
};

export const parseDisplayDate = (displayDate) => {
    if (!displayDate) return null;
    const parts = displayDate.trim().match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if (parts) {
        const day = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10);
        const year = parseInt(parts[3], 10);
        
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
             return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }
    return null;
};

const parseFlexibleDate = (dateStr) => {
    if (!dateStr || !dateStr.trim()) return new Date().toISOString().slice(0, 10);
    const trimmedDateStr = dateStr.trim();
    
    let day, month, year;

    let parts = trimmedDateStr.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if (parts) { [ , year, month, day] = parts.map(p => parseInt(p,10)); }
    else {
        parts = trimmedDateStr.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
        if (parts) { [ , day, month, year] = parts.map(p => parseInt(p,10)); }
    }

    if (year !== undefined && month !== undefined && day !== undefined) {
      const date = new Date(Date.UTC(year, month - 1, day));
      if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
          return date.toISOString().slice(0, 10);
      }
    }
    console.warn(`Could not parse a valid date from "${trimmedDateStr}". Defaulting to today.`);
    return new Date().toISOString().slice(0, 10);
};


// --- CSV UTILITIES ---
const escapeCsvField = (field) => {
    const str = String(field == null ? '' : field);
    if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const parseCsvRow = (row, delimiter = ',') => {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < row.length && row[i + 1] === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === delimiter) {
                fields.push(currentField);
                currentField = '';
            } else if (char === '"') {
                inQuotes = true;
            } else {
                currentField += char;
            }
        }
    }
    fields.push(currentField);
    return fields;
};

// --- Financials CSV ---
export const financialsToCsvString = (products) => {
    const headers = ['Product Name', 'Item Date', 'Item Description', 'Revenue', 'Cost'];
    const rows = (products || []).flatMap(p => 
        (p.items || []).map(i => [
            p.name, dateStringToJulian(i.date), i.description,
            i.type === 'revenue' ? i.amount : '', i.type === 'cost' ? i.amount : ''
        ])
    );
    const csvContent = [headers, ...rows].map(row => row.map(escapeCsvField).join(',')).join('\r\n');
    return '\uFEFF' + csvContent;
};

export const parseCsvToFinancials = (csvString) => {
    csvString = csvString.charCodeAt(0) === 0xFEFF ? csvString.slice(1) : csvString;
    const lines = csvString.split(/\r\n|\n|\r/).filter(line => line.trim());
    if (lines.length < 2) throw new Error("CSV must have a header and at least one data row.");

    const headerLine = lines.shift();
    const delimiter = (headerLine.match(/;/g) || []).length > (headerLine.match(/,/g) || []).length ? ';' : ',';
    const headers = parseCsvRow(headerLine, delimiter).map(h => h.trim().toLowerCase());
    
    if (!headers.includes('product name') || !headers.includes('item date') || !headers.includes('item description') || (!headers.includes('revenue') && !headers.includes('cost'))) {
        throw new Error(`CSV is missing required headers. Must include 'product name', 'item date', 'item description', and at least 'revenue' or 'cost'.`);
    }

    const h = (name) => headers.indexOf(name);
    const productsMap = new Map();

    for (const line of lines) {
        const data = parseCsvRow(line, delimiter);
        const productName = data[h('product name')];
        if (!productName) continue;

        if (!productsMap.has(productName)) {
            productsMap.set(productName, { id: `prod-${Date.now()}-${productsMap.size}`, name: productName, items: [] });
        }
        const product = productsMap.get(productName);

        const dateVal = data[h('item date')];
        const parsedDate = dateVal && !isNaN(Number(dateVal)) ? julianToDateString(Number(dateVal)) : parseFlexibleDate(dateVal || '');
        const description = data[h('item description')];
        const revenue = parseFloat(data[h('revenue')]?.replace(/[^0-9.-]+/g, '')) || 0;
        const cost = parseFloat(data[h('cost')]?.replace(/[^0-9.-]+/g, '')) || 0;

        if (!description || (!revenue && !cost)) continue;

        if (revenue > 0) product.items.push({ id: `item-${Date.now()}-rev`, date: parsedDate, description, amount: revenue, type: 'revenue' });
        if (cost > 0) product.items.push({ id: `item-${Date.now()}-cost`, date: parsedDate, description, amount: cost, type: 'cost' });
    }

    if (productsMap.size === 0) throw new Error("No valid financial line items could be parsed from the file.");
    return Array.from(productsMap.values());
};


// --- Measurements CSV ---
export const measurementsToCsvString = (measurements) => {
    const headers = ['Date', 'Old Width', 'Old Dis', 'Old Height', 'Old Qty', 'New Width', 'New Dis', 'New Height', 'New Qty'];
    const rows = (measurements || []).map(m => [
        dateStringToJulian(m.date), m.oldWidth, m.oldDis, m.oldHeight, m.oldQty,
        m.newWidth, m.newDis, m.newHeight, m.newQty
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(escapeCsvField).join(',')).join('\r\n');
    return '\uFEFF' + csvContent;
};

export const parseCsvToMeasurements = (csvString) => {
    csvString = csvString.charCodeAt(0) === 0xFEFF ? csvString.slice(1) : csvString;
    const lines = csvString.split(/\r\n|\n|\r/).filter(line => line.trim());
    if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row.");

    const headerLine = lines.shift();
    const delimiter = (headerLine.match(/;/g) || []).length > (headerLine.match(/,/g) || []).length ? ';' : ',';
    const headers = parseCsvRow(headerLine, delimiter).map(h => h.trim().toLowerCase().replace(/\s+/g, ' '));
    const requiredHeaders = ['date', 'old width', 'old height', 'old qty', 'new width', 'new height', 'new qty'];
    if (requiredHeaders.some(req => !headers.includes(req))) throw new Error(`CSV is missing required headers. Must include: ${requiredHeaders.join(', ')}`);
    
    const h = (name) => headers.indexOf(name);
    const measurementItems = [];

    for (const line of lines) {
        const data = parseCsvRow(line, delimiter);
        const dateVal = data[h('date')] || '';
        const parsedDate = dateVal && !isNaN(Number(dateVal)) ? julianToDateString(Number(dateVal)) : parseFlexibleDate(dateVal);
        
        const item = {
            id: `meas-${Date.now()}-${measurementItems.length}`, date: parsedDate,
            oldWidth: parseFloat(data[h('old width')]) || 0, oldHeight: parseFloat(data[h('old height')]) || 0,
            oldDis: data[h('old dis')] || '', oldQty: parseInt(data[h('old qty')], 10) || 0,
            newWidth: parseFloat(data[h('new width')]) || 0, newHeight: parseFloat(data[h('new height')]) || 0,
            newDis: data[h('new dis')] || '', newQty: parseInt(data[h('new qty')], 10) || 0,
        };
        measurementItems.push(item);
    }

    if (measurementItems.length === 0) throw new Error("No valid measurement data rows could be parsed.");
    return measurementItems;
};

// --- UI NOTIFICATIONS ---
export const showNotification = (message, type = 'info') => {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const icons = { success: 'bi-check-circle-fill', error: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
    const colors = { success: 'text-bg-success', error: 'text-bg-danger', info: 'text-bg-secondary' };
    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
        <div class="toast" role="alert" aria-live="assertive" aria-atomic="true" id="${toastId}">
            <div class="toast-header ${colors[type]} text-white">
                <i class="bi ${icons[type]} me-2"></i>
                <strong class="me-auto">${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">${message}</div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', toastHTML);

    const toastEl = document.getElementById(toastId);
    if (toastEl && window.bootstrap?.Toast) {
        const toast = new window.bootstrap.Toast(toastEl, { autohide: type !== 'error', delay: 5000 });
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove(), { once: true });
        toast.show();
    }
};
