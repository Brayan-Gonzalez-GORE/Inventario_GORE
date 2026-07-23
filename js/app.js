
const DATA = window.DATA || [];

const CAT_LABELS = {
  "DEP. ACUM. VEHICULO TERRESTRE": "Vehículos terrestres",
  "DEP. ACUM. MAQUINAS Y EQUIPOS DE OFICINA": "Máquinas y equipos de oficina",
  "DEP. ACUM. OTRAS MÁQUINAS Y EQUIPOS": "Otras máquinas y equipos",
  "DEP. ACUM. EQUIPOS DE COMUNICACIONES PARA REDES INFORMATICAS": "Equipos de comunicaciones / redes",
  "DEP. ACUM. EQUIPOS DE COMPUTACIONALES Y PERIFERICOS": "Equipos computacionales y periféricos",
  "DEP. ACUM. MUEBLES Y ENSERES": "Muebles y enseres"
};
function catLabel(c) {
  const found = adminData.categorias.find(x => x.key === c);
  return found ? found.label : (CAT_LABELS[c] || c || "Sin categoría");
}

const ORGANIGRAMA = [
  {
    group: 'Gobernador Regional y Directos',
    options: [
      'Gobernador Regional',
      'Secretaría Ejecutiva del Consejo Regional',
      'Departamento de Gabinete y Comunicaciones',
      'Unidad de Control'
    ]
  },
  {
    group: 'Administrador Regional y Directos',
    options: [
      'Administrador Regional',
      'Departamento Jurídico',
      'Unidad Provincial Osorno',
      'Unidad Provincial Palena',
      'Unidad Provincial Chiloé',
      'Unidad de Gestión Estratégica y Mejora Continua'
    ]
  },
  {
    group: 'División Infraestructura y Transportes',
    options: [
      'División Infraestructura y Transportes',
      'Departamento Infraestructura y Equipamiento Territorial',
      'Departamento Gestión en Transporte y Telecomunicaciones'
    ]
  },
  {
    group: 'División Planificación y Desarrollo Regional',
    options: [
      'División Planificación y Desarrollo Regional',
      'Departamento Planificación Estratégica y Políticas Públicas',
      'Departamento de Sostenibilidad y Desarrollo Territorial',
      'Departamento de Áreas Metropolitanas'
    ]
  },
  {
    group: 'División Fomento e Industria',
    options: [
      'División Fomento e Industria',
      'Departamento Fomento Económico Local',
      'Departamento de Innovación Regional',
      'Departamento Empresarial y Promoción de Inversiones'
    ]
  },
  {
    group: 'División Desarrollo Social y Humano',
    options: [
      'División Desarrollo Social y Humano',
      'Departamento Planes y Programas Sociales',
      'Departamento Fondos Concursables y Participación Ciudadana'
    ]
  },
  {
    group: 'División Presupuesto e Inversión Regional',
    options: [
      'División Presupuesto e Inversión Regional',
      'Departamento Inversión Complementaria',
      'Unidad Fondo Comunidad',
      'Unidad Administración de Programas',
      'Departamento de Inversiones y Proyectos',
      'Departamento Programación Presupuestaria'
    ]
  },
  {
    group: 'División Administración y Finanzas',
    options: [
      'División Administración y Finanzas',
      'Departamento Finanzas y Presupuesto',
      'Departamento Compras Públicas',
      'Departamento Gestión y Desarrollo Personas',
      'Unidad de Partes y Movilización',
      'Departamento de Tecnologías Digitales e Innovación'
    ]
  }
];

/* ===== Datos administrativos (categorías, ubicaciones, estados, usuarios) ===== */
let adminData = {
  categorias: [],
  ubicaciones: [],
  estados: [
    { name: 'Operativo', colorClass: 'teal' },
    { name: 'En Bodega', colorClass: 'amber' },
    { name: 'De Baja', colorClass: 'brick' },
  ],
  usuarios: []
};

function loadAdminData() {
  const saved = localStorage.getItem('gore_admin_data');
  if (saved) {
    try {
      adminData = JSON.parse(saved);
      return true;
    } catch (e) { console.error("Error parsing adminData", e); }
  }
  return false;
}

function saveAdminData() {
  localStorage.setItem('gore_admin_data', JSON.stringify(adminData));
}

function mergeAdminDataFromData() {
  if (!loadAdminData()) {
    adminData.categorias = [];
    adminData.ubicaciones = ORGANIGRAMA.map(g => ({ group: g.group, options: [...g.options] }));
    adminData.estados = [
      { name: 'Operativo', colorClass: 'teal' },
      { name: 'En Bodega', colorClass: 'amber' },
      { name: 'De Baja', colorClass: 'brick' },
    ];
  }

  migrateDivisiones();

  const allUbis = new Set();
  adminData.divisiones.forEach(div => {
    div.unidades.forEach(uni => {
      const prefix = `${div.nombre} - ${uni.nombre}`;
      allUbis.add(prefix);
      uni.dependencias.forEach(dep => {
        allUbis.add(`${prefix} - ${dep.nombre}`);
      });
    });
  });

  const historico = new Set();

  workingData.forEach(r => {
    if (r.cat && !adminData.categorias.some(c => c.key === r.cat)) {
      adminData.categorias.push({ key: r.cat, label: CAT_LABELS[r.cat] || r.cat });
    }
    if (r.ubicacion && !allUbis.has(r.ubicacion)) {
      historico.add(r.ubicacion);
    }
    const n = normEstado(r.estado);
    if (n && !adminData.estados.some(e => e.name === n)) {
      adminData.estados.push({ name: n, colorClass: 'slate' });
    }
  });

  if (historico.size > 0) {
    let histGroup = adminData.ubicaciones.find(g => g.group === 'Otras ubicaciones (Histórico)');
    if (!histGroup) {
      histGroup = { group: 'Otras ubicaciones (Histórico)', options: [] };
      adminData.ubicaciones.push(histGroup);
    }
    Array.from(historico).forEach(u => {
      if (!histGroup.options.includes(u)) histGroup.options.push(u);
    });
  }

  saveAdminData();
}
function normEstado(e) {
  if (!e) return null;
  const t = e.trim().toLowerCase();
  if (t === "de baja") return "De Baja";
  if (t === "en bodega") return "En Bodega";
  if (t === "operativo") return "Operativo";
  return e.trim();
}
function estadoBadgeClass(e) {
  const n = normEstado(e);
  const found = adminData.estados.find(x => x.name === n);
  return found ? `badge-${found.colorClass}` : 'badge-slate';
}

const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

function formatCurrency(v, currency) {
  if (v === null || v === undefined || v === '' || isNaN(v)) return '—';
  if (!currency || currency === 'CLP') return CLP.format(v);
  if (currency === 'DOLAR') return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
  if (currency === 'EURO') return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
  if (currency === 'UF') return NUM.format(v) + ' UF';
  if (currency === 'UTM') return NUM.format(v) + ' UTM';
  return NUM.format(v) + ' ' + currency;
}

function formatCL(v) {
  if (v === null || v === undefined || v === '') return '';
  const parts = String(v).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.join(',');
}
function parseCL(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/\./g, '').replace(/,/g, '.')) || 0;
}

function money(v, currency = 'CLP') { return formatCurrency(v, currency); }
function moneyShort(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  if (Math.abs(v) >= 1e9) return '$' + (v / 1e9).toFixed(1) + ' mil millones';
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'MM';
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + NUM.format(v);
}
function fmtDate(v) {
  if (!v) return '—';
  const [y, m, d] = v.split('-');
  return `${d}-${m}-${y}`;
}

let workingData = [];
try {
  const saved = localStorage.getItem('gore_bienes_data');
  if (saved) workingData = JSON.parse(saved);
  else workingData = DATA.slice();
} catch (e) {
  workingData = DATA.slice();
}

function saveWorkingData() {
  localStorage.setItem('gore_bienes_data', JSON.stringify(workingData));
}
let filtered = workingData.slice();
let selectedIds = new Set();
let currentPage = 1;
let PAGE_SIZE = 10;
let sortKey = null;
let sortDir = 1;

const COLUMNS = [
  { key: 'id', label: 'ID', num: true, w: '48px' },
  { key: 'cat', label: 'Categoría', render: r => `<span class="cat-tag">${catLabel(r.cat)}</span>` },
  { key: 'detalle', label: 'Detalle', render: r => `<span class="detalle-txt" title="${(r.detalle || '').replace(/"/g, '&quot;')}">${r.detalle || '—'}</span>` },
  { key: 'valorCompra', label: 'Valor Compra', num: true, render: r => money(r.valorCompra, r.moneda) },
  { key: 'vidaTotal', label: 'Vida Útil (m)', num: true, render: r => r.mesesVida || '—' },
  { key: 'dep2025', label: 'Dep. Acumulada', num: true, render: r => money(r.dep2025, r.moneda) },
  { key: 'valorLibro', label: 'Valor Libro', num: true, render: r => `<strong>${money(r.valorLibro, r.moneda)}</strong>` },
  { key: 'ubicacion', label: 'Ubicación', render: r => r.ubicacion || '—' },
  { key: 'estado', label: 'Estado', render: r => r.anioBaja ? `<span class="badge badge-brick">De Baja</span>` : (r.estado ? `<span class="badge ${estadoBadgeClass(r.estado)}">${normEstado(r.estado)}</span>` : `<span class="badge badge-slate">Sin registrar</span>`) },
];

function buildHeader() {
  const tr = document.getElementById('thead-row');
  tr.innerHTML = '<th style="width:32px; text-align:center;"><input type="checkbox" id="chk-all" title="Seleccionar página actual"></th>' +
    COLUMNS.map(c => `<th class="${c.num ? 'num' : ''}" data-key="${c.key}" style="${c.w ? `width:${c.w}` : ''}">${c.label}<span class="arrow">${sortKey === c.key ? (sortDir > 0 ? '▲' : '▼') : ''}</span></th>`).join('');
  tr.querySelectorAll('th[data-key]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (sortKey === key) { sortDir *= -1; } else { sortKey = key; sortDir = 1; }
      applySort();
      renderTable();
    });
  });

  const chkAll = document.getElementById('chk-all');
  if (chkAll) {
    chkAll.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const start = (currentPage - 1) * PAGE_SIZE;
      const pageRows = filtered.slice(start, start + PAGE_SIZE);
      pageRows.forEach(r => {
        if (isChecked) selectedIds.add(r.id);
        else selectedIds.delete(r.id);
      });
      renderTable();
    });
  }
}

function applySort() {
  if (!sortKey) return;
  filtered.sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey];
    if (va === null || va === undefined) va = typeof vb === 'number' ? -Infinity : '';
    if (vb === null || vb === undefined) vb = typeof va === 'number' ? -Infinity : '';
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return -1 * sortDir;
    if (va > vb) return 1 * sortDir;
    return 0;
  });
}

function populateSelect(id, values, formatter) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = sel.querySelector('option') ? sel.querySelector('option').outerHTML : '';
  values.forEach(v => {
    if (v && typeof v === 'object' && v.group && v.options) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = v.group;

      let deptos = [];
      let subOffices = [];
      v.options.forEach(o => {
        if (typeof o === 'string' && o.startsWith(v.group + " - ")) {
          subOffices.push({ val: o, rendered: false });
        } else {
          deptos.push(o);
        }
      });

      deptos.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = formatter ? formatter(d) : d;
        optgroup.appendChild(opt);

        const deptoPrefix = `${v.group} - ${d} - `;
        subOffices.forEach(sub => {
          if (sub.val.startsWith(deptoPrefix)) {
            const detailName = sub.val.substring(deptoPrefix.length);
            const subOpt = document.createElement('option');
            subOpt.value = sub.val;
            subOpt.innerHTML = `&nbsp;&nbsp;↳ ${formatter ? formatter(detailName) : detailName}`;
            optgroup.appendChild(subOpt);
            sub.rendered = true;
          }
        });
      });

      subOffices.forEach(sub => {
        if (!sub.rendered) {
          const subOpt = document.createElement('option');
          subOpt.value = sub.val;
          subOpt.innerHTML = `&nbsp;&nbsp;↳ ${formatter ? formatter(sub.val) : sub.val}`;
          optgroup.appendChild(subOpt);
        }
      });

      sel.appendChild(optgroup);
    } else {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = formatter ? formatter(v) : v;
      sel.appendChild(opt);
    }
  });
  sel.value = current;
}

function initFilterOptions() {
  populateSelect('f-cat', adminData.categorias.map(c => c.key), catLabel);
  populateSelect('f-ubicacion', adminData.ubicaciones);
  populateSelect('f-estado', adminData.estados.map(e => e.name));
  
  // Rellenar dinámicamente el año de baja
  const anios = [...new Set(workingData.map(r => r.anioBaja).filter(Boolean))].sort((a, b) => b - a);
  populateSelect('f-anio-baja', anios);
}

function currentFilters() {
  return {
    search: document.getElementById('f-search').value.trim().toLowerCase(),
    cat: document.getElementById('f-cat').value,
    ubicacion: document.getElementById('f-ubicacion').value,
    estado: document.getElementById('f-estado').value,
    soloBaja: document.getElementById('f-baja').checked,
    
    // Filtros avanzados
    recepcionInicio: document.getElementById('f-recepcion-inicio').value,
    recepcionFin: document.getElementById('f-recepcion-fin').value,
    compraMin: toNumOrNull(document.getElementById('f-compra-min').value),
    compraMax: toNumOrNull(document.getElementById('f-compra-max').value),
    factura: document.getElementById('f-factura').value.trim().toLowerCase(),
    rut: document.getElementById('f-rut').value.trim().toLowerCase(),
    responsable: document.getElementById('f-responsable').value.trim().toLowerCase(),
    anioBaja: document.getElementById('f-anio-baja').value,
  };
}

function applyFilters() {
  const f = currentFilters();
  filtered = workingData.filter(r => {
    if (f.soloBaja && !r.anioBaja) return false;
    if (f.cat && r.cat !== f.cat) return false;
    if (f.ubicacion && r.ubicacion !== f.ubicacion) return false;
    if (f.estado && normEstado(r.estado) !== f.estado) return false;
    if (f.search) {
      const hay = [r.detalle, r.rut, r.codigo, r.responsable, String(r.id), r.factura]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(f.search)) return false;
    }
    
    // Filtros avanzados
    if (f.recepcionInicio && (!r.fRecepcion || r.fRecepcion < f.recepcionInicio)) return false;
    if (f.recepcionFin && (!r.fRecepcion || r.fRecepcion > f.recepcionFin)) return false;
    
    if (f.compraMin !== null && (r.valorCompra === null || r.valorCompra === undefined || r.valorCompra < f.compraMin)) return false;
    if (f.compraMax !== null && (r.valorCompra === null || r.valorCompra === undefined || r.valorCompra > f.compraMax)) return false;
    
    if (f.factura && !String(r.factura || '').toLowerCase().includes(f.factura)) return false;
    if (f.rut && !String(r.rut || '').toLowerCase().includes(f.rut)) return false;
    if (f.responsable && !String(r.responsable || '').toLowerCase().includes(f.responsable)) return false;
    if (f.anioBaja && String(r.anioBaja) !== f.anioBaja) return false;
    
    return true;
  });
  applySort();
  currentPage = 1;
  renderTable();
  renderFilterSummary();
}

function renderFilterSummary() {
  document.getElementById('filter-count').textContent = `${filtered.length} de ${workingData.length} bienes`;
  document.getElementById('filter-summary').textContent =
    filtered.length === workingData.length
      ? 'Mostrando todos los bienes del registro.'
      : `Filtro activo — ${filtered.length} resultado(s).`;
}

function renderTable() {
  buildHeader();
  const tbody = document.getElementById('tbody');
  const empty = document.getElementById('empty-state');
  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(start, start + PAGE_SIZE);

    const allSelected = pageRows.length > 0 && pageRows.every(r => selectedIds.has(r.id));
    const chkAll = document.getElementById('chk-all');
    if (chkAll) chkAll.checked = allSelected;

    tbody.innerHTML = pageRows.map(r => `
      <tr data-id="${r.id}" class="${selectedIds.has(r.id) ? 'selected-row' : ''}">
        <td style="width:32px; text-align:center;"><input type="checkbox" class="chk-row" data-id="${r.id}" ${selectedIds.has(r.id) ? 'checked' : ''}></td>
        ${COLUMNS.map(c => `<td data-label="${c.label}" class="${c.num ? 'num' : ''} ${c.key === 'id' ? 'mono' : ''} ${c.key === 'detalle' ? 'detalle' : ''}">${c.render ? c.render(r) : (r[c.key] ?? '—')}</td>`).join('')}
      </tr>
    `).join('');

    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'input' && e.target.type === 'checkbox') {
          const id = Number(e.target.dataset.id);
          if (e.target.checked) selectedIds.add(id);
          else selectedIds.delete(id);
          if (selectedIds.has(id)) tr.classList.add('selected-row');
          else tr.classList.remove('selected-row');
          updateBulkMoveButton();

          const allPageSelected = pageRows.every(r => selectedIds.has(r.id));
          if (chkAll) chkAll.checked = allPageSelected;
          return;
        }
        openFicha(Number(tr.dataset.id));
      });
    });
  }
  renderPagination();
  updateBulkMoveButton();
}

function updateBulkMoveButton() {
  const btn = document.getElementById('btn-bulk-move');
  const btnPrint = document.getElementById('btn-print-qr');
  if (!btn) return;
  if (selectedIds.size > 0) {
    btn.style.display = 'inline-flex';
    btn.textContent = `Mover Seleccionados (${selectedIds.size})`;
    if (btnPrint) {
      btnPrint.style.display = 'inline-flex';
      btnPrint.textContent = `Imprimir QRs (${selectedIds.size})`;
    }
  } else {
    btn.style.display = 'none';
    if (btnPrint) btnPrint.style.display = 'none';
  }
}

document.getElementById('btn-print-qr')?.addEventListener('click', () => {
  const printArea = document.getElementById('print-area');
  if (!printArea) return;
  printArea.innerHTML = '';
  
  const selectedAssets = workingData.filter(a => selectedIds.has(a.id));
  
  selectedAssets.forEach(asset => {
    const card = document.createElement('div');
    card.className = 'qr-card';
    
    const qrDiv = document.createElement('div');
    card.appendChild(qrDiv);
    
    const info = document.createElement('p');
    const detalleCorto = asset.detalle.length > 30 ? asset.detalle.substring(0, 30) + '...' : asset.detalle;
    info.innerHTML = `<strong>${asset.codigo || 'S/C'}</strong>${detalleCorto}<br>ID: ${asset.id}`;
    card.appendChild(info);
    
    printArea.appendChild(card);
    
    new QRCode(qrDiv, {
      text: asset.codigo || String(asset.id),
      width: 100,
      height: 100
    });
  });
  
  setTimeout(() => window.print(), 300);
});

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  if (filtered.length === 0) {
    document.getElementById('page-info').textContent = 'Sin resultados';
  } else {
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(currentPage * PAGE_SIZE, filtered.length);
    document.getElementById('page-info').textContent = `Bienes ${start}-${end} de ${filtered.length}`;
  }
  document.getElementById('page-current').textContent = `Pág. ${currentPage} / ${totalPages}`;
  document.getElementById('page-first').disabled = currentPage <= 1;
  document.getElementById('page-prev').disabled = currentPage <= 1;
  document.getElementById('page-next').disabled = currentPage >= totalPages;
  document.getElementById('page-last').disabled = currentPage >= totalPages;
}

document.getElementById('page-first').addEventListener('click', () => { currentPage = 1; renderTable(); });
document.getElementById('page-prev').addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); renderTable(); });
document.getElementById('page-next').addEventListener('click', () => { currentPage++; renderTable(); });
document.getElementById('page-last').addEventListener('click', () => { currentPage = Math.ceil(filtered.length / PAGE_SIZE); renderTable(); });

// Alternar panel de filtros avanzados
const btnToggle = document.getElementById('btn-toggle-advanced');
const advancedPanel = document.getElementById('advanced-filters');
if (btnToggle && advancedPanel) {
  btnToggle.addEventListener('click', () => {
    const isExpanded = advancedPanel.classList.toggle('expanded');
    btnToggle.classList.toggle('active', isExpanded);
  });
}

let searchTimer;
document.getElementById('f-search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 180);
});

// Event listeners para cambios inmediatos (select y fecha)
['f-cat', 'f-ubicacion', 'f-estado', 'f-recepcion-inicio', 'f-recepcion-fin', 'f-anio-baja'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', applyFilters);
});

document.getElementById('f-baja').addEventListener('change', applyFilters);

// Event listeners para campos de texto/número con debounce
let advancedTimer;
['f-compra-min', 'f-compra-max', 'f-factura', 'f-rut', 'f-responsable'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => {
    clearTimeout(advancedTimer);
    advancedTimer = setTimeout(applyFilters, 180);
  });
});

document.getElementById('btn-clear-filters').addEventListener('click', () => {
  document.getElementById('f-search').value = '';
  document.getElementById('f-cat').value = '';
  document.getElementById('f-ubicacion').value = '';
  document.getElementById('f-estado').value = '';
  document.getElementById('f-baja').checked = false;
  
  // Limpiar campos avanzados
  document.getElementById('f-recepcion-inicio').value = '';
  document.getElementById('f-recepcion-fin').value = '';
  document.getElementById('f-compra-min').value = '';
  document.getElementById('f-compra-max').value = '';
  document.getElementById('f-factura').value = '';
  document.getElementById('f-rut').value = '';
  document.getElementById('f-responsable').value = '';
  document.getElementById('f-anio-baja').value = '';
  
  applyFilters();
});

document.getElementById('page-size-select')?.addEventListener('change', function () {
  PAGE_SIZE = Number(this.value) || 10;
  currentPage = 1;
  renderTable();
});

/* ===== KPIs ===== */
function renderKPIs() {
  const activos = workingData.filter(r => !r.anioBaja);
  const bajas = workingData.filter(r => r.anioBaja);
  const totalCompra = workingData.reduce((s, r) => s + (r.valorCompra || 0), 0);
  const totalDep2025 = workingData.reduce((s, r) => s + (r.depAnio2025 || 0), 0);
  const totalLibro = activos.reduce((s, r) => s + (r.valorLibro || 0), 0);
  const inventariados = workingData.filter(r => r.estado).length;

  const kpis = [
    { label: 'Total de bienes', value: NUM.format(workingData.length), sub: `${activos.length} activos · ${bajas.length} de baja` },
    { label: 'Valor de adquisición', value: moneyShort(totalCompra), sub: 'Suma histórica de compra', accent: '' },
    { label: 'Depreciación 2025', value: moneyShort(totalDep2025), sub: 'Gasto del ejercicio', accent: 'brick' },
    { label: 'Valor libro vigente', value: moneyShort(totalLibro), sub: 'Bienes activos, neto', accent: 'teal' },
    { label: 'Dados de baja', value: NUM.format(bajas.length), sub: `${((bajas.length / workingData.length) * 100).toFixed(1)}% del total`, accent: 'brick' },
    { label: 'Con inventario físico', value: NUM.format(inventariados), sub: `${((inventariados / workingData.length) * 100).toFixed(1)}% con ficha registrada`, accent: 'teal' },
  ];
  document.getElementById('kpi-grid').innerHTML = kpis.map(k => `
    <div class="kpi ${k.accent ? `kpi-accent-${k.accent}` : ''}">
      <p class="kpi-label">${k.label}</p>
      <p class="kpi-value">${k.value}</p>
      <p class="kpi-sub">${k.sub}</p>
    </div>
  `).join('');
}

/* ===== Chart: bars por categoría ===== */
const CHART_COLORS = ['#00539A', '#3B9144', '#F59120', '#8CD5F6', '#64748B', '#0F172A'];
function renderBarChart() {
  const svg = document.getElementById('chart-bars');
  const byCat = {};
  workingData.forEach(r => {
    const c = r.cat || 'Sin categoría';
    byCat[c] = (byCat[c] || 0) + (r.anioBaja ? 0 : (r.valorLibro || 0));
  });
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(e => e[1]), 1);
  const W = 640, H = 220, padL = 8, padR = 8, barH = 26, gap = 12;
  const barStartX = 220;
  const chartW = W - padL - padR - 220;
  let svgHtml = '';
  entries.forEach((([name, val], i) => {
    const y = i * (barH + gap) + 8;
    const w = Math.max(2, (val / max) * chartW);
    const color = CHART_COLORS[i % CHART_COLORS.length];
    svgHtml += `
      <text x="${barStartX - 10}" y="${y + barH / 2 + 4}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="12" fill="#4B5563">${catLabel(name)}</text>
      <rect x="${barStartX}" y="${y}" width="${chartW}" height="${barH}" fill="#E2E8F0"></rect>
      <rect x="${barStartX}" y="${y}" width="${w}" height="${barH}" fill="${color}"></rect>
      <text x="${barStartX + chartW + 8}" y="${y + barH / 2 + 4}" font-family="JetBrains Mono, monospace" font-size="13" font-weight="600" fill="#0F172A">${moneyShort(val)}</text>
    `;
  }));
  svg.setAttribute('viewBox', `0 0 640 ${entries.length * (barH + gap) + 16}`);
  svg.innerHTML = svgHtml;
}

/* ===== Chart: donut estado inventario ===== */
function renderDonut() {
  const svg = document.getElementById('chart-donut');
  const legend = document.getElementById('donut-legend');
  const counts = {};
  workingData.forEach(r => {
    const key = r.estado ? normEstado(r.estado) : 'Sin registrar';
    counts[key] = (counts[key] || 0) + 1;
  });
  const colorMap = { 'Operativo': '#3B9144', 'En Bodega': '#F59120', 'De Baja': '#DC2626', 'Sin registrar': '#CBD5E1' };
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = workingData.length;
  const cx = 70, cy = 70, r = 58, rInner = 34;
  let angle = -90;
  let paths = '';
  entries.forEach(([name, val]) => {
    const frac = val / total;
    const sweep = frac * 360;
    const large = sweep > 180 ? 1 : 0;
    const a1 = angle * Math.PI / 180, a2 = (angle + sweep) * Math.PI / 180;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const color = colorMap[name] || '#5B6472';
    paths += `<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${color}"></path>`;
    angle += sweep;
  });
  svg.innerHTML = paths + `<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="#FFFFFF"></circle>
    <text x="${cx}" y="${cy - 3}" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="600" fill="#0F172A">${total}</text>
    <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="#64748B">BIENES</text>`;
  legend.innerHTML = entries.map(([name, val]) => `
    <li><span class="legend-swatch" style="background:${colorMap[name] || '#5B6472'}"></span>
    <span class="legend-name">${name}</span>
    <span class="legend-val">${val} · ${((val / total) * 100).toFixed(0)}%</span></li>
  `).join('');
}

/* ===== Ficha detalle ===== */
let currentFichaId = null;

function openFicha(id) {
  const r = workingData.find(x => x.id === id);
  if (!r) return;
  currentFichaId = id;
  document.getElementById('ficha-id').textContent = String(r.id).padStart(4, '0');
  document.getElementById('ficha-titulo').textContent = r.detalle || 'Bien sin detalle';

  const body = document.getElementById('ficha-body');
  let html = '';

  html += `<div class="ficha-qr">
    <div class="ficha-qr-icon">QR</div>
    <div>
      <p class="ficha-qr-label">Código / N° de serie</p>
      <p class="ficha-qr-code">${r.codigo || 'No registrado'}</p>
    </div>
  </div>`;

  const presentYear = new Date().getFullYear();

  html += fichaSection('Identificación y compra', [
    ['Categoría contable', catLabel(r.cat)],
    ['Cuenta contable', r.cta],
    ['Tipo de bien', r.tipoBien],
    ['RUT proveedor', r.rut],
    ['N° factura', r.factura],
    ['Fecha factura', fmtDate(r.fFactura)],
    ['N° egreso', r.egreso],
    ['Fecha recepción', fmtDate(r.fRecepcion)],
    ['Valor bien comprado', money(r.valorCompra, r.moneda)],
    ['Meses vida útil', r.mesesVida],
  ]);

  html += fichaSection('Depreciación (Automática)', [
    ['Vida útil restante (meses)', r.vidaActual],
    [`Dep. acumulada ${presentYear}`, money(r.dep2024, r.moneda)],
    [`Dep. acumulada ${presentYear + 1}`, money(r.dep2025, r.moneda)],
    [`Dep. del año ${presentYear + 1}`, money(r.depAnio2025, r.moneda)],
    ['Valor libro actual', money(r.valorLibro, r.moneda)],
  ]);

  if (r.anioBaja) {
    html += fichaSection('Baja del bien', [
      ['Año de baja', r.anioBaja],
      ['Resolución', r.resolucion],
      ['Vida útil al momento de baja', r.vidaBaja],
      ['Dep. acumulada a la baja', money(r.depBaja, r.moneda)],
      ['Valor libro a la baja', money(r.valorBaja, r.moneda)],
    ]);
    if (r.obsBaja) html += `<div class="ficha-note">${r.obsBaja}</div>`;
  }

  html += fichaSection('Inventario físico', [
    ['Ubicación', r.ubicacion || 'No registrado'],
    ['Estado', r.estado ? normEstado(r.estado) : 'Sin registrar'],
    ['Responsable de registro', r.responsable || '—'],
    ['Fecha de registro/modificación', fmtDate(r.fRegistro)],
  ]);
  if (r.obsInv) html += `<div class="ficha-note">${r.obsInv}</div>`;

  body.innerHTML = html;

  document.getElementById('ficha').classList.add('open');
  document.getElementById('ficha').setAttribute('aria-hidden', 'false');
  document.getElementById('scrim').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function fichaSection(title, rows) {
  const rowsHtml = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<div class="ficha-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  if (!rowsHtml) return '';
  return `<div class="ficha-section"><p class="ficha-section-title">${title}</p><div class="ficha-rows">${rowsHtml}</div></div>`;
}
function closeFicha() {
  currentFichaId = null;
  document.getElementById('ficha').classList.remove('open');
  document.getElementById('ficha').setAttribute('aria-hidden', 'true');
  document.getElementById('scrim').classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('ficha-close').addEventListener('click', closeFicha);
document.getElementById('scrim').addEventListener('click', closeFicha);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFicha(); });

/* ===== Importar archivo ===== */
const HEADER_MAP = [
  ['id', 'ID'], ['cta', 'CTA. CONTABLE'], ['cat', 'NOMBRE CTA. CONTABLE'], ['detalle', 'DETALLE'],
  ['tipoBien', 'TIPO DE BIEN'], ['rut', 'RUT'], ['factura', 'FACTURA'], ['fFactura', 'FECHA FACTURA'],
  ['egreso', 'EGRESO'], ['fRecepcion', 'FECHA DE RECEPCIÓN'], ['valorCompra', 'VALOR BIEN COMPRADO'],
  ['mesesVida', 'MESES VIDA ÚTIL'], ['vidaActual', 'VIDA UTIL ACTUAL'], ['dep2024', 'DEPRECIACIÓN ACUMULADA 2024'],
  ['dep2025', 'DEPRECIACIÓN ACUMULADA 2025'], ['depAnio2025', 'DEPRECIACIÓN AÑO 2025'], ['valorLibro', 'VALOR DEL BIEN'],
  ['anioBaja', 'AÑO DE BAJA'], ['resolucion', 'RESOLUCIÓN'], ['vidaBaja', 'VIDA UTIL AL MOMENTO DE BAJA'],
  ['depBaja', 'DEPRECIACIÓN ACUMULADA'], ['valorBaja', 'VALOR DEL BIEN'], ['obsBaja', 'OBSERVACIONES'],
  ['codigo', 'Código QR/Barras/N°Serie'], ['ubicacion', 'Ubicación'], ['fRegistro', 'Fecha Registro/Modificación'],
  ['responsable', 'Responsable Registro'], ['estado', 'Estado'], ['obsInv', 'Observaciones'],
];

function excelDateToISO(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
function toNumOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function toStrOrNull(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return (s === '' || s.toLowerCase() === 'nan') ? null : s;
}
const DATE_FIELDS = new Set(['fFactura', 'fRecepcion', 'fRegistro']);
const NUM_FIELDS = new Set(['id', 'valorCompra', 'mesesVida', 'vidaActual', 'dep2024', 'dep2025', 'depAnio2025', 'valorLibro', 'anioBaja', 'vidaBaja', 'depBaja', 'valorBaja']);

function mapImportedRows(aoa) {
  const headerRow = aoa[0].map(h => String(h || '').trim());
  const usedCols = new Set();
  const mapping = []; // {field, colIndex}
  HEADER_MAP.forEach(([field, headerName]) => {
    for (let i = 0; i < headerRow.length; i++) {
      if (headerRow[i] === headerName && !usedCols.has(i)) {
        mapping.push({ field, col: i });
        usedCols.add(i);
        return;
      }
    }
  });
  const rows = [];
  for (let r = 1; r < aoa.length; r++) {
    const raw = aoa[r];
    if (!raw || raw.every(c => c === undefined || c === null || c === '')) continue;
    const rec = {};
    mapping.forEach(({ field, col }) => {
      let v = raw[col];
      if (DATE_FIELDS.has(field)) v = excelDateToISO(v);
      else if (NUM_FIELDS.has(field)) v = toNumOrNull(v);
      else v = toStrOrNull(v);
      rec[field] = v;
    });
    if (rec.id === undefined || rec.id === null) rec.id = r;
    rows.push(rec);
  }
  return rows;
}

function refreshAll() {
  mergeAdminDataFromData();
  initFilterOptions();
  renderKPIs();
  renderBarChart();
  renderDonut();
  applyFilters();
}

document.getElementById('file-input').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const wb = XLSX.read(evt.target.result, { type: 'binary', cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
      const rows = mapImportedRows(aoa);
      if (rows.length === 0) {
        alert('No se encontraron filas de datos reconocibles en el archivo. Verificá que la primera fila tenga los mismos encabezados de la planilla original.');
        return;
      }
      workingData = rows;
      refreshAll();
    } catch (err) {
      alert('No se pudo leer el archivo: ' + err.message);
    }
  };
  reader.readAsBinaryString(file);
  e.target.value = '';
});

document.getElementById('btn-restore').addEventListener('click', function () {
  workingData = DATA.slice();
  refreshAll();
});

/* ===== Exportar CSV filtrado ===== */
document.getElementById('btn-export').addEventListener('click', function () {
  const headers = ['ID', 'Categoría', 'Detalle', 'RUT', 'Valor compra', 'Meses vida útil', 'Dep. 2025', 'Valor libro', 'Año baja', 'Ubicación', 'Estado', 'Responsable'];
  const lines = [headers.join(';')];
  filtered.forEach(r => {
    lines.push([
      r.id, catLabel(r.cat), (r.detalle || '').replace(/;/g, ','), r.rut || '',
      r.valorCompra ?? '', r.mesesVida ?? '', r.depAnio2025 ?? '', r.valorLibro ?? '',
      r.anioBaja ?? '', r.ubicacion || '', r.estado || '', r.responsable || ''
    ].join(';'));
  });
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'activos_filtrado.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
/* ===== Sidebar ===== */
const dashboardShell = document.querySelector('.dashboard-shell');
const sidebar = document.getElementById('sidebar');
const sidebarScrim = document.getElementById('sidebar-scrim');

document.getElementById('btn-open-sidebar').addEventListener('click', () => {
  const isOpen = dashboardShell.classList.toggle('sidebar-open');
  sidebarScrim.classList.toggle('open');
  if (window.innerWidth <= 900) {
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }
});
function closeSidebar() {
  dashboardShell.classList.remove('sidebar-open');
  sidebarScrim.classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('sidebar-scrim').addEventListener('click', closeSidebar);

document.addEventListener('click', function (e) {
  const btnToggle = document.getElementById('btn-open-sidebar');
  if (dashboardShell.classList.contains('sidebar-open')) {
    if (!sidebar.contains(e.target) && !btnToggle.contains(e.target) && !sidebarScrim.contains(e.target)) {
      closeSidebar();
    }
  }
});

function switchView(view) {
  if (!view) view = 'dashboard';

  const targetView = document.getElementById('view-' + view);
  if (!targetView) {
    view = 'dashboard';
  }

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');

  document.querySelectorAll('.sidebar-link').forEach(a => a.classList.remove('active'));
  const link = document.querySelector(`.sidebar-link[data-view="${view}"]`);
  if (link) link.classList.add('active');

  if (view === 'categorias') renderCategorias();
  if (view === 'ubicaciones') renderUbicaciones();
  if (view === 'estados') renderEstados();
  if (view === 'usuarios') renderUsuarios();
}

window.addEventListener('hashchange', () => {
  let hash = window.location.hash.substring(1);
  switchView(hash);
});

document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const view = link.dataset.view;
    window.location.hash = view;
    if (window.innerWidth <= 900) {
      closeSidebar();
    }
  });
});

/* ===== CRUD: Categorías ===== */
let catPage = 1;
let catPageSize = 10;

function renderCategorias() {
  saveAdminData();
  const start = (catPage - 1) * catPageSize;
  const pageItems = adminData.categorias.slice(start, start + catPageSize);

  document.getElementById('tbody-categorias').innerHTML = pageItems.map((c) => {
    const originalIndex = adminData.categorias.indexOf(c);
    return `
      <tr>
        <td class="mono">${c.key}</td>
        <td>${c.label}</td>
        <td><button class="btn btn-line btn-sm" onclick="eliminarCategoria(${originalIndex})">Eliminar</button></td>
      </tr>
    `;
  }).join('');

  renderCatPagination();
}

function renderCatPagination() {
  const total = adminData.categorias.length;
  const totalPages = Math.max(1, Math.ceil(total / catPageSize));
  catPage = Math.min(catPage, totalPages);

  const infoEl = document.getElementById('cat-page-info');
  if (infoEl) {
    if (total === 0) infoEl.textContent = 'Sin resultados';
    else {
      const start = (catPage - 1) * catPageSize + 1;
      const end = Math.min(catPage * catPageSize, total);
      infoEl.textContent = `Categorías ${start}-${end} de ${total}`;
    }
  }

  const curEl = document.getElementById('cat-page-current');
  if (curEl) curEl.textContent = `Pág. ${catPage} / ${totalPages}`;

  const btnFirst = document.getElementById('cat-page-first');
  const btnPrev = document.getElementById('cat-page-prev');
  const btnNext = document.getElementById('cat-page-next');
  const btnLast = document.getElementById('cat-page-last');

  if (btnFirst) btnFirst.disabled = catPage <= 1;
  if (btnPrev) btnPrev.disabled = catPage <= 1;
  if (btnNext) btnNext.disabled = catPage >= totalPages;
  if (btnLast) btnLast.disabled = catPage >= totalPages;
}

function eliminarCategoria(i) {
  const cat = adminData.categorias[i];
  if (workingData.some(r => r.cat === cat.key)) {
    alert('No se puede eliminar: hay bienes registrados con esta categoría.');
    return;
  }
  adminData.categorias.splice(i, 1);
  renderCategorias();
  initFilterOptions();
}

document.getElementById('form-categoria').addEventListener('submit', function (e) {
  e.preventDefault();
  const key = document.getElementById('cat-key').value.trim();
  const label = document.getElementById('cat-label').value.trim();
  if (adminData.categorias.some(c => c.key === key)) { alert('Ya existe una categoría con ese código.'); return; }
  adminData.categorias.push({ key, label });
  this.reset();
  catPage = 1;
  renderCategorias();
  initFilterOptions();
});

document.getElementById('cat-page-first')?.addEventListener('click', () => { catPage = 1; renderCategorias(); });
document.getElementById('cat-page-prev')?.addEventListener('click', () => { catPage = Math.max(1, catPage - 1); renderCategorias(); });
document.getElementById('cat-page-next')?.addEventListener('click', () => { catPage++; renderCategorias(); });
document.getElementById('cat-page-last')?.addEventListener('click', () => { catPage = Math.ceil(adminData.categorias.length / catPageSize); renderCategorias(); });
document.getElementById('cat-page-size')?.addEventListener('change', function () {
  catPageSize = Number(this.value) || 10;
  catPage = 1;
  renderCategorias();
});

function renderDatalistDetalles() {
  const setDetalles = new Set();

  adminData.ubicaciones.forEach(g => {
    if (g.group && g.options) {
      g.options.forEach(o => {
        const prefix = g.group + " - ";
        if (typeof o === 'string' && o.startsWith(prefix)) {
          const arr = o.split(' - ');
          if (arr.length >= 3) {
            setDetalles.add(arr.slice(2).join(' - ').trim());
          }
        }
      });
    } else {
      const name = g.name || g;
      const arr = name.split(' - ');
      if (arr.length >= 3) {
        setDetalles.add(arr.slice(2).join(' - ').trim());
      } else {
        setDetalles.add(name.trim());
      }
    }
  });

  const dl = document.getElementById('detalles-list');
  if (dl) {
    dl.innerHTML = Array.from(setDetalles)
      .filter(d => d.length > 0)
      .sort()
      .map(d => `<option value="${d}">`)
      .join('');
  }
}

/* ===== CRUD: Ubicaciones (Jerárquico) ===== */
function renderUbicaciones() {
  saveAdminData();
  const tbody = document.getElementById('tbody-ubicaciones');
  let html = '';

  if (!adminData.divisiones || adminData.divisiones.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding: 24px; color:#94a3b8;">No hay ubicaciones registradas</td></tr>';
    return;
  }

  adminData.divisiones.forEach(div => {
    // Fila de División
    const dirStr = div.direccion ? `📍 ${div.direccion}` : '';
    const edfStr = div.edificio ? `🏢 ${div.edificio}` : '';
    let meta = '';
    if (dirStr || edfStr) {
      meta = `<div style="font-size:11px; color:#94a3b8; margin-top:4px;">${dirStr} ${edfStr}</div>`;
    }

    html += `<tr>
      <td style="font-weight:600; font-size:14px; padding: 12px 16px;">
        ${div.nombre}
        ${meta}
      </td>
      <td style="white-space:nowrap; text-align:right;">
        <button class="btn btn-line btn-sm" onclick="abrirTreeModal('editar', 'division', '${div.id}')">Editar</button>
        <button class="btn btn-line btn-sm" onclick="eliminarTree('division', '${div.id}')">Eliminar</button>
      </td>
    </tr>`;

    // Unidades
    div.unidades.forEach(uni => {
      html += `<tr>
        <td style="padding-left: 32px; font-weight:500; font-size:13px; color:#475569; border-left: 2px solid #e2e8f0;">
          📁 ${uni.nombre}
        </td>
        <td style="white-space:nowrap; text-align:right;">
          <button class="btn btn-line btn-sm" onclick="abrirTreeModal('editar', 'unidad', '${uni.id}')">Editar</button>
          <button class="btn btn-line btn-sm" onclick="eliminarTree('unidad', '${uni.id}')">Eliminar</button>
        </td>
      </tr>`;

      // Dependencias
      uni.dependencias.forEach(dep => {
        html += `<tr>
          <td style="padding-left: 56px; font-size:13px; color:#64748b; border-left: 2px solid #e2e8f0;">
            ↳ ${dep.nombre}
          </td>
          <td style="white-space:nowrap; text-align:right;">
            <button class="btn btn-line btn-sm" onclick="abrirTreeModal('editar', 'dependencia', '${dep.id}')">Editar</button>
            <button class="btn btn-line btn-sm" onclick="eliminarTree('dependencia', '${dep.id}')">Eliminar</button>
          </td>
        </tr>`;
      });
    });
  });

  tbody.innerHTML = html;
  initFilterOptions();
}

/* Lógica del Modal del Árbol (Tree Modal) */
const treeModal = document.getElementById('tree-modal');
const treeScrim = document.getElementById('tree-modal-scrim');
const treeTipoSelect = document.getElementById('tree-tipo');

document.getElementById('btn-add-ubicacion')?.addEventListener('click', () => {
  abrirTreeModal('crear', 'division');
});

treeTipoSelect.addEventListener('change', function () {
  actualizarCamposTreeModal(this.value);
});

function actualizarCamposTreeModal(tipo) {
  const fDiv = document.getElementById('tree-field-division');
  const fUni = document.getElementById('tree-field-unidad');
  const fDir = document.getElementById('tree-field-direccion');
  const fEdf = document.getElementById('tree-field-edificio');
  const lblNombre = document.getElementById('tree-lbl-nombre');

  fDiv.style.display = 'none';
  fUni.style.display = 'none';
  fDir.style.display = 'none';
  fEdf.style.display = 'none';

  // Poblar divisiones
  const selDiv = document.getElementById('tree-sel-division');
  selDiv.innerHTML = '<option value="">-- Seleccione División --</option>' +
    adminData.divisiones.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('');

  if (tipo === 'division') {
    fDir.style.display = 'block';
    fEdf.style.display = 'block';
    lblNombre.textContent = 'Nombre de División / Repartición';
  } else if (tipo === 'unidad') {
    fDiv.style.display = 'block';
    lblNombre.textContent = 'Nombre de Departamento / Unidad';
  } else if (tipo === 'dependencia') {
    fDiv.style.display = 'block';
    fUni.style.display = 'block';
    lblNombre.textContent = 'Nombre de Dependencia (Oficina, etc)';

    // Auto-update units when division changes
    selDiv.onchange = function () {
      const d = adminData.divisiones.find(x => x.id === this.value);
      const selUni = document.getElementById('tree-sel-unidad');
      if (d) {
        selUni.innerHTML = '<option value="">-- Seleccione Unidad --</option>' +
          d.unidades.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');
      } else {
        selUni.innerHTML = '<option value="">-- Seleccione División primero --</option>';
      }
    };
    selDiv.onchange(); // trigger initial
  }
}

window.abrirTreeModal = function (action, tipo, id = null) {
  document.getElementById('tree-action').value = action; // 'crear' o 'editar'
  document.getElementById('tree-target-id').value = id || '';

  document.getElementById('tree-modal-title').textContent = action === 'crear' ? 'Nueva Ubicación' : 'Editar Ubicación';
  treeTipoSelect.value = tipo;
  treeTipoSelect.disabled = action === 'editar'; // No cambiar tipo al editar

  actualizarCamposTreeModal(tipo);

  document.getElementById('tree-nombre').value = '';
  document.getElementById('tree-direccion').value = '';
  document.getElementById('tree-edificio').value = '';

  if (action === 'editar' && id) {
    if (tipo === 'division') {
      const d = adminData.divisiones.find(x => x.id === id);
      if (d) {
        document.getElementById('tree-nombre').value = d.nombre || '';
        document.getElementById('tree-direccion').value = d.direccion || '';
        document.getElementById('tree-edificio').value = d.edificio || '';
      }
    } else if (tipo === 'unidad') {
      let u = null, dPadre = null;
      adminData.divisiones.forEach(d => d.unidades.forEach(x => { if (x.id === id) { u = x; dPadre = d; } }));
      if (u && dPadre) {
        document.getElementById('tree-sel-division').value = dPadre.id;
        document.getElementById('tree-nombre').value = u.nombre || '';
      }
    } else if (tipo === 'dependencia') {
      let dep = null, uPadre = null, dPadre = null;
      adminData.divisiones.forEach(d => d.unidades.forEach(u => u.dependencias.forEach(x => {
        if (x.id === id) { dep = x; uPadre = u; dPadre = d; }
      })));
      if (dep && uPadre && dPadre) {
        document.getElementById('tree-sel-division').value = dPadre.id;
        document.getElementById('tree-sel-division').onchange(); // poblar unidades
        document.getElementById('tree-sel-unidad').value = uPadre.id;
        document.getElementById('tree-nombre').value = dep.nombre || '';
      }
    }
  }

  treeModal.setAttribute('aria-hidden', 'false');
  treeScrim.style.display = 'block';
  document.body.style.overflow = 'hidden';
};

function cerrarTreeModal() {
  treeModal.setAttribute('aria-hidden', 'true');
  treeScrim.style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('btn-close-tree').addEventListener('click', cerrarTreeModal);
document.getElementById('btn-cancel-tree').addEventListener('click', cerrarTreeModal);
treeScrim.addEventListener('click', cerrarTreeModal);

document.getElementById('btn-save-tree').addEventListener('click', () => {
  const action = document.getElementById('tree-action').value;
  const id = document.getElementById('tree-target-id').value;
  const tipo = treeTipoSelect.value;

  const nombre = document.getElementById('tree-nombre').value.trim();
  if (!nombre) { alert('El nombre es obligatorio'); return; }

  if (tipo === 'division') {
    const direccion = document.getElementById('tree-direccion').value.trim();
    const edificio = document.getElementById('tree-edificio').value.trim();

    if (action === 'crear') {
      adminData.divisiones.push({
        id: 'div-' + Date.now(),
        nombre, direccion, edificio, unidades: []
      });
    } else {
      const d = adminData.divisiones.find(x => x.id === id);
      if (d) {
        renombrarActivosGlobal('division', d, { nombre });
        d.nombre = nombre;
        d.direccion = direccion;
        d.edificio = edificio;
      }
    }
  } else if (tipo === 'unidad') {
    const divId = document.getElementById('tree-sel-division').value;
    if (!divId) { alert('Debe seleccionar la división padre'); return; }

    if (action === 'crear') {
      const d = adminData.divisiones.find(x => x.id === divId);
      if (d) d.unidades.push({ id: 'uni-' + Date.now(), nombre, dependencias: [] });
    } else {
      let u = null, dAntiguo = null;
      adminData.divisiones.forEach(d => d.unidades.forEach(x => { if (x.id === id) { u = x; dAntiguo = d; } }));
      if (u && dAntiguo) {
        renombrarActivosGlobal('unidad', u, { nombre, newDivId: divId, oldDivId: dAntiguo.id });
        u.nombre = nombre;
        if (dAntiguo.id !== divId) {
          // Mover de división
          dAntiguo.unidades = dAntiguo.unidades.filter(x => x.id !== id);
          const dNuevo = adminData.divisiones.find(x => x.id === divId);
          if (dNuevo) dNuevo.unidades.push(u);
        }
      }
    }
  } else if (tipo === 'dependencia') {
    const divId = document.getElementById('tree-sel-division').value;
    const uniId = document.getElementById('tree-sel-unidad').value;
    if (!divId || !uniId) { alert('Debe seleccionar la división y unidad'); return; }

    if (action === 'crear') {
      const d = adminData.divisiones.find(x => x.id === divId);
      const u = d ? d.unidades.find(x => x.id === uniId) : null;
      if (u) u.dependencias.push({ id: 'dep-' + Date.now(), nombre });
    } else {
      let dep = null, uAntiguo = null, dAntiguo = null;
      adminData.divisiones.forEach(d => d.unidades.forEach(u => u.dependencias.forEach(x => {
        if (x.id === id) { dep = x; uAntiguo = u; dAntiguo = d; }
      })));
      if (dep && uAntiguo && dAntiguo) {
        renombrarActivosGlobal('dependencia', dep, { nombre, newUniId: uniId, oldUniId: uAntiguo.id, dAntiguo: dAntiguo.id, dNuevo: divId });
        dep.nombre = nombre;
        if (uAntiguo.id !== uniId) {
          uAntiguo.dependencias = uAntiguo.dependencias.filter(x => x.id !== id);
          const dNuevo = adminData.divisiones.find(x => x.id === divId);
          const uNuevo = dNuevo ? dNuevo.unidades.find(x => x.id === uniId) : null;
          if (uNuevo) uNuevo.dependencias.push(dep);
        }
      }
    }
  }

  cerrarTreeModal();
  renderUbicaciones();
  initFilterOptions();
});

window.eliminarTree = function (tipo, id) {
  if (!confirm(`¿Estás seguro de eliminar esta ${tipo}?`)) return;

  // Validar si tiene bienes
  const enUso = workingData.some(r => {
    if (!r.ubicacion) return false;
    const p = r.ubicacion.split(' - ');
    if (tipo === 'division' && p[0]) {
      const d = adminData.divisiones.find(x => x.id === id);
      return d && p[0].trim() === d.nombre;
    }
    if (tipo === 'unidad' && p[1]) {
      let u = null;
      adminData.divisiones.forEach(div => div.unidades.forEach(x => { if (x.id === id) u = x; }));
      return u && p[1].trim() === u.nombre;
    }
    if (tipo === 'dependencia' && p[2]) {
      let dep = null;
      adminData.divisiones.forEach(div => div.unidades.forEach(uni => uni.dependencias.forEach(x => { if (x.id === id) dep = x; })));
      return dep && p[2].trim() === dep.nombre;
    }
    return false;
  });

  if (enUso) {
    alert(`No se puede eliminar la ${tipo} porque hay bienes registrados en ella o en sus subniveles.`);
    return;
  }

  if (tipo === 'division') {
    adminData.divisiones = adminData.divisiones.filter(x => x.id !== id);
  } else if (tipo === 'unidad') {
    adminData.divisiones.forEach(d => {
      d.unidades = d.unidades.filter(x => x.id !== id);
    });
  } else if (tipo === 'dependencia') {
    adminData.divisiones.forEach(d => {
      d.unidades.forEach(u => {
        u.dependencias = u.dependencias.filter(x => x.id !== id);
      });
    });
  }
  renderUbicaciones();
  initFilterOptions();
};

function renombrarActivosGlobal(tipo, objAntiguo, nuevosDatos) {
  // Cuando se renombra un nivel, hay que actualizar el string plano en workingData
  if (tipo === 'division') {
    const oldName = objAntiguo.nombre;
    const newName = nuevosDatos.nombre;
    if (oldName === newName) return;
    workingData.forEach(r => {
      if (r.ubicacion && r.ubicacion.startsWith(oldName + " - ")) {
        r.ubicacion = r.ubicacion.replace(oldName + " - ", newName + " - ");
      } else if (r.ubicacion === oldName) {
        r.ubicacion = newName;
      }
    });
  } else if (tipo === 'unidad') {
    const oldName = objAntiguo.nombre;
    const newName = nuevosDatos.nombre;
    const dAntiguo = adminData.divisiones.find(d => d.id === nuevosDatos.oldDivId);
    const dNuevo = adminData.divisiones.find(d => d.id === nuevosDatos.newDivId);
    if (!dAntiguo || !dNuevo) return;

    const oldPrefix = `${dAntiguo.nombre} - ${oldName}`;
    const newPrefix = `${dNuevo.nombre} - ${newName}`;

    workingData.forEach(r => {
      if (r.ubicacion && r.ubicacion.startsWith(oldPrefix + " - ")) {
        r.ubicacion = r.ubicacion.replace(oldPrefix + " - ", newPrefix + " - ");
      } else if (r.ubicacion === oldPrefix) {
        r.ubicacion = newPrefix;
      }
    });
  } else if (tipo === 'dependencia') {
    const oldName = objAntiguo.nombre;
    const newName = nuevosDatos.nombre;
    const dAntiguoObj = adminData.divisiones.find(d => d.id === nuevosDatos.dAntiguo);
    const dNuevoObj = adminData.divisiones.find(d => d.id === nuevosDatos.dNuevo);
    const uAntiguoObj = dAntiguoObj ? dAntiguoObj.unidades.find(u => u.id === nuevosDatos.oldUniId) : null;
    const uNuevoObj = dNuevoObj ? dNuevoObj.unidades.find(u => u.id === nuevosDatos.newUniId) : null;

    if (!dAntiguoObj || !dNuevoObj || !uAntiguoObj || !uNuevoObj) return;

    const oldPrefix = `${dAntiguoObj.nombre} - ${uAntiguoObj.nombre} - ${oldName}`;
    const newPrefix = `${dNuevoObj.nombre} - ${uNuevoObj.nombre} - ${newName}`;

    workingData.forEach(r => {
      if (r.ubicacion === oldPrefix) {
        r.ubicacion = newPrefix;
      }
    });
  }
  saveWorkingData();
}

/* ===== CRUD: Estados ===== */
let estPage = 1;
let estPageSize = 10;

function renderEstados() {
  saveAdminData();
  const start = (estPage - 1) * estPageSize;
  const pageItems = adminData.estados.slice(start, start + estPageSize);

  document.getElementById('tbody-estados').innerHTML = pageItems.map((e) => {
    const originalIndex = adminData.estados.indexOf(e);
    return `
      <tr>
        <td>${e.name}</td>
        <td><span class="badge badge-${e.colorClass}">${e.name}</span></td>
        <td><button class="btn btn-line btn-sm" onclick="eliminarEstado(${originalIndex})">Eliminar</button></td>
      </tr>
    `;
  }).join('');

  renderEstPagination();
}

function renderEstPagination() {
  const total = adminData.estados.length;
  const totalPages = Math.max(1, Math.ceil(total / estPageSize));
  estPage = Math.min(estPage, totalPages);

  const infoEl = document.getElementById('est-page-info');
  if (infoEl) {
    if (total === 0) infoEl.textContent = 'Sin resultados';
    else {
      const start = (estPage - 1) * estPageSize + 1;
      const end = Math.min(estPage * estPageSize, total);
      infoEl.textContent = `Estados ${start}-${end} de ${total}`;
    }
  }

  const curEl = document.getElementById('est-page-current');
  if (curEl) curEl.textContent = `Pág. ${estPage} / ${totalPages}`;

  const btnFirst = document.getElementById('est-page-first');
  const btnPrev = document.getElementById('est-page-prev');
  const btnNext = document.getElementById('est-page-next');
  const btnLast = document.getElementById('est-page-last');

  if (btnFirst) btnFirst.disabled = estPage <= 1;
  if (btnPrev) btnPrev.disabled = estPage <= 1;
  if (btnNext) btnNext.disabled = estPage >= totalPages;
  if (btnLast) btnLast.disabled = estPage >= totalPages;
}

function eliminarEstado(i) {
  const e = adminData.estados[i];
  if (workingData.some(r => normEstado(r.estado) === e.name)) {
    alert('No se puede eliminar: hay bienes con este estado.');
    return;
  }
  adminData.estados.splice(i, 1);
  renderEstados();
  initFilterOptions();
  renderDonut();
}

document.getElementById('form-estado').addEventListener('submit', function (e) {
  e.preventDefault();
  const name = document.getElementById('estado-name').value.trim();
  const colorClass = document.getElementById('estado-color').value;
  if (adminData.estados.some(x => x.name === name)) { alert('Ese estado ya existe.'); return; }
  adminData.estados.push({ name, colorClass });
  this.reset();
  estPage = 1;
  renderEstados();
  initFilterOptions();
});

document.getElementById('est-page-first')?.addEventListener('click', () => { estPage = 1; renderEstados(); });
document.getElementById('est-page-prev')?.addEventListener('click', () => { estPage = Math.max(1, estPage - 1); renderEstados(); });
document.getElementById('est-page-next')?.addEventListener('click', () => { estPage++; renderEstados(); });
document.getElementById('est-page-last')?.addEventListener('click', () => { estPage = Math.ceil(adminData.estados.length / estPageSize); renderEstados(); });
document.getElementById('est-page-size')?.addEventListener('change', function () {
  estPageSize = Number(this.value) || 10;
  estPage = 1;
  renderEstados();
});

/* ===== CRUD: Usuarios ===== */
let usrPage = 1;
let usrPageSize = 10;

function renderUsuarios() {
  saveAdminData();
  const start = (usrPage - 1) * usrPageSize;
  const pageItems = adminData.usuarios.slice(start, start + usrPageSize);

  document.getElementById('tbody-usuarios').innerHTML = pageItems.map((u) => {
    const originalIndex = adminData.usuarios.indexOf(u);
    return `
      <tr>
        <td>${u.nombre}</td>
        <td>${u.correo}</td>
        <td>${u.rol}</td>
        <td><button class="btn btn-line btn-sm" onclick="eliminarUsuario(${originalIndex})">Eliminar</button></td>
      </tr>
    `;
  }).join('');

  renderUsrPagination();
}

function renderUsrPagination() {
  const total = adminData.usuarios.length;
  const totalPages = Math.max(1, Math.ceil(total / usrPageSize));
  usrPage = Math.min(usrPage, totalPages);

  const infoEl = document.getElementById('usr-page-info');
  if (infoEl) {
    if (total === 0) infoEl.textContent = 'Sin resultados';
    else {
      const start = (usrPage - 1) * usrPageSize + 1;
      const end = Math.min(usrPage * usrPageSize, total);
      infoEl.textContent = `Usuarios ${start}-${end} de ${total}`;
    }
  }

  const curEl = document.getElementById('usr-page-current');
  if (curEl) curEl.textContent = `Pág. ${usrPage} / ${totalPages}`;

  const btnFirst = document.getElementById('usr-page-first');
  const btnPrev = document.getElementById('usr-page-prev');
  const btnNext = document.getElementById('usr-page-next');
  const btnLast = document.getElementById('usr-page-last');

  if (btnFirst) btnFirst.disabled = usrPage <= 1;
  if (btnPrev) btnPrev.disabled = usrPage <= 1;
  if (btnNext) btnNext.disabled = usrPage >= totalPages;
  if (btnLast) btnLast.disabled = usrPage >= totalPages;
}

function eliminarUsuario(i) {
  adminData.usuarios.splice(i, 1);
  renderUsuarios();
}

document.getElementById('form-usuario').addEventListener('submit', function (e) {
  e.preventDefault();
  adminData.usuarios.push({
    nombre: document.getElementById('usr-nombre').value.trim(),
    correo: document.getElementById('usr-correo').value.trim(),
    rol: document.getElementById('usr-rol').value,
  });
  this.reset();
  usrPage = 1;
  renderUsuarios();
});

document.getElementById('usr-page-first')?.addEventListener('click', () => { usrPage = 1; renderUsuarios(); });
document.getElementById('usr-page-prev')?.addEventListener('click', () => { usrPage = Math.max(1, usrPage - 1); renderUsuarios(); });
document.getElementById('usr-page-next')?.addEventListener('click', () => { usrPage++; renderUsuarios(); });
document.getElementById('usr-page-last')?.addEventListener('click', () => { usrPage = Math.ceil(adminData.usuarios.length / usrPageSize); renderUsuarios(); });
document.getElementById('usr-page-size')?.addEventListener('change', function () {
  usrPageSize = Number(this.value) || 10;
  usrPage = 1;
  renderUsuarios();
});

refreshAll();

/* ===== Personalización (Logo) ===== */
const logoInput = document.getElementById('logo-upload');
const btnSaveLogo = document.getElementById('btn-save-logo');
const btnClearLogo = document.getElementById('btn-clear-logo');
const sidebarLogo = document.getElementById('sidebar-logo');
const sidebarLogoContainer = document.getElementById('sidebar-logo-container');

function loadLogo() {
  const savedLogo = localStorage.getItem('gore_logo');
  if (savedLogo) {
    sidebarLogo.src = savedLogo;
    sidebarLogoContainer.style.display = 'block';
  } else {
    sidebarLogoContainer.style.display = 'none';
    sidebarLogo.src = '';
  }
}

if (btnSaveLogo) {
  btnSaveLogo.addEventListener('click', () => {
    const file = logoInput.files[0];
    if (!file) {
      alert('Por favor selecciona una imagen primero.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      localStorage.setItem('gore_logo', dataUrl);
      loadLogo();
      alert('Logo guardado exitosamente.');
      logoInput.value = '';
    };
    reader.readAsDataURL(file);
  });
}

if (btnClearLogo) {
  btnClearLogo.addEventListener('click', () => {
    if (confirm('¿Estás seguro de eliminar el logo?')) {
      localStorage.removeItem('gore_logo');
      loadLogo();
    }
  });
}

// Inicializar logo
loadLogo();

/* ===== CRUD Bienes (Modal) ===== */
function populateSelects() {
  const catSelect = document.getElementById('crud-cat');
  if (catSelect) catSelect.innerHTML = '<option value="">-- Seleccione --</option>' +
    adminData.categorias.map(c => `<option value="${c.key}">${c.label}</option>`).join('');

  const divSelect = document.getElementById('crud-ubi-division');
  const uniSelect = document.getElementById('crud-ubi-unidad');
  const depSelect = document.getElementById('crud-ubi-dependencia');

  if (divSelect) {
    divSelect.innerHTML = '<option value="">-- Seleccione --</option>' +
      adminData.divisiones.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('');

    divSelect.onchange = function () {
      const d = adminData.divisiones.find(x => x.id === this.value);
      if (d) {
        uniSelect.innerHTML = '<option value="">-- Seleccione --</option>' +
          d.unidades.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');
        uniSelect.disabled = false;
      } else {
        uniSelect.innerHTML = '<option value="">-- Seleccione División --</option>';
        uniSelect.disabled = true;
      }
      depSelect.innerHTML = '<option value="">-- Opcional --</option>';
      depSelect.disabled = true;
      actualizarUbicacionOculta();
    };

    uniSelect.onchange = function () {
      const d = adminData.divisiones.find(x => x.id === divSelect.value);
      const u = d ? d.unidades.find(x => x.id === this.value) : null;
      if (u && u.dependencias.length > 0) {
        depSelect.innerHTML = '<option value="">-- Seleccione / Ninguna --</option>' +
          u.dependencias.map(dep => `<option value="${dep.id}">${dep.nombre}</option>`).join('');
        depSelect.disabled = false;
      } else {
        depSelect.innerHTML = '<option value="">-- Sin dependencias --</option>';
        depSelect.disabled = true;
      }
      actualizarUbicacionOculta();
    };

    depSelect.onchange = actualizarUbicacionOculta;
  }

  const estSelect = document.getElementById('crud-estado');
  if (estSelect) estSelect.innerHTML = '<option value="">-- Seleccione --</option>' +
    adminData.estados.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
}

function actualizarUbicacionOculta() {
  const divId = document.getElementById('crud-ubi-division').value;
  const uniId = document.getElementById('crud-ubi-unidad').value;
  const depId = document.getElementById('crud-ubi-dependencia').value;

  let ubiStr = '';
  if (divId && uniId) {
    const d = adminData.divisiones.find(x => x.id === divId);
    const u = d ? d.unidades.find(x => x.id === uniId) : null;
    const dep = u && depId ? u.dependencias.find(x => x.id === depId) : null;

    if (d && u) {
      ubiStr = `${d.nombre} - ${u.nombre}`;
      if (dep) ubiStr += ` - ${dep.nombre}`;
    }
  }
  document.getElementById('crud-ubicacion').value = ubiStr;
}

function loadAssetUbicacionToDropdowns(ubiStr) {
  const divSelect = document.getElementById('crud-ubi-division');
  const uniSelect = document.getElementById('crud-ubi-unidad');
  const depSelect = document.getElementById('crud-ubi-dependencia');

  if (!ubiStr) {
    divSelect.value = '';
    if (divSelect.onchange) divSelect.onchange();
    return;
  }

  const parts = ubiStr.split(' - ');
  if (parts.length >= 2) {
    const divName = parts[0].trim();
    const uniName = parts[1].trim();
    const depName = parts.slice(2).join(' - ').trim();

    const d = adminData.divisiones.find(x => x.nombre === divName);
    if (d) {
      divSelect.value = d.id;
      if (divSelect.onchange) divSelect.onchange(); // poblar unidades

      const u = d.unidades.find(x => x.nombre === uniName);
      if (u) {
        uniSelect.value = u.id;
        if (uniSelect.onchange) uniSelect.onchange(); // poblar dependencias

        if (depName) {
          const dep = u.dependencias.find(x => x.nombre === depName);
          if (dep) {
            depSelect.value = dep.id;
          }
        }
      }
    }
  }
  document.getElementById('crud-ubicacion').value = ubiStr;
}

const modalScrim = document.getElementById('crud-modal-scrim');
const crudModal = document.getElementById('crud-modal');
const crudForm = document.getElementById('crud-form');

function openCrudModal(id = null) {
  populateSelects();
  crudForm.reset();

  if (id !== null) {
    document.getElementById('crud-modal-title').textContent = 'Editar Bien';
    const r = workingData.find(x => x.id === id);
    if (r) {
      document.getElementById('crud-id').value = r.id;
      document.getElementById('crud-cat').value = r.cat || '';
      document.getElementById('crud-cta').value = r.cta || '';
      document.getElementById('crud-detalle').value = r.detalle || '';
      document.getElementById('crud-tipoBien').value = r.tipoBien || '';
      document.getElementById('crud-codigo').value = r.codigo || '';

      document.getElementById('crud-rut').value = r.rut || '';
      document.getElementById('crud-factura').value = r.factura || '';
      document.getElementById('crud-fFactura').value = r.fFactura || '';
      document.getElementById('crud-egreso').value = r.egreso || '';
      document.getElementById('crud-fRecepcion').value = r.fRecepcion || '';
      document.getElementById('crud-moneda').value = r.moneda || 'CLP';
      document.getElementById('crud-valorCompra').value = formatCL(r.valorCompra);
      document.getElementById('crud-mesesVida').value = r.mesesVida || '';

      // Auto-calculate on edit open if values are missing, otherwise load saved
      if (!r.vidaActual && r.fRecepcion) calculateDepreciation();
      else {
        document.getElementById('crud-vidaActual').value = r.vidaActual || '';
        document.getElementById('crud-dep2024').value = formatCL(r.dep2024);
        document.getElementById('crud-dep2025').value = formatCL(r.dep2025);
        document.getElementById('crud-depAnio2025').value = formatCL(r.depAnio2025);
        document.getElementById('crud-valorLibro').value = formatCL(r.valorLibro);
      }

      loadAssetUbicacionToDropdowns(r.ubicacion || '');
      document.getElementById('crud-estado').value = r.estado ? normEstado(r.estado) : '';
      document.getElementById('crud-responsable').value = r.responsable || '';
      document.getElementById('crud-fRegistro').value = r.fRegistro || '';
      document.getElementById('crud-obsInv').value = r.obsInv || '';
    }
  } else {
    document.getElementById('crud-modal-title').textContent = 'Nuevo Bien';
    document.getElementById('crud-id').value = '';
    document.getElementById('crud-moneda').value = 'CLP';
    loadAssetUbicacionToDropdowns('');
    calculateDepreciation(); // Reset to 0s
  }

  const presentYear = new Date().getFullYear();
  document.getElementById('lbl-dep-1').textContent = presentYear;
  document.getElementById('lbl-dep-2').textContent = presentYear + 1;
  document.getElementById('lbl-dep-3').textContent = presentYear + 1;

  if (modalScrim) modalScrim.classList.add('open');
  if (crudModal) crudModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCrudModal() {
  if (modalScrim) modalScrim.classList.remove('open');
  if (crudModal) crudModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ===== Automatización de Depreciación ===== */
function getMonthsPassed(fRecepcion, targetDateStr) {
  const dJ = new Date(fRecepcion);
  const dX = new Date(targetDateStr);
  if (isNaN(dJ) || isNaN(dX)) return 0;

  const yearJ = dJ.getUTCFullYear();
  const monthJ = dJ.getUTCMonth() + 1;
  const yearX = dX.getUTCFullYear();
  const monthX = dX.getUTCMonth() + 1;

  if (dJ > dX) return 0;

  const passed = ((yearX - yearJ) * 12) - (12 - monthX) + (12 - monthJ);
  return Math.max(0, passed);
}

function calculateDepreciation() {
  let valInput = document.getElementById('crud-valorCompra');
  valInput.value = formatCL(parseCL(valInput.value)); // auto-format on typing

  const valorCompra = parseCL(valInput.value) || 0;
  const vidaTotal = parseFloat(document.getElementById('crud-mesesVida').value) || 0;
  const fRecepcion = document.getElementById('crud-fRecepcion').value;

  if (!valorCompra || !vidaTotal || !fRecepcion) {
    document.getElementById('crud-vidaActual').value = '';
    document.getElementById('crud-dep2024').value = '';
    document.getElementById('crud-dep2025').value = '';
    document.getElementById('crud-depAnio2025').value = '';
    document.getElementById('crud-valorLibro').value = '';
    return;
  }

  const presentYear = new Date().getFullYear();
  const passed2024 = getMonthsPassed(fRecepcion, `${presentYear}-12-31`);
  const passed2025 = getMonthsPassed(fRecepcion, `${presentYear + 1}-12-31`);

  const vidaActual = Math.max(0, vidaTotal - passed2025);
  document.getElementById('crud-vidaActual').value = vidaActual;

  let dep2024 = 0;
  if (vidaTotal > 0) {
    const used2024 = Math.min(vidaTotal, passed2024);
    dep2024 = Math.round((valorCompra / vidaTotal) * used2024);
  }
  document.getElementById('crud-dep2024').value = formatCL(dep2024);

  let dep2025 = 0;
  if (vidaTotal > 0) {
    const used2025 = Math.min(vidaTotal, passed2025);
    dep2025 = Math.round((valorCompra / vidaTotal) * used2025);
  }
  document.getElementById('crud-dep2025').value = formatCL(dep2025);

  const depAnio2025 = Math.max(0, dep2025 - dep2024);
  document.getElementById('crud-depAnio2025').value = formatCL(depAnio2025);

  let valorLibro = valorCompra - dep2025;
  if (valorLibro <= 0) valorLibro = 1;
  document.getElementById('crud-valorLibro').value = formatCL(valorLibro);
}

document.getElementById('crud-fRecepcion')?.addEventListener('change', calculateDepreciation);
document.getElementById('crud-valorCompra')?.addEventListener('input', calculateDepreciation);
document.getElementById('crud-mesesVida')?.addEventListener('input', calculateDepreciation);
/* ========================================= */

document.getElementById('btn-close-modal')?.addEventListener('click', closeCrudModal);
document.getElementById('btn-cancel-modal')?.addEventListener('click', closeCrudModal);
document.getElementById('crud-modal-scrim')?.addEventListener('click', closeCrudModal);

document.getElementById('btn-new-asset')?.addEventListener('click', () => {
  openCrudModal(null);
});

document.getElementById('btn-edit-asset')?.addEventListener('click', () => {
  if (currentFichaId !== null) openCrudModal(currentFichaId);
});

document.getElementById('btn-delete-asset')?.addEventListener('click', () => {
  if (currentFichaId !== null && confirm('¿Estás seguro de eliminar este bien permanentemente?')) {
    workingData = workingData.filter(x => x.id !== currentFichaId);
    saveWorkingData();
    refreshAll();
    closeFicha();
  }
});

document.getElementById('btn-save-modal')?.addEventListener('click', () => {
  if (!crudForm.checkValidity()) {
    crudForm.reportValidity();
    return;
  }

  const idVal = document.getElementById('crud-id').value;
  const isNew = !idVal;
  const id = isNew ? (workingData.length > 0 ? Math.max(...workingData.map(x => x.id)) + 1 : 1) : parseInt(idVal);

  const num = (v) => v ? Number(v) : null;
  const str = (v) => v ? String(v).trim() : null;

  const asset = {
    id: id,
    cat: str(document.getElementById('crud-cat').value),
    cta: str(document.getElementById('crud-cta').value),
    detalle: str(document.getElementById('crud-detalle').value),
    tipoBien: str(document.getElementById('crud-tipoBien').value),
    codigo: str(document.getElementById('crud-codigo').value),

    rut: str(document.getElementById('crud-rut').value),
    factura: str(document.getElementById('crud-factura').value),
    fFactura: str(document.getElementById('crud-fFactura').value),
    egreso: str(document.getElementById('crud-egreso').value),
    fRecepcion: str(document.getElementById('crud-fRecepcion').value),
    valorCompra: parseCL(document.getElementById('crud-valorCompra').value),
    moneda: str(document.getElementById('crud-moneda').value) || 'CLP',
    mesesVida: num(document.getElementById('crud-mesesVida').value),

    vidaActual: num(document.getElementById('crud-vidaActual').value),
    dep2024: parseCL(document.getElementById('crud-dep2024').value),
    dep2025: parseCL(document.getElementById('crud-dep2025').value),
    depAnio2025: parseCL(document.getElementById('crud-depAnio2025').value),
    valorLibro: parseCL(document.getElementById('crud-valorLibro').value),

    ubicacion: str(document.getElementById('crud-ubicacion').value),
    estado: str(document.getElementById('crud-estado').value),
    responsable: str(document.getElementById('crud-responsable').value),
    fRegistro: str(document.getElementById('crud-fRegistro').value),
    obsInv: str(document.getElementById('crud-obsInv').value)
  };

  if (isNew) {
    workingData.unshift(asset); // Add to beginning
  } else {
    const idx = workingData.findIndex(x => x.id === id);
    if (idx !== -1) {
      // Retain baja info when editing normal info
      const old = workingData[idx];
      asset.anioBaja = old.anioBaja;
      asset.resolucion = old.resolucion;
      asset.vidaBaja = old.vidaBaja;
      asset.depBaja = old.depBaja;
      asset.valorBaja = old.valorBaja;
      asset.obsBaja = old.obsBaja;
      workingData[idx] = asset;
    }
  }

  saveWorkingData();
  mergeAdminDataFromData(); // Re-merge categories/states if new ones added
  refreshAll();
  closeCrudModal();
  if (!isNew) {
    openFicha(id);
  }
});

/* ===== Baja Bienes (Modal) ===== */
const bajaModalScrim = document.getElementById('baja-modal-scrim');
const bajaModal = document.getElementById('baja-modal');
const bajaForm = document.getElementById('baja-form');

function openBajaModal(id) {
  if (id === null) return;
  bajaForm.reset();

  const r = workingData.find(x => x.id === id);
  if (r) {
    document.getElementById('baja-anioBaja').value = r.anioBaja || new Date().getFullYear();
    document.getElementById('baja-resolucion').value = r.resolucion || '';
    document.getElementById('baja-vidaBaja').value = r.vidaActual || r.vidaBaja || '';
    document.getElementById('baja-depBaja').value = formatCL(r.depAnio2025 || r.depBaja || '');
    document.getElementById('baja-valorBaja').value = formatCL(r.valorLibro || r.valorBaja || '');
    document.getElementById('baja-obsBaja').value = r.obsBaja || '';
  }

  if (bajaModalScrim) bajaModalScrim.classList.add('open');
  if (bajaModal) bajaModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeBajaModal() {
  if (bajaModalScrim) bajaModalScrim.classList.remove('open');
  if (bajaModal) bajaModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.getElementById('btn-close-baja')?.addEventListener('click', closeBajaModal);
document.getElementById('btn-cancel-baja')?.addEventListener('click', closeBajaModal);
document.getElementById('baja-modal-scrim')?.addEventListener('click', closeBajaModal);

document.getElementById('btn-baja-asset')?.addEventListener('click', () => {
  if (currentFichaId !== null) openBajaModal(currentFichaId);
});

document.getElementById('btn-save-baja')?.addEventListener('click', () => {
  if (!bajaForm.checkValidity()) {
    bajaForm.reportValidity();
    return;
  }

  if (currentFichaId === null) return;

  const num = (v) => v ? Number(v) : null;
  const str = (v) => v ? String(v).trim() : null;

  const idx = workingData.findIndex(x => x.id === currentFichaId);
  if (idx !== -1) {
    workingData[idx].anioBaja = num(document.getElementById('baja-anioBaja').value);
    workingData[idx].resolucion = str(document.getElementById('baja-resolucion').value);
    workingData[idx].vidaBaja = num(document.getElementById('baja-vidaBaja').value);
    workingData[idx].depBaja = parseCL(document.getElementById('baja-depBaja').value);
    workingData[idx].valorBaja = parseCL(document.getElementById('baja-valorBaja').value);
    workingData[idx].obsBaja = str(document.getElementById('baja-obsBaja').value);

    // Auto-cambiar estado a De Baja
    workingData[idx].estado = "De Baja";

    refreshAll();
    closeBajaModal();
  }
});

function mergeWorkingDataLocationsToDivisiones() {
  workingData.forEach(r => {
    if (r.ubicacion) {
      const parts = r.ubicacion.split(' - ');
      if (parts.length >= 2) {
        const divName = parts[0].trim();
        const uniName = parts[1].trim();
        const depName = parts.slice(2).join(' - ').trim();

        let div = adminData.divisiones.find(d => d.nombre === divName);
        if (!div) {
          div = { id: 'div-' + Date.now() + '-' + Math.floor(Math.random() * 1000), nombre: divName, direccion: '', edificio: '', unidades: [] };
          adminData.divisiones.push(div);
        }

        let uni = div.unidades.find(u => u.nombre === uniName);
        if (!uni) {
          uni = { id: 'uni-' + Date.now() + '-' + Math.floor(Math.random() * 1000), nombre: uniName, dependencias: [] };
          div.unidades.push(uni);
        }

        if (depName) {
          let dep = uni.dependencias.find(d => d.nombre === depName);
          if (!dep) {
            uni.dependencias.push({ id: 'dep-' + Date.now() + '-' + Math.floor(Math.random() * 1000), nombre: depName });
          }
        }
      }
    }
  });
  saveAdminData();
}

function migrateDivisiones() {
  if (adminData.divisiones && adminData.divisiones.length > 0) return;

  adminData.divisiones = [];

  ORGANIGRAMA.forEach((org, divIdx) => {
    let div = {
      id: 'div-' + Date.now() + '-' + divIdx,
      nombre: org.group,
      direccion: '',
      edificio: '',
      unidades: []
    };
    org.options.forEach((deptoName, uniIdx) => {
      div.unidades.push({
        id: 'uni-' + Date.now() + '-' + divIdx + '-' + uniIdx,
        nombre: deptoName,
        dependencias: []
      });
    });
    adminData.divisiones.push(div);
  });

  if (adminData.ubicaciones) {
    adminData.ubicaciones.forEach(oldGrp => {
      if (oldGrp.group) {
        const div = adminData.divisiones.find(d => d.nombre === oldGrp.group);
        if (div) {
          oldGrp.options.forEach(opt => {
            const prefix = div.nombre + " - ";
            if (opt.startsWith(prefix)) {
              const withoutDiv = opt.substring(prefix.length);
              let matchedUnit = null;
              div.unidades.forEach(u => {
                if (withoutDiv.startsWith(u.nombre)) {
                  if (!matchedUnit || u.nombre.length > matchedUnit.nombre.length) {
                    matchedUnit = u;
                  }
                }
              });

              if (matchedUnit) {
                const remaining = withoutDiv.substring(matchedUnit.nombre.length).trim();
                let addressPart = "";
                let depPart = remaining;
                if (remaining.startsWith("(")) {
                  const closingParen = remaining.indexOf(")");
                  if (closingParen !== -1) {
                    addressPart = remaining.substring(1, closingParen).trim();
                    depPart = remaining.substring(closingParen + 1).trim();
                  }
                }
                if (depPart.startsWith("-")) {
                  depPart = depPart.substring(1).trim();
                }

                if (addressPart && !div.direccion) {
                  div.direccion = addressPart;
                }

                if (depPart && depPart !== "") {
                  if (!matchedUnit.dependencias.find(d => d.nombre === depPart)) {
                    matchedUnit.dependencias.push({
                      id: 'dep-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                      nombre: depPart
                    });
                  }
                }
              }
            }
          });
        }
      }
    });
  }
  saveAdminData();
}

['baja-depBaja', 'baja-valorBaja'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', function () {
      this.value = formatCL(parseCL(this.value));
    });
  }
});

mergeAdminDataFromData();
initFilterOptions();
refreshAll();
switchView(window.location.hash.substring(1));
/* ===== Bulk Move Logic ===== */
const bulkMoveModal = document.getElementById('bulk-move-modal');
const bulkMoveScrim = document.getElementById('bulk-move-modal-scrim');

function openBulkMoveModal() {
  if (selectedIds.size === 0) return;
  document.getElementById('bulk-move-count').textContent = selectedIds.size;

  const divSelect = document.getElementById('bulk-ubi-division');
  const uniSelect = document.getElementById('bulk-ubi-unidad');
  const depSelect = document.getElementById('bulk-ubi-dependencia');

  divSelect.innerHTML = '<option value="">-- Seleccione --</option>' +
    adminData.divisiones.map(d => `<option value="${d.id}">${d.nombre}</option>`).join('');
  uniSelect.innerHTML = '<option value="">-- Seleccione División --</option>';
  uniSelect.disabled = true;
  depSelect.innerHTML = '<option value="">-- Opcional --</option>';
  depSelect.disabled = true;
  document.getElementById('bulk-ubicacion').value = '';

  divSelect.onchange = function () {
    const d = adminData.divisiones.find(x => x.id === this.value);
    if (d) {
      uniSelect.innerHTML = '<option value="">-- Seleccione Unidad --</option>' +
        d.unidades.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');
      uniSelect.disabled = false;
    } else {
      uniSelect.innerHTML = '<option value="">-- Seleccione División --</option>';
      uniSelect.disabled = true;
    }
    depSelect.innerHTML = '<option value="">-- Opcional --</option>';
    depSelect.disabled = true;
    actualizarBulkUbicacionOculta();
  };

  uniSelect.onchange = function () {
    const d = adminData.divisiones.find(x => x.id === divSelect.value);
    const u = d ? d.unidades.find(x => x.id === this.value) : null;
    if (u && u.dependencias.length > 0) {
      depSelect.innerHTML = '<option value="">-- Seleccione / Ninguna --</option>' +
        u.dependencias.map(dep => `<option value="${dep.id}">${dep.nombre}</option>`).join('');
      depSelect.disabled = false;
    } else {
      depSelect.innerHTML = '<option value="">-- Sin dependencias --</option>';
      depSelect.disabled = true;
    }
    actualizarBulkUbicacionOculta();
  };

  depSelect.onchange = actualizarBulkUbicacionOculta;

  if (bulkMoveScrim) bulkMoveScrim.classList.add('open');
  if (bulkMoveModal) bulkMoveModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeBulkMoveModal() {
  if (bulkMoveScrim) bulkMoveScrim.classList.remove('open');
  if (bulkMoveModal) bulkMoveModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function actualizarBulkUbicacionOculta() {
  const divId = document.getElementById('bulk-ubi-division').value;
  const uniId = document.getElementById('bulk-ubi-unidad').value;
  const depId = document.getElementById('bulk-ubi-dependencia').value;

  let ubiStr = '';
  if (divId && uniId) {
    const d = adminData.divisiones.find(x => x.id === divId);
    const u = d ? d.unidades.find(x => x.id === uniId) : null;
    if (d && u) {
      ubiStr = d.nombre + ' - ' + u.nombre;
      if (depId) {
        const dep = u.dependencias.find(x => x.id === depId);
        if (dep) ubiStr += ' - ' + dep.nombre;
      }
    }
  }
  document.getElementById('bulk-ubicacion').value = ubiStr;
}

document.getElementById('btn-bulk-move')?.addEventListener('click', openBulkMoveModal);
document.getElementById('btn-cancel-bulk-move')?.addEventListener('click', closeBulkMoveModal);
document.getElementById('btn-close-bulk-move')?.addEventListener('click', closeBulkMoveModal);
document.getElementById('bulk-move-modal-scrim')?.addEventListener('click', closeBulkMoveModal);

document.getElementById('btn-save-bulk-move')?.addEventListener('click', () => {
  const form = document.getElementById('bulk-move-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const newUbicacion = document.getElementById('bulk-ubicacion').value;
  if (!newUbicacion) {
    alert("Por favor seleccione al menos una División y un Departamento/Unidad.");
    return;
  }

  workingData.forEach(r => {
    if (selectedIds.has(r.id)) {
      r.ubicacion = newUbicacion;
    }
  });

  selectedIds.clear();
  closeBulkMoveModal();
  refreshAll();
});

/* ===== Escáner QR ===== */
let html5QrcodeScanner = null;

function initScanner() {
  if (html5QrcodeScanner) return;
  html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader",
    { fps: 10, qrbox: {width: 250, height: 250} },
    false
  );
  html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function stopScanner() {
  if (html5QrcodeScanner) {
    try {
      html5QrcodeScanner.clear();
    } catch(e) {
      console.error(e);
    }
    html5QrcodeScanner = null;
  }
}

function onScanSuccess(decodedText) {
  const resultDiv = document.getElementById('qr-result');
  const asset = workingData.find(a => String(a.codigo) === decodedText || String(a.id) === decodedText);
  if (asset) {
    asset.estado = "Operativo";
    refreshAll();
    resultDiv.innerHTML = `<p style="color:var(--teal);"><strong style="font-size:18px;">✅ ¡Encontrado y Operativo!</strong><br>ID: ${asset.id} | Código: ${asset.codigo || 'S/C'}<br>${asset.detalle}</p>`;
    resultDiv.style.borderColor = 'var(--teal)';
    resultDiv.style.backgroundColor = 'rgba(59, 145, 68, 0.05)';
  } else {
    resultDiv.innerHTML = `<p style="color:var(--brick);">❌ Bien no encontrado en la base de datos.<br>Lectura: ${decodedText}</p>`;
    resultDiv.style.borderColor = 'var(--brick)';
    resultDiv.style.backgroundColor = 'rgba(220, 38, 38, 0.05)';
  }
}

function onScanFailure(error) {
  // Ignorar errores continuos mientras busca
}

// Interceptar clicks de menú para apagar/encender cámara
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', () => {
    const viewId = link.dataset.view;
    if (viewId === 'escaner') {
      setTimeout(initScanner, 300);
    } else {
      stopScanner();
    }
  });
});

