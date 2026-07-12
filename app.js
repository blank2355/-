
// ==================== DATA & CONFIG ====================
const VALID_USERS = {'blank235': 'kongbai11'};
const DEFAULT_CATS = {
    expense: [
        {icon:'\U0001f354',name:'餐饮',color:'#fef3c7'},
        {icon:'\U0001f697',name:'交通',color:'#dbeafe'},
        {icon:'\U0001f6cd\ufe0f',name:'购物',color:'#fce7f3'},
        {icon:'\U0001f3ac',name:'娱乐',color:'#e0e7ff'},
        {icon:'\U0001f3e0',name:'住房',color:'#d1fae5'},
        {icon:'\U0001f48a',name:'医疗',color:'#fee2e2'},
        {icon:'\U0001f4da',name:'学习',color:'#f3e8ff'},
        {icon:'\U0001f476',name:'育儿',color:'#ffedd5'},
        {icon:'\U0001f381',name:'人情',color:'#ecfdf5'},
        {icon:'\U0001f485',name:'美容',color:'#fdf4ff'},
        {icon:'\U0001f431',name:'宠物',color:'#fff7ed'},
        {icon:'\U0001f4f1',name:'数码',color:'#eff6ff'},
        {icon:'\U0001f36f',name:'零食',color:'#fefce8'},
        {icon:'\U0001f375',name:'咖啡',color:'#fffbeb'},
        {icon:'\U0001f3ae',name:'游戏',color:'#f5f3ff'},
        {icon:'\U0001f4e6',name:'其他',color:'#f9fafb'}
    ],
    income: [
        {icon:'\U0001f4bc',name:'工资',color:'#d1fae5'},
        {icon:'\U0001f4c8',name:'投资',color:'#dbeafe'},
        {icon:'\U0001f3af',name:'奖金',color:'#fef3c7'},
        {icon:'\U0001f504',name:'退款',color:'#fce7f3'},
        {icon:'\U0001f4b0',name:'兼职',color:'#e0e7ff'},
        {icon:'\U0001f381',name:'礼金',color:'#ffedd5'},
        {icon:'\U0001f49e',name:'红包',color:'#f3e8ff'},
        {icon:'\U0001f4e6',name:'其他',color:'#f9fafb'}
    ]
};

let currentUser = null;
let records = [];
let categories = {};
let currentType = 'expense';
let selectedCategory = null;
let chartInstance = null;
let currentChartIndex = 0;

// ==================== AUTH ====================
function handleLogin() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value;
    const el = document.getElementById('loginError');
    if (!u || !p) { el.textContent = '请填写用户名和密码'; return; }
    if (VALID_USERS[u] === p) {
        currentUser = u;
        localStorage.setItem('accounting_user', u);
        document.getElementById('loginScreen').classList.add('h');
        document.getElementById('mainApp').style.display = 'block';
        loadData();
        showToast('\u2705 欢迎回来！');
    } else {
        el.textContent = '用户名或密码错误';
    }
}

function handleLogout() {
    if (confirm('确定退出登录？')) {
        currentUser = null;
        localStorage.removeItem('accounting_user');
        document.getElementById('loginScreen').classList.remove('h');
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginError').textContent = '';
    }
}

(function autoLogin() {
    const su = localStorage.getItem('accounting_user');
    if (su && VALID_USERS[su]) {
        currentUser = su;
        document.getElementById('loginScreen').classList.add('h');
        document.getElementById('mainApp').style.display = 'block';
        loadData();
    }
})();

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !document.getElementById('loginScreen').classList.contains('h')) handleLogin();
});

// ==================== DATA ====================
function loadData() {
    const d = localStorage.getItem('accounting_records_' + currentUser);
    records = d ? JSON.parse(d) : [];
    const c = localStorage.getItem('accounting_cats_' + currentUser);
    categories = c ? JSON.parse(c) : JSON.parse(JSON.stringify(DEFAULT_CATS));
    updateUI();
    initChart();
}

function saveData() {
    localStorage.setItem('accounting_records_' + currentUser, JSON.stringify(records));
    localStorage.setItem('accounting_cats_' + currentUser, JSON.stringify(categories));
}

// ==================== UI ====================
function updateUI() { updateBalance(); renderRecords(); }

function updateBalance() {
    const now = new Date();
    const mr = records.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const inc = mr.filter(r => r.type === 'income').reduce((s,r) => s + r.amount, 0);
    const exp = mr.filter(r => r.type === 'expense').reduce((s,r) => s + r.amount, 0);
    const bal = inc - exp;
    document.getElementById('balanceAmount').textContent = '\u00a5' + bal.toFixed(2);
    document.getElementById('monthIncome').textContent = '\u00a5' + inc.toFixed(0);
    document.getElementById('monthExpense').textContent = '\u00a5' + exp.toFixed(0);
    const m = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    document.getElementById('balancePeriod').textContent = now.getFullYear() + '年' + m[now.getMonth()] + ' \u00b7 结余';
}

function renderRecords() {
    const c = document.getElementById('recordsList');
    if (records.length === 0) {
        c.innerHTML = '<div class="es"><div class="ei">\U0001f4ed</div><div class="et">点击上方 + 开始记账</div></div>';
        return;
    }
    const groups = {};
    records.forEach(r => {
        const dt = new Date(r.date).toLocaleDateString('zh-CN', {month:'long',day:'numeric',weekday:'short'});
        if (!groups[dt]) groups[dt] = [];
        groups[dt].push(r);
    });
    let h = '';
    for (const [date, items] of Object.entries(groups)) {
        let dayTotal = 0;
        items.forEach(r => { dayTotal += r.type === 'expense' ? -r.amount : r.amount; });
        h += '<div class="dg"><div class="dl">' + date + '</div>';
        h += '<div class="dl" style="text-align:right;color:var(--d);font-weight:600;">' + dayTotal.toFixed(2) + ' \u672c\u65e5</div>';
        items.forEach(r => {
            const cat = getCatInfo(r.category);
            h += '<div class="ri">';
            h += '<div class="rc" style="background:' + cat.color + ';">' + cat.icon + '</div>';
            h += '<div class="ri2"><div class="rn">' + r.category + '</div>';
            if (r.note) h += '<div class="rnt">' + escHtml(r.note) + '</div>';
            h += '</div>';
            h += '<div class="ra ' + (r.type === 'expense' ? 'ex' : 'in') + '">' + (r.type === 'expense' ? '-' : '+') + '\u00a5' + r.amount.toFixed(2) + '</div>';
            h += '<button class="db" onclick="delRec(' + r.id + ')">\U0001f5d1\ufe0f</button>';
            h += '</div>';
        });
        h += '</div>';
    }
    c.innerHTML = h;
}

function getCatInfo(name) {
    for (const t of ['expense','income']) {
        const arr = categories[t] || DEFAULT_CATS[t];
        const cat = arr.find(c => c.name === name);
        if (cat) return cat;
    }
    return {icon:'\U0001f4e6',name:name,color:'#f9fafb'};
}

function escHtml(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

// ==================== ADD RECORD ====================
function openAddModal() {
    document.getElementById('addModal').classList.add('s');
    setTimeout(() => document.getElementById('amountInput').focus(), 300);
    renderCats();
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('s');
    resetForm();
}

function resetForm() {
    document.getElementById('amountInput').value = '';
    document.getElementById('noteInput').value = '';
    selectedCategory = null;
    renderCats();
    updateBtn();
}

function setType(t) {
    currentType = t; selectedCategory = null;
    document.querySelectorAll('.ttb').forEach(b => b.classList.remove('ac'));
    document.querySelector('.ttb.' + t).classList.add('ac');
    renderCats(); updateBtn();
}

function renderCats() {
    const g = document.getElementById('categoryGrid');
    const arr = categories[currentType] || DEFAULT_CATS[currentType];
    g.innerHTML = arr.map(c =>
        '<div class="ci' + (selectedCategory === c.name ? ' sel' : '') + '" onclick="selCat(\'' + c.name + '\')">' +
        '<div class="cic">' + c.icon + '</div><div class="cn">' + c.name + '</div></div>'
    ).join('');
}

function selCat(n) { selectedCategory = n; renderCats(); updateBtn(); }

function updateBtn() {
    const a = parseFloat(document.getElementById('amountInput').value);
    document.getElementById('submitBtn').disabled = !(a > 0 && selectedCategory);
}

function addRecord() {
    const amt = parseFloat(document.getElementById('amountInput').value);
    const note = document.getElementById('noteInput').value.trim();
    if (!amt || amt <= 0) { showToast('\u8bf7\u8f93\u5165\u6709\u6548\u91d1\u989d'); return; }
    if (!selectedCategory) { showToast('\u8bf7\u9009\u62e9\u5206\u7c7b'); return; }
    records.unshift({id:Date.now(), type:currentType, amount:amt, category:selectedCategory, note:note, date:new Date().toISOString()});
    saveData(); updateUI(); closeAddModal(); showToast('\u2705 \u8bb0\u8d26\u6210\u529f\uff01');
}

function delRec(id) {
    if (confirm('\u786e\u5b9a\u5220\u9664\u8fd9\u6761\u8bb0\u5f55\u5417\uff1f')) {
        records = records.filter(r => r.id !== id);
        saveData(); updateUI(); showToast('\u5df2\u5220\u9664');
    }
}

document.addEventListener('click', function(e) {
    if (e.target.id === 'addModal') closeAddModal();
});

document.addEventListener('DOMContentLoaded', function() {
    const ai = document.getElementById('amountInput');
    if (ai) ai.addEventListener('input', updateBtn);
});

// ==================== TABS ====================
function switchTab(i, btn) {
    document.querySelectorAll('.tbtn').forEach(t => t.classList.remove('ac'));
    btn.classList.add('ac');
    document.getElementById('tabRecords').style.display = i===0 ? 'block' : 'none';
    document.getElementById('tabCharts').style.display = i===1 ? 'block' : 'none';
    document.getElementById('tabSettings').style.display = i===2 ? 'block' : 'none';
    if (i === 1) updateChart();
}

// ==================== CHARTS ====================
function initChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type:'doughnut',
        data:{labels:[],datasets:[{data:[],backgroundColor:[],borderWidth:0}]},
        options:{responsive:true,maintainAspectRatio:true,cutout:'65%',plugins:{legend:{position:'bottom',labels:{padding:16,usePointStyle:true}}}}
    });
    updateChart();
}

function switchChart(i, btn) {
    currentChartIndex = i;
    document.querySelectorAll('.ctbtn').forEach(t => t.classList.remove('ac'));
    btn.classList.add('ac');
    updateChart();
}

function updateChart() {
    if (!chartInstance) return;
    const now = new Date();
    const mr = records.filter(r => {
        const d = new Date(r.date);
        return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    });
    let labels=[], data=[], colors=[];
    const pal = ['#667eea','#764ba2','#f093fb','#f5576c','#4facfe','#00f2fe','#43e97b','#38f9d7','#fa709a','#fee140','#a18cd1','#fbc2eb','#ff9a9e','#fad0c4','#ffecd2','#fcb69f'];
    
    if (currentChartIndex === 2) {
        const dt = {};
        mr.filter(r=>r.type==='expense').forEach(r => {
            const day = new Date(r.date).getDate();
            dt[day] = (dt[day]||0) + r.amount;
        });
        const days = Object.keys(dt).map(Number).sort((a,b)=>a-b);
        labels = days.map(d => d+'\u65e5');
        data = days.map(d => dt[d]);
        colors = ['#667eea'];
        chartInstance.config.type = 'bar';
        chartInstance.data = {labels, datasets:[{data, backgroundColor:'#667eea', borderRadius:6, barPercentage:0.6}]};
        chartInstance.options.scales = {y:{beginAtZero:true,ticks:{callback:v=>'\\u00a5'+v}}};
        chartInstance.update(); return;
    }
    
    const totals = {};
    mr.filter(r=>r.type===(currentChartIndex===0?'expense':'income')).forEach(r => {
        totals[r.category] = (totals[r.category]||0) + r.amount;
    });
    labels = Object.keys(totals);
    data = Object.values(totals);
    colors = labels.map((_,i) => pal[i%pal.length]);
    chartInstance.config.type = 'doughnut';
    chartInstance.data = {labels, datasets:[{data, backgroundColor:colors, borderWidth:2, borderColor:'#fff'}]};
    chartInstance.options.scales = {};
    chartInstance.update();
}

// ==================== EXPORT/IMPORT ====================
function exportData() {
    if (records.length===0) { showToast('\u6ca1\u6709\u8bb0\u5f55'); return; }
    const csv = ['\u65e5\u671f,\u7c7b\u578b,\u5206\u7c7b,\u91d1\u989d,\u5907\u6ce8'];
    records.forEach(r => {
        csv.push([new Date(r.date).toLocaleString('zh-CN'), r.type==='expense'?'\u652f\u51fa':'\u6536\u5165', r.category, r.amount.toFixed(2), r.note||''].map(v=>'"'+v+'"').join(','));
    });
    const blob = new Blob(['\uFEFF'+csv.join('\n')], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '\u8bb0\u8d26\u6570\u636e_'+new Date().toISOString().split('T')[0]+'.csv';
    a.click();
    showToast('\U0001f4e4 \u5bfc\u51fa\u6210\u529f');
}

function backupData() { exportData(); }

function importData() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json';
    inp.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const imp = JSON.parse(ev.target.result);
                if (Array.isArray(imp)) {
                    records = [...imp, ...records];
                    saveData(); updateUI();
                    showToast('\U0001f4e5 \u5bfc\u5165\u6210\u529f: '+imp.length+'\u6761');
                }
            } catch(err) { showToast('\u5bfc\u5165\u5931\u8d25'); }
        };
        reader.readAsText(file);
    };
    inp.click();
}

function clearAllData() {
    if (confirm('\u786e\u5b9a\u8981\u6e05\u7a7a\u6240\u6709\u6570\u636e\u5417\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u6062\u590d\uff01')) {
        if (confirm('\u518d\u6b21\u786e\u8ba4\uff1a\u771f\u7684\u8981\u5220\u9664\u6240\u6709\u8bb0\u5f55\u5417\uff1f')) {
            records = []; saveData(); updateUI(); showToast('\u6570\u636e\u5df2\u6e05\u7a7a');
        }
    }
}

function showSettings() {
    document.querySelectorAll('.tbtn').forEach(t=>t.classList.remove('ac'));
    document.querySelectorAll('.tbtn')[2].classList.add('ac');
    document.getElementById('tabRecords').style.display='none';
    document.getElementById('tabCharts').style.display='none';
    document.getElementById('tabSettings').style.display='block';
}

// ==================== TOAST ====================
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('s');
    setTimeout(() => t.classList.remove('s'), 2000);
}

// ==================== SHORTCUTS URL ====================
(function handleShortcut() {
    const p = new URLSearchParams(window.location.search);
    const amt = p.get('amount'), cat = p.get('category'), tp = p.get('type'), note = p.get('note');
    if (amt || cat || tp) {
        setTimeout(() => {
            if (amt) document.getElementById('amountInput').value = amt;
            if (tp) setType(tp);
            if (cat) { selectedCategory = cat; renderCats(); }
            if (note) document.getElementById('noteInput').value = note;
            updateBtn();
            document.getElementById('addModal').classList.add('s');
            document.getElementById('amountInput').focus();
        }, 500);
    }
})();
