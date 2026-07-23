
const DATA = window.DATA || [];

const CAT_LABELS = {
  "DEP. ACUM. VEHICULO TERRESTRE": "Vehículos terrestres",
  "DEP. ACUM. MAQUINAS Y EQUIPOS DE OFICINA": "Máquinas y equipos de oficina",
  "DEP. ACUM. OTRAS MÁQUINAS Y EQUIPOS": "Otras máquinas y equipos",
  "DEP. ACUM. EQUIPOS DE COMUNICACIONES PARA REDES INFORMATICAS": "Equipos de comunicaciones / redes",
  "DEP. ACUM. EQUIPOS DE COMPUTACIONALES Y PERIFERICOS": "Equipos computacionales y periféricos",
  "DEP. ACUM. MUEBLES Y ENSERES": "Muebles y enseres"
};
function catLabel(c){
  const found = adminData.categorias.find(x=>x.key===c);
  return found ? found.label : (CAT_LABELS[c] || c || "Sin categoría");
}
/* ===== Datos administrativos (categorías, ubicaciones, estados, usuarios) ===== */
let adminData = {
  categorias: [],
  ubicaciones: [],
  estados: [
    {name:'Operativo', colorClass:'teal'},
    {name:'En Bodega', colorClass:'amber'},
    {name:'De Baja', colorClass:'brick'},
  ],
  usuarios: []
};

function mergeAdminDataFromData(){
  adminData.categorias = [];
  adminData.ubicaciones = [];
  adminData.estados = [
    {name:'Operativo', colorClass:'teal'},
    {name:'En Bodega', colorClass:'amber'},
    {name:'De Baja', colorClass:'brick'},
  ];

  workingData.forEach(r=>{
    if(r.cat && !adminData.categorias.some(c=>c.key===r.cat)){
      adminData.categorias.push({key:r.cat, label: CAT_LABELS[r.cat] || r.cat});
    }
    if(r.ubicacion && !adminData.ubicaciones.some(u=>u.name===r.ubicacion)){
      adminData.ubicaciones.push({name:r.ubicacion});
    }
    const n = normEstado(r.estado);
    if(n && !adminData.estados.some(e=>e.name===n)){
      adminData.estados.push({name:n, colorClass:'slate'});
    }
  });
}
function normEstado(e){
  if(!e) return null;
  const t = e.trim().toLowerCase();
  if(t === "de baja") return "De Baja";
  if(t === "en bodega") return "En Bodega";
  if(t === "operativo") return "Operativo";
  return e.trim();
}
function estadoBadgeClass(e){
  const n = normEstado(e);
  const found = adminData.estados.find(x=>x.name===n);
  return found ? `badge-${found.colorClass}` : 'badge-slate';
}

const CLP = new Intl.NumberFormat('es-CL', {style:'currency', currency:'CLP', maximumFractionDigits:0});
const NUM = new Intl.NumberFormat('es-CL', {maximumFractionDigits:0});
function money(v){ return (v===null||v===undefined||isNaN(v)) ? '—' : CLP.format(v); }
function moneyShort(v){
  if(v===null||v===undefined||isNaN(v)) return '—';
  if(Math.abs(v) >= 1e9) return '$'+(v/1e9).toFixed(1)+'MM MM';
  if(Math.abs(v) >= 1e6) return '$'+(v/1e6).toFixed(1)+'MM';
  if(Math.abs(v) >= 1e3) return '$'+(v/1e3).toFixed(0)+'K';
  return '$'+NUM.format(v);
}
function fmtDate(v){
  if(!v) return '—';
  const [y,m,d] = v.split('-');
  return `${d}-${m}-${y}`;
}

let workingData = DATA.slice();
let filtered = workingData.slice();
let currentPage = 1;
const PAGE_SIZE = 40;
let sortKey = null;
let sortDir = 1;

const COLUMNS = [
  {key:'id', label:'ID', num:true, w:'48px'},
  {key:'cat', label:'Categoría', render:r=>`<span class="cat-tag">${catLabel(r.cat)}</span>`},
  {key:'detalle', label:'Detalle', render:r=>`<span class="detalle-txt" title="${(r.detalle||'').replace(/"/g,'&quot;')}">${r.detalle||'—'}</span>`},
  {key:'valorCompra', label:'Valor compra', num:true, render:r=>money(r.valorCompra)},
  {key:'mesesVida', label:'Vida útil (m)', num:true},
  {key:'depAnio2025', label:'Dep. 2025', num:true, render:r=>money(r.depAnio2025)},
  {key:'valorLibro', label:'Valor libro', num:true, render:r=>money(r.valorLibro)},
  {key:'ubicacion', label:'Ubicación', render:r=>r.ubicacion||'—'},
  {key:'estado', label:'Estado', render:r=> r.anioBaja ? `<span class="badge badge-brick">De Baja</span>` : (r.estado ? `<span class="badge ${estadoBadgeClass(r.estado)}">${normEstado(r.estado)}</span>` : `<span class="badge badge-slate">Sin registrar</span>`)},
];

function buildHeader(){
  const tr = document.getElementById('thead-row');
  tr.innerHTML = COLUMNS.map(c=>`<th class="${c.num?'num':''}" data-key="${c.key}" style="${c.w?`width:${c.w}`:''}">${c.label}<span class="arrow">${sortKey===c.key ? (sortDir>0?'▲':'▼') : ''}</span></th>`).join('');
  tr.querySelectorAll('th').forEach(th=>{
    th.addEventListener('click', ()=>{
      const key = th.dataset.key;
      if(sortKey === key){ sortDir *= -1; } else { sortKey = key; sortDir = 1; }
      applySort();
      renderTable();
    });
  });
}

function applySort(){
  if(!sortKey) return;
  filtered.sort((a,b)=>{
    let va = a[sortKey], vb = b[sortKey];
    if(va===null||va===undefined) va = typeof vb === 'number' ? -Infinity : '';
    if(vb===null||vb===undefined) vb = typeof va === 'number' ? -Infinity : '';
    if(typeof va === 'string') va = va.toLowerCase();
    if(typeof vb === 'string') vb = vb.toLowerCase();
    if(va < vb) return -1*sortDir;
    if(va > vb) return 1*sortDir;
    return 0;
  });
}

function populateSelect(id, values, formatter){
  const sel = document.getElementById(id);
  const current = sel.value;
  sel.innerHTML = sel.querySelector('option').outerHTML;
  values.forEach(v=>{
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = formatter ? formatter(v) : v;
    sel.appendChild(opt);
  });
  sel.value = current;
}

function initFilterOptions(){
  populateSelect('f-cat', adminData.categorias.map(c=>c.key), catLabel);
  populateSelect('f-ubicacion', adminData.ubicaciones.map(u=>u.name));
  populateSelect('f-estado', adminData.estados.map(e=>e.name));
}

function currentFilters(){
  return {
    search: document.getElementById('f-search').value.trim().toLowerCase(),
    cat: document.getElementById('f-cat').value,
    ubicacion: document.getElementById('f-ubicacion').value,
    estado: document.getElementById('f-estado').value,
    soloBaja: document.getElementById('f-baja').checked,
  };
}

function applyFilters(){
  const f = currentFilters();
  filtered = workingData.filter(r=>{
    if(f.soloBaja && !r.anioBaja) return false;
    if(f.cat && r.cat !== f.cat) return false;
    if(f.ubicacion && r.ubicacion !== f.ubicacion) return false;
    if(f.estado && normEstado(r.estado) !== f.estado) return false;
    if(f.search){
      const hay = [r.detalle, r.rut, r.codigo, r.responsable, String(r.id), r.factura]
        .filter(Boolean).join(' ').toLowerCase();
      if(!hay.includes(f.search)) return false;
    }
    return true;
  });
  applySort();
  currentPage = 1;
  renderTable();
  renderFilterSummary();
}

function renderFilterSummary(){
  document.getElementById('filter-count').textContent = `${filtered.length} de ${workingData.length} bienes`;
  document.getElementById('filter-summary').textContent =
    filtered.length === workingData.length
      ? 'Mostrando todos los bienes del registro.'
      : `Filtro activo — ${filtered.length} resultado(s).`;
}

function renderTable(){
  buildHeader();
  const tbody = document.getElementById('tbody');
  const empty = document.getElementById('empty-state');
  if(filtered.length === 0){
    tbody.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    const start = (currentPage-1)*PAGE_SIZE;
    const pageRows = filtered.slice(start, start+PAGE_SIZE);
    tbody.innerHTML = pageRows.map(r=>`
      <tr data-id="${r.id}">
        ${COLUMNS.map(c=>`<td class="${c.num?'num':''} ${c.key==='id'?'mono':''} ${c.key==='detalle'?'detalle':''}">${c.render ? c.render(r) : (r[c.key]??'—')}</td>`).join('')}
      </tr>
    `).join('');
    tbody.querySelectorAll('tr').forEach(tr=>{
      tr.addEventListener('click', ()=> openFicha(Number(tr.dataset.id)));
    });
  }
  renderPagination();
}

function renderPagination(){
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);
  document.getElementById('page-info').textContent =
    filtered.length === 0 ? 'Sin resultados' :
    `Bienes ${(currentPage-1)*PAGE_SIZE+1}–${Math.min(currentPage*PAGE_SIZE, filtered.length)} de ${filtered.length}`;
  document.getElementById('page-current').textContent = `Pág. ${currentPage} / ${totalPages}`;
  document.getElementById('page-first').disabled = currentPage<=1;
  document.getElementById('page-prev').disabled = currentPage<=1;
  document.getElementById('page-next').disabled = currentPage>=totalPages;
  document.getElementById('page-last').disabled = currentPage>=totalPages;
}

document.getElementById('page-first').addEventListener('click', ()=>{ currentPage=1; renderTable(); });
document.getElementById('page-prev').addEventListener('click', ()=>{ currentPage=Math.max(1,currentPage-1); renderTable(); });
document.getElementById('page-next').addEventListener('click', ()=>{ currentPage++; renderTable(); });
document.getElementById('page-last').addEventListener('click', ()=>{ currentPage = Math.ceil(filtered.length/PAGE_SIZE); renderTable(); });

let searchTimer;
document.getElementById('f-search').addEventListener('input', ()=>{
  clearTimeout(searchTimer);
  searchTimer = setTimeout(applyFilters, 180);
});
['f-cat','f-ubicacion','f-estado'].forEach(id=>{
  document.getElementById(id).addEventListener('change', applyFilters);
});
document.getElementById('f-baja').addEventListener('change', applyFilters);
document.getElementById('btn-clear-filters').addEventListener('click', ()=>{
  document.getElementById('f-search').value='';
  document.getElementById('f-cat').value='';
  document.getElementById('f-ubicacion').value='';
  document.getElementById('f-estado').value='';
  document.getElementById('f-baja').checked=false;
  applyFilters();
});

/* ===== KPIs ===== */
function renderKPIs(){
  const activos = workingData.filter(r=>!r.anioBaja);
  const bajas = workingData.filter(r=>r.anioBaja);
  const totalCompra = workingData.reduce((s,r)=>s+(r.valorCompra||0),0);
  const totalDep2025 = workingData.reduce((s,r)=>s+(r.depAnio2025||0),0);
  const totalLibro = activos.reduce((s,r)=>s+(r.valorLibro||0),0);
  const inventariados = workingData.filter(r=>r.estado).length;

  const kpis = [
    {label:'Total de bienes', value:NUM.format(workingData.length), sub:`${activos.length} activos · ${bajas.length} de baja`},
    {label:'Valor de adquisición', value:moneyShort(totalCompra), sub:'Suma histórica de compra', accent:''},
    {label:'Depreciación 2025', value:moneyShort(totalDep2025), sub:'Gasto del ejercicio', accent:'brick'},
    {label:'Valor libro vigente', value:moneyShort(totalLibro), sub:'Bienes activos, neto', accent:'teal'},
    {label:'Dados de baja', value:NUM.format(bajas.length), sub:`${((bajas.length/workingData.length)*100).toFixed(1)}% del total`, accent:'brick'},
    {label:'Con inventario físico', value:NUM.format(inventariados), sub:`${((inventariados/workingData.length)*100).toFixed(1)}% con ficha registrada`, accent:'teal'},
  ];
  document.getElementById('kpi-grid').innerHTML = kpis.map(k=>`
    <div class="kpi ${k.accent?`kpi-accent-${k.accent}`:''}">
      <p class="kpi-label">${k.label}</p>
      <p class="kpi-value">${k.value}</p>
      <p class="kpi-sub">${k.sub}</p>
    </div>
  `).join('');
}

/* ===== Chart: bars por categoría ===== */
const CHART_COLORS = ['#A8402A','#2C6459','#A8752A','#5B6472','#7C5A8C','#3D6E8C'];
function renderBarChart(){
  const svg = document.getElementById('chart-bars');
  const byCat = {};
  workingData.forEach(r=>{
    const c = r.cat || 'Sin categoría';
    byCat[c] = (byCat[c]||0) + (r.anioBaja ? 0 : (r.valorLibro||0));
  });
  const entries = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const max = Math.max(...entries.map(e=>e[1]), 1);
  const W = 640, H = 220, padL = 8, padR = 8, barH = 26, gap = 12;
  const barStartX = 220;
  const chartW = W - padL - padR - 220;
  let svgHtml = '';
  entries.forEach((([name,val],i)=>{
    const y = i*(barH+gap) + 8;
    const w = Math.max(2, (val/max)*chartW);
    const color = CHART_COLORS[i % CHART_COLORS.length];
    svgHtml += `
      <text x="${barStartX - 10}" y="${y+barH/2+4}" text-anchor="end" font-family="IBM Plex Mono" font-size="12" fill="#4B5563">${catLabel(name)}</text>
      <rect x="${barStartX}" y="${y}" width="${chartW}" height="${barH}" fill="#EAE8E1"></rect>
      <rect x="${barStartX}" y="${y}" width="${w}" height="${barH}" fill="${color}"></rect>
      <text x="${barStartX+chartW+8}" y="${y+barH/2+4}" font-family="IBM Plex Mono" font-size="13" font-weight="600" fill="#1C2430">${moneyShort(val)}</text>
    `;
  }));
  svg.setAttribute('viewBox', `0 0 640 ${entries.length*(barH+gap)+16}`);
  svg.innerHTML = svgHtml;
}

/* ===== Chart: donut estado inventario ===== */
function renderDonut(){
  const svg = document.getElementById('chart-donut');
  const legend = document.getElementById('donut-legend');
  const counts = {};
  workingData.forEach(r=>{
    const key = r.estado ? normEstado(r.estado) : 'Sin registrar';
    counts[key] = (counts[key]||0)+1;
  });
  const colorMap = {'Operativo':'#2C6459','En Bodega':'#A8752A','De Baja':'#A8402A','Sin registrar':'#C9C5B8'};
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const total = workingData.length;
  const cx=70, cy=70, r=58, rInner=34;
  let angle = -90;
  let paths = '';
  entries.forEach(([name,val])=>{
    const frac = val/total;
    const sweep = frac*360;
    const large = sweep>180?1:0;
    const a1 = angle*Math.PI/180, a2 = (angle+sweep)*Math.PI/180;
    const x1 = cx+r*Math.cos(a1), y1=cy+r*Math.sin(a1);
    const x2 = cx+r*Math.cos(a2), y2=cy+r*Math.sin(a2);
    const color = colorMap[name] || '#5B6472';
    paths += `<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${color}"></path>`;
    angle += sweep;
  });
  svg.innerHTML = paths + `<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="#FCFBF8"></circle>
    <text x="${cx}" y="${cy-3}" text-anchor="middle" font-family="IBM Plex Serif" font-size="18" font-weight="500" fill="#1C2430">${total}</text>
    <text x="${cx}" y="${cy+13}" text-anchor="middle" font-family="IBM Plex Mono" font-size="9" fill="#5B6472">BIENES</text>`;
  legend.innerHTML = entries.map(([name,val])=>`
    <li><span class="legend-swatch" style="background:${colorMap[name]||'#5B6472'}"></span>
    <span class="legend-name">${name}</span>
    <span class="legend-val">${val} · ${((val/total)*100).toFixed(0)}%</span></li>
  `).join('');
}

/* ===== Ficha detalle ===== */
function openFicha(id){
  const r = workingData.find(x=>x.id===id);
  if(!r) return;
  document.getElementById('ficha-id').textContent = String(r.id).padStart(4,'0');
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

  html += fichaSection('Identificación y compra', [
    ['Categoría contable', catLabel(r.cat)],
    ['Cuenta contable', r.cta],
    ['Tipo de bien', r.tipoBien],
    ['RUT proveedor', r.rut],
    ['N° factura', r.factura],
    ['Fecha factura', fmtDate(r.fFactura)],
    ['N° egreso', r.egreso],
    ['Fecha recepción', fmtDate(r.fRecepcion)],
    ['Valor bien comprado', money(r.valorCompra)],
    ['Meses vida útil', r.mesesVida],
  ]);

  html += fichaSection('Depreciación vigente', [
    ['Vida útil restante (meses)', r.vidaActual],
    ['Dep. acumulada 2024', money(r.dep2024)],
    ['Dep. acumulada 2025', money(r.dep2025)],
    ['Dep. del año 2025', money(r.depAnio2025)],
    ['Valor libro actual', money(r.valorLibro)],
  ]);

  if(r.anioBaja){
    html += fichaSection('Baja del bien', [
      ['Año de baja', r.anioBaja],
      ['Resolución', r.resolucion],
      ['Vida útil al momento de baja', r.vidaBaja],
      ['Dep. acumulada a la baja', money(r.depBaja)],
      ['Valor libro a la baja', money(r.valorBaja)],
    ]);
    if(r.obsBaja) html += `<div class="ficha-note">${r.obsBaja}</div>`;
  }

  html += fichaSection('Inventario físico', [
    ['Ubicación', r.ubicacion || 'No registrado'],
    ['Estado', r.estado ? normEstado(r.estado) : 'Sin registrar'],
    ['Responsable de registro', r.responsable || '—'],
    ['Fecha de registro/modificación', fmtDate(r.fRegistro)],
  ]);
  if(r.obsInv) html += `<div class="ficha-note">${r.obsInv}</div>`;

  body.innerHTML = html;

  document.getElementById('ficha').classList.add('open');
  document.getElementById('ficha').setAttribute('aria-hidden','false');
  document.getElementById('scrim').classList.add('open');
}
function fichaSection(title, rows){
  const rowsHtml = rows
    .filter(([,v])=> v!==null && v!==undefined && v!=='')
    .map(([k,v])=>`<div class="ficha-row"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  if(!rowsHtml) return '';
  return `<div class="ficha-section"><p class="ficha-section-title">${title}</p><div class="ficha-rows">${rowsHtml}</div></div>`;
}
function closeFicha(){
  document.getElementById('ficha').classList.remove('open');
  document.getElementById('ficha').setAttribute('aria-hidden','true');
  document.getElementById('scrim').classList.remove('open');
}
document.getElementById('ficha-close').addEventListener('click', closeFicha);
document.getElementById('scrim').addEventListener('click', closeFicha);
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeFicha(); });

/* ===== Importar archivo ===== */
const HEADER_MAP = [
  ['id','ID'], ['cta','CTA. CONTABLE'], ['cat','NOMBRE CTA. CONTABLE'], ['detalle','DETALLE'],
  ['tipoBien','TIPO DE BIEN'], ['rut','RUT'], ['factura','FACTURA'], ['fFactura','FECHA FACTURA'],
  ['egreso','EGRESO'], ['fRecepcion','FECHA DE RECEPCIÓN'], ['valorCompra','VALOR BIEN COMPRADO'],
  ['mesesVida','MESES VIDA ÚTIL'], ['vidaActual','VIDA UTIL ACTUAL'], ['dep2024','DEPRECIACIÓN ACUMULADA 2024'],
  ['dep2025','DEPRECIACIÓN ACUMULADA 2025'], ['depAnio2025','DEPRECIACIÓN AÑO 2025'], ['valorLibro','VALOR DEL BIEN'],
  ['anioBaja','AÑO DE BAJA'], ['resolucion','RESOLUCIÓN'], ['vidaBaja','VIDA UTIL AL MOMENTO DE BAJA'],
  ['depBaja','DEPRECIACIÓN ACUMULADA'], ['valorBaja','VALOR DEL BIEN'], ['obsBaja','OBSERVACIONES'],
  ['codigo','Código QR/Barras/N°Serie'], ['ubicacion','Ubicación'], ['fRegistro','Fecha Registro/Modificación'],
  ['responsable','Responsable Registro'], ['estado','Estado'], ['obsInv','Observaciones'],
];

function excelDateToISO(v){
  if(v===null||v===undefined||v==='') return null;
  if(typeof v === 'number'){
    const d = XLSX.SSF.parse_date_code(v);
    if(!d) return null;
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const d = new Date(v);
  if(isNaN(d.getTime())) return null;
  return d.toISOString().slice(0,10);
}
function toNumOrNull(v){
  if(v===null||v===undefined||v==='') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function toStrOrNull(v){
  if(v===null||v===undefined) return null;
  const s = String(v).trim();
  return (s==='' || s.toLowerCase()==='nan') ? null : s;
}
const DATE_FIELDS = new Set(['fFactura','fRecepcion','fRegistro']);
const NUM_FIELDS = new Set(['id','valorCompra','mesesVida','vidaActual','dep2024','dep2025','depAnio2025','valorLibro','anioBaja','vidaBaja','depBaja','valorBaja']);

function mapImportedRows(aoa){
  const headerRow = aoa[0].map(h=> String(h||'').trim());
  const usedCols = new Set();
  const mapping = []; // {field, colIndex}
  HEADER_MAP.forEach(([field, headerName])=>{
    for(let i=0;i<headerRow.length;i++){
      if(headerRow[i] === headerName && !usedCols.has(i)){
        mapping.push({field, col:i});
        usedCols.add(i);
        return;
      }
    }
  });
  const rows = [];
  for(let r=1;r<aoa.length;r++){
    const raw = aoa[r];
    if(!raw || raw.every(c=>c===undefined||c===null||c==='')) continue;
    const rec = {};
    mapping.forEach(({field,col})=>{
      let v = raw[col];
      if(DATE_FIELDS.has(field)) v = excelDateToISO(v);
      else if(NUM_FIELDS.has(field)) v = toNumOrNull(v);
      else v = toStrOrNull(v);
      rec[field] = v;
    });
    if(rec.id===undefined || rec.id===null) rec.id = r;
    rows.push(rec);
  }
  return rows;
}

function refreshAll(){
  mergeAdminDataFromData();
  initFilterOptions();
  renderKPIs();
  renderBarChart();
  renderDonut();
  applyFilters();
}

document.getElementById('file-input').addEventListener('change', function(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(evt){
    try{
      const wb = XLSX.read(evt.target.result, {type:'binary', cellDates:false});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json(sheet, {header:1, raw:true, defval:null});
      const rows = mapImportedRows(aoa);
      if(rows.length === 0){
        alert('No se encontraron filas de datos reconocibles en el archivo. Verificá que la primera fila tenga los mismos encabezados de la planilla original.');
        return;
      }
      workingData = rows;
      refreshAll();
    }catch(err){
      alert('No se pudo leer el archivo: ' + err.message);
    }
  };
  reader.readAsBinaryString(file);
  e.target.value = '';
});

document.getElementById('btn-restore').addEventListener('click', function(){
  workingData = DATA.slice();
  refreshAll();
});

/* ===== Exportar CSV filtrado ===== */
document.getElementById('btn-export').addEventListener('click', function(){
  const headers = ['ID','Categoría','Detalle','RUT','Valor compra','Meses vida útil','Dep. 2025','Valor libro','Año baja','Ubicación','Estado','Responsable'];
  const lines = [headers.join(';')];
  filtered.forEach(r=>{
    lines.push([
      r.id, catLabel(r.cat), (r.detalle||'').replace(/;/g,','), r.rut||'',
      r.valorCompra??'', r.mesesVida??'', r.depAnio2025??'', r.valorLibro??'',
      r.anioBaja??'', r.ubicacion||'', r.estado||'', r.responsable||''
    ].join(';'));
  });
  const blob = new Blob(['\uFEFF'+lines.join('\n')], {type:'text/csv;charset=utf-8;'});
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

document.getElementById('btn-open-sidebar').addEventListener('click', ()=>{
  dashboardShell.classList.toggle('sidebar-open');
  sidebarScrim.classList.toggle('open');
});
function closeSidebar(){
  dashboardShell.classList.remove('sidebar-open');
  sidebarScrim.classList.remove('open');
}
document.getElementById('sidebar-scrim').addEventListener('click', closeSidebar);

document.querySelectorAll('.sidebar-link').forEach(link=>{
  link.addEventListener('click', ()=>{
    const view = link.dataset.view;
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-'+view).classList.add('active');
    document.querySelectorAll('.sidebar-link').forEach(a=>a.classList.remove('active'));
    link.classList.add('active');
    if(view==='categorias') renderCategorias();
    if(view==='ubicaciones') renderUbicaciones();
    if(view==='estados') renderEstados();
    if(view==='usuarios') renderUsuarios();
    closeSidebar();
  });
});

/* ===== CRUD: Categorías ===== */
function renderCategorias(){
  document.getElementById('tbody-categorias').innerHTML = adminData.categorias.map((c,i)=>`
    <tr>
      <td class="mono">${c.key}</td>
      <td>${c.label}</td>
      <td><button class="btn btn-line btn-sm" onclick="eliminarCategoria(${i})">Eliminar</button></td>
    </tr>
  `).join('');
}
function eliminarCategoria(i){
  const cat = adminData.categorias[i];
  if(workingData.some(r=>r.cat===cat.key)){
    alert('No se puede eliminar: hay bienes registrados con esta categoría.');
    return;
  }
  adminData.categorias.splice(i,1);
  renderCategorias();
  initFilterOptions();
}
document.getElementById('form-categoria').addEventListener('submit', function(e){
  e.preventDefault();
  const key = document.getElementById('cat-key').value.trim();
  const label = document.getElementById('cat-label').value.trim();
  if(adminData.categorias.some(c=>c.key===key)){ alert('Ya existe una categoría con ese código.'); return; }
  adminData.categorias.push({key, label});
  this.reset();
  renderCategorias();
  initFilterOptions();
});

/* ===== CRUD: Ubicaciones ===== */
function renderUbicaciones(){
  document.getElementById('tbody-ubicaciones').innerHTML = adminData.ubicaciones.map((u,i)=>`
    <tr>
      <td>${u.name}</td>
      <td><button class="btn btn-line btn-sm" onclick="eliminarUbicacion(${i})">Eliminar</button></td>
    </tr>
  `).join('');
}
function eliminarUbicacion(i){
  const u = adminData.ubicaciones[i];
  if(workingData.some(r=>r.ubicacion===u.name)){
    alert('No se puede eliminar: hay bienes registrados en esta ubicación.');
    return;
  }
  adminData.ubicaciones.splice(i,1);
  renderUbicaciones();
  initFilterOptions();
}
document.getElementById('form-ubicacion').addEventListener('submit', function(e){
  e.preventDefault();
  const name = document.getElementById('ubi-name').value.trim();
  if(adminData.ubicaciones.some(u=>u.name===name)){ alert('Esa ubicación ya existe.'); return; }
  adminData.ubicaciones.push({name});
  this.reset();
  renderUbicaciones();
  initFilterOptions();
});

/* ===== CRUD: Estados ===== */
function renderEstados(){
  document.getElementById('tbody-estados').innerHTML = adminData.estados.map((e,i)=>`
    <tr>
      <td>${e.name}</td>
      <td><span class="badge badge-${e.colorClass}">${e.name}</span></td>
      <td><button class="btn btn-line btn-sm" onclick="eliminarEstado(${i})">Eliminar</button></td>
    </tr>
  `).join('');
}
function eliminarEstado(i){
  const e = adminData.estados[i];
  if(workingData.some(r=>normEstado(r.estado)===e.name)){
    alert('No se puede eliminar: hay bienes con este estado.');
    return;
  }
  adminData.estados.splice(i,1);
  renderEstados();
  initFilterOptions();
  renderDonut();
}
document.getElementById('form-estado').addEventListener('submit', function(e){
  e.preventDefault();
  const name = document.getElementById('estado-name').value.trim();
  const colorClass = document.getElementById('estado-color').value;
  if(adminData.estados.some(x=>x.name===name)){ alert('Ese estado ya existe.'); return; }
  adminData.estados.push({name, colorClass});
  this.reset();
  renderEstados();
  initFilterOptions();
});

/* ===== CRUD: Usuarios (stub, sin backend) ===== */
function renderUsuarios(){
  document.getElementById('tbody-usuarios').innerHTML = adminData.usuarios.map((u,i)=>`
    <tr>
      <td>${u.nombre}</td>
      <td>${u.correo}</td>
      <td>${u.rol}</td>
      <td><button class="btn btn-line btn-sm" onclick="eliminarUsuario(${i})">Eliminar</button></td>
    </tr>
  `).join('');
}
function eliminarUsuario(i){
  adminData.usuarios.splice(i,1);
  renderUsuarios();
}
document.getElementById('form-usuario').addEventListener('submit', function(e){
  e.preventDefault();
  adminData.usuarios.push({
    nombre: document.getElementById('usr-nombre').value.trim(),
    correo: document.getElementById('usr-correo').value.trim(),
    rol: document.getElementById('usr-rol').value,
  });
  this.reset();
  renderUsuarios();
});
refreshAll();
