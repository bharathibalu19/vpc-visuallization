/* VPC Visual - builds the SVG diagram, step data and caption text. No dependencies. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var XL = 'http://www.w3.org/1999/xlink';
  var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Colours (edit here) ---------- */
  var C = {
    blue: '#60a5fa', teal: '#2dd4bf', gold: '#fbbf24', purple: '#a78bfa',
    red: '#f87171', green: '#4ade80', ink: '#e8eefc', dim: '#9fb0d6', box: '#1a2a58'
  };

  /* ---------- Step text (edit here) ---------- */
  var STEPS = [
    { btn: "Your own plot", sub: "The VPC",
      title: "Step 1 - Bharathi buys a fenced plot",
      plain: "Bharathi owns a small shop and wants a safe home for her business. She buys a plot of land inside a big city and builds a fence around it. Nobody enters unless she says so.",
      tech: "VPC (Virtual Private Cloud), here with the address range 10.0.0.0/16, inside an AWS Region.",
      watch: "The blue box is the city (AWS Cloud). The teal box inside it is Bharathi's fenced plot." },
    { btn: "Two buildings", sub: "Availability Zones",
      title: "Step 2 - Two buildings, far apart",
      plain: "She builds two identical buildings on the plot, far from each other. If one has a power cut or a flood, the other keeps the shop running.",
      tech: "Availability Zones (AZ A and AZ B): separate data centres in one Region.",
      watch: "Two dashed blue boxes appear: Building 1 (Zone A) and Building 2 (Zone B)." },
    { btn: "Lobby and flats", sub: "Public and private subnets",
      title: "Step 3 - A lobby and flats in each building",
      plain: "Each building has a lobby that visitors may enter, and private flats that only residents may use. Customers stay in the lobby; the valuable records stay upstairs.",
      tech: "Subnets: public subnet (reachable from the internet) and private subnet (hidden from the internet).",
      watch: "Gold = public lobby. Purple = private flats. Each zone gets one of each." },
    { btn: "The main gate", sub: "Internet Gateway",
      title: "Step 4 - The main gate to the outside world",
      plain: "A gate is built in the fence so visitors can come in from the road. A signboard at the gate tells traffic where to go. The first customer request arrives.",
      tech: "Internet Gateway (IGW) plus a route table that sends 0.0.0.0/0 (everything outside) to the gateway.",
      watch: "Follow the envelope: visitors, then the internet, then into the main gate." },
    { btn: "The receptionist", sub: "Load balancer and web servers",
      title: "Step 5 - A receptionist shares the visitors",
      plain: "A receptionist greets every visitor and sends them to a free shop counter, sometimes in building 1, sometimes in building 2. No counter gets overloaded.",
      tech: "Load Balancer (spreads traffic across zones) and web servers in the public subnets.",
      watch: "Envelopes leave the gate and take turns going to Zone A and Zone B." },
    { btn: "Back office and records", sub: "App servers and database",
      title: "Step 6 - The back office and the record room",
      plain: "Shop counters pass orders to the back office, which writes them in the record room upstairs. A second record room in the other building keeps an exact live copy, so nothing is lost.",
      tech: "App servers and a database in private subnets, with a standby replica in another AZ (Multi-AZ replication).",
      watch: "Floppy disks go web, then app, then database. The repeat arrows copy data across zones." },
    { btn: "Delivery counter", sub: "NAT Gateway",
      title: "Step 7 - A delivery counter for the flats",
      plain: "Residents upstairs sometimes need to fetch parcels, like software updates. They hand the request to a delivery counter in the lobby, which goes out and brings it back. Outsiders cannot come in this way.",
      tech: "NAT Gateway: lets private servers reach the internet without being reachable from it.",
      watch: "A package leaves the app server, passes the delivery counter, and exits through the main gate." },
    { btn: "Guards everywhere", sub: "Security Groups and NACLs",
      title: "Step 8 - Guards at every door and gate",
      plain: "Every room has a door guard who checks who may enter. Each floor also has a gate guard who checks everyone walking by. An intruder is stopped before reaching the flats.",
      tech: "Security Groups (stateful, per server) and Network ACLs (stateless, per subnet).",
      watch: "Small red tags are the guards. The intruder walks toward the private flats and gets a red cross." },
    { btn: "Tunnel and private road", sub: "VPN and VPC peering",
      title: "Step 9 - A secret tunnel and a private road",
      plain: "Bharathi's own office reaches the flats through a secret tunnel nobody else can see. A neighbouring shop is joined by a private road, so they can trade without using the public street.",
      tech: "Site-to-Site VPN gateway (encrypted tunnel to your office) and VPC peering (private link between two VPCs).",
      watch: "The lock travels the tunnel from the office. The handshake crosses the road to the Partner VPC." }
  ];

  /* ---------- SVG helpers ---------- */
  var svg = document.getElementById('diagram');

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) {
      if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(p, x, y, s, o) {
    o = o || {};
    var t = el('text', {
      x: x, y: y, 'text-anchor': o.anchor || 'middle', 'dominant-baseline': 'central',
      'font-size': o.size || 11, 'font-weight': o.weight || 400, fill: o.fill || C.ink
    }, p);
    t.textContent = s;
    return t;
  }

  /* background (always visible) */
  var defs = el('defs', {}, svg);
  var sky = el('linearGradient', { id: 'sky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el('stop', { offset: '0', 'stop-color': '#0a1030' }, sky);
  el('stop', { offset: '1', 'stop-color': '#16275c' }, sky);
  var dots = el('pattern', { id: 'dots', width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, defs);
  el('circle', { cx: 2, cy: 2, r: 1, fill: '#7f93c9', 'fill-opacity': 0.22 }, dots);
  el('rect', { width: 1100, height: 620, fill: 'url(#sky)' }, svg);
  el('rect', { width: 1100, height: 620, fill: 'url(#dots)' }, svg);

  /* layers: wires first, then boxes, then packets; one group per step in each */
  var G = {};
  ['wires', 'boxes', 'packets'].forEach(function (name) {
    var layer = el('g', {}, svg);
    G[name] = {};
    for (var s = 1; s <= STEPS.length; s++) {
      G[name][s] = el('g', { 'class': 'item', 'data-step': s }, layer);
    }
  });

  function wire(s, d, color) {
    el('path', { d: d, 'class': 'wire', fill: 'none', stroke: color, 'stroke-width': 2.2, 'stroke-opacity': 0.85 }, G.wires[s]);
  }
  function frame(s, x, y, w, h, color, label, o) {
    o = o || {};
    var g = G.boxes[s];
    el('rect', {
      x: x, y: y, width: w, height: h, rx: o.r || 14, fill: color, 'fill-opacity': o.fo || 0.07,
      stroke: color, 'stroke-width': 1.8, 'stroke-dasharray': o.dash || null
    }, g);
    if (label) txt(g, o.lx, o.ly, label, { anchor: 'start', size: o.size || 12, weight: 700, fill: color });
  }
  /* node: box with 1-3 centred text lines [text, size, fill, weight] */
  function node(s, x, y, w, h, color, lines) {
    var g = G.boxes[s];
    el('rect', { x: x, y: y, width: w, height: h, rx: 9, fill: C.box, stroke: color, 'stroke-width': 1.8 }, g);
    var top = y + h / 2 - (lines.length - 1) * 7;
    lines.forEach(function (l, i) {
      txt(g, x + w / 2, top + i * 14, l[0], { size: l[1], fill: l[2] || C.ink, weight: l[3] || 400 });
    });
  }
  function tag(s, x, y, w, label, color) {
    var g = G.boxes[s];
    el('rect', { x: x, y: y, width: w, height: 15, rx: 7.5, fill: '#2b1018', stroke: color, 'stroke-width': 1.2 }, g);
    txt(g, x + w / 2, y + 8, label, { size: 9, fill: '#fecaca', weight: 600 });
  }
  function pill(s, x, y, w, label) {
    var g = G.boxes[s];
    el('rect', { x: x, y: y, width: w, height: 22, rx: 11, fill: '#0f2a2e', stroke: C.teal, 'stroke-width': 1.2 }, g);
    txt(g, x + w / 2, y + 11.5, label, { size: 10.5, fill: C.teal, weight: 600 });
  }

  /* packet: emoji on a dark disc moving along an invisible route (SMIL animateMotion + mpath) */
  var pid = 0;
  function packet(s, d, emoji, color, dur, begin) {
    var id = 'route' + (++pid);
    var route = el('path', { id: id, d: d, fill: 'none', stroke: 'none' }, defs);
    var g = el('g', {}, G.packets[s]);
    el('circle', { r: 11, fill: '#0b1433', stroke: color, 'stroke-width': 1.5 }, g);
    txt(g, 0, 1, emoji, { size: 13 });
    if (REDUCE) {
      var pt = route.getPointAtLength(route.getTotalLength() * 0.5);
      g.setAttribute('transform', 'translate(' + pt.x + ',' + pt.y + ')');
      return;
    }
    var b = begin || '0s';
    var am = el('animateMotion', { dur: dur, begin: b, repeatCount: 'indefinite', rotate: '0' }, g);
    var mp = el('mpath', {}, am);
    mp.setAttribute('href', '#' + id);
    mp.setAttributeNS(XL, 'xlink:href', '#' + id);
    el('animate', {
      attributeName: 'opacity', values: '0;1;1;0', keyTimes: '0;0.08;0.88;1',
      dur: dur, begin: b, repeatCount: 'indefinite'
    }, g);
  }

  /* ---------- Step 1: region + VPC ---------- */
  frame(1, 170, 10, 730, 600, C.blue, 'AWS Cloud region (the city)', { lx: 186, ly: 27 });
  frame(1, 190, 40, 690, 555, C.teal, 'VPC  10.0.0.0/16  (fenced plot)', { lx: 206, ly: 57, fo: 0.09, size: 12.5 });

  /* ---------- Step 2: availability zones ---------- */
  frame(2, 235, 75, 300, 505, C.blue, 'Availability Zone A (Building 1)', { dash: '6 5', lx: 250, ly: 92, size: 11.5, r: 12 });
  frame(2, 565, 75, 300, 505, C.blue, 'Availability Zone B (Building 2)', { dash: '6 5', lx: 580, ly: 92, size: 11.5, r: 12 });

  /* ---------- Step 3: subnets ---------- */
  [250, 580].forEach(function (x) {
    frame(3, x, 108, 270, 192, C.gold, 'Public subnet (lobby)', { lx: x + 16, ly: 124, size: 11, fo: 0.12 });
    frame(3, x, 320, 270, 245, C.purple, 'Private subnet (flats)', { lx: x + 16, ly: 549, size: 11, fo: 0.12 });
  });

  /* ---------- Step 4: gate, internet, visitors, route table ---------- */
  node(4, 20, 60, 120, 60, C.blue, [['Visitors', 12, C.ink, 700], ['(customers)', 9.5, C.dim]]);
  node(4, 20, 200, 120, 70, C.blue, [['The Internet', 12, C.ink, 700], ['(the outside road)', 9.5, C.dim]]);
  node(4, 155, 185, 70, 70, C.gold, [['Internet', 11, C.ink, 700], ['Gateway', 11, C.ink, 700], ['(main gate)', 9, C.dim]]);
  pill(4, 620, 46, 250, 'Route table: outside traffic \u2192 Main Gate');
  wire(4, 'M80,120 V200', C.blue);
  wire(4, 'M140,215 H155', C.gold);
  packet(4, 'M80,122 V208 L96,215 H158', '\u2709\uFE0F', C.blue, '3.2s');

  /* ---------- Step 5: load balancer + web servers ---------- */
  node(5, 262, 145, 576, 26, C.gold, [['Load Balancer (receptionist) shares visitors between both zones', 11, C.ink, 600]]);
  node(5, 265, 205, 110, 50, C.gold, [['Web server', 12, C.ink, 700], ['(shop counter)', 9.5, C.dim]]);
  node(5, 595, 205, 110, 50, C.gold, [['Web server', 12, C.ink, 700], ['(shop counter)', 9.5, C.dim]]);
  wire(5, 'M225,215 H243 V188 H650 V205', C.gold);
  wire(5, 'M320,188 V205', C.gold);
  packet(5, 'M225,215 H243 V188 H320 V205', '\u2709\uFE0F', C.blue, '3s');
  packet(5, 'M225,215 H243 V188 H650 V205', '\u2709\uFE0F', C.blue, '4.4s', '-1.3s');

  /* ---------- Step 6: app servers, database, live copy ---------- */
  node(6, 265, 370, 110, 50, C.purple, [['App server', 12, C.ink, 700], ['(back office)', 9.5, C.dim]]);
  node(6, 400, 370, 110, 50, C.purple, [['Database', 12, C.ink, 700], ['(record room)', 9.5, C.dim]]);
  node(6, 595, 370, 110, 50, C.purple, [['App server', 12, C.ink, 700], ['(back office)', 9.5, C.dim]]);
  node(6, 725, 370, 110, 50, C.purple, [['Live-copy DB', 12, C.ink, 700], ['(spare records)', 9.5, C.dim]]);
  wire(6, 'M362,258 V382 H400', C.purple);
  wire(6, 'M692,258 V382 H725', C.purple);
  wire(6, 'M497,420 V480 H738 V420', C.teal);
  txt(G.boxes[6], 617, 498, 'every record is copied to Zone B', { size: 10, fill: C.teal });
  packet(6, 'M362,258 V382 H400', '\uD83D\uDCBE', C.purple, '3s');
  packet(6, 'M692,258 V382 H725', '\uD83D\uDCBE', C.purple, '3s', '-1.5s');
  packet(6, 'M497,420 V480 H738 V420', '\uD83D\uDD01', C.teal, '4.5s');

  /* ---------- Step 7: NAT gateway ---------- */
  node(7, 400, 205, 105, 50, C.gold, [['NAT Gateway', 11.5, C.ink, 700], ['(delivery counter)', 9, C.dim]]);
  wire(7, 'M275,370 V285 H450 V255', C.gold);
  wire(7, 'M428,255 V296 H243 V248 H225', C.gold);
  wire(7, 'M155,248 H140', C.gold);
  packet(7, 'M275,370 V285 H450 V258', '\uD83D\uDCE6', C.gold, '3.4s');
  packet(7, 'M428,255 V296 H243 V248 H141', '\uD83D\uDCE6', C.gold, '3.6s', '-1.8s');

  /* ---------- Step 8: security ---------- */
  [[320, 258], [650, 258], [320, 424], [650, 424], [455, 424], [780, 424]].forEach(function (p) {
    tag(8, p[0] - 32, p[1], 64, 'SG guard', C.red);
  });
  [[408, 116], [738, 116], [408, 541], [738, 541]].forEach(function (p) {
    tag(8, p[0], p[1], 104, 'NACL gate guard', C.red);
  });
  wire(8, 'M141,262 H215 V335 H243', C.red);
  var blk = el('g', { 'class': 'pulse' }, G.boxes[8]);
  el('circle', { cx: 254, cy: 335, r: 10, fill: C.red }, blk);
  txt(blk, 254, 336, '\u2715', { size: 12, fill: '#ffffff', weight: 700 });
  txt(G.boxes[8], 215, 362, 'Blocked!', { size: 12, fill: C.red, weight: 800 });
  packet(8, 'M141,262 H215 V335 H243', '\uD83D\uDE08', C.red, '4s');

  /* ---------- Step 9: office VPN + partner peering ---------- */
  node(9, 20, 440, 120, 90, C.green, [['Office', 12, C.ink, 700], ["(Bharathi's shop)", 9.5, C.dim]]);
  node(9, 155, 446, 70, 84, C.green, [['VPN', 12, C.ink, 700], ['gateway', 11, C.ink, 700], ['(secret door)', 9, C.dim]]);
  txt(G.boxes[9], 80, 548, 'Secret tunnel (VPN)', { size: 10.5, fill: C.green, weight: 600 });
  wire(9, 'M140,458 H155', C.green);
  wire(9, 'M225,458 H250', C.green);
  packet(9, 'M141,458 H250', '\uD83D\uDD12', C.green, '3s');
  node(9, 935, 250, 145, 100, C.green, [['Partner VPC', 12, C.ink, 700], ['192.168.0.0/16', 10, C.ink], ["(neighbour's shop)", 9.5, C.dim]]);
  txt(G.boxes[9], 1007, 370, 'VPC peering', { size: 10.5, fill: C.green, weight: 600 });
  txt(G.boxes[9], 1007, 384, '(private road)', { size: 9.5, fill: C.dim });
  wire(9, 'M880,310 H935', C.green);
  packet(9, 'M882,310 H933 L882,310', '\uD83E\uDD1D', C.green, '2.6s');

  /* ---------- UI: sidebar, caption, autoplay ---------- */
  var list = document.getElementById('steps');
  var buttons = [];
  STEPS.forEach(function (st, i) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'step';
    b.innerHTML = '<span class="num">' + (i + 1) + '</span><span><span class="t"></span><span class="s"></span></span>';
    b.querySelector('.t').textContent = st.btn;
    b.querySelector('.s').textContent = st.sub;
    b.addEventListener('click', function () { stopAuto(); show(i + 1); });
    li.appendChild(b);
    list.appendChild(li);
    buttons.push(b);
  });

  var cur = 0;
  function show(n) {
    if (n === cur) return;
    ['wires', 'boxes', 'packets'].forEach(function (name) {
      for (var s = 1; s <= STEPS.length; s++) {
        var g = G[name][s];
        var wasOn = g.classList.contains('on');
        if (s <= n) {
          if (!wasOn) {
            g.classList.remove('new');
            void g.getBoundingClientRect();
            g.classList.add('on', 'new');
          } else {
            g.classList.remove('new');
          }
        } else {
          g.classList.remove('on', 'new');
        }
      }
    });
    cur = n;
    buttons.forEach(function (b, i) {
      if (i + 1 === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.classList.toggle('done', i + 1 < n);
    });
    var st = STEPS[n - 1];
    document.getElementById('cap-title').textContent = st.title;
    document.getElementById('cap-plain').textContent = st.plain;
    document.getElementById('cap-tech').textContent = st.tech;
    document.getElementById('cap-watch').textContent = st.watch;
    if (window.innerWidth <= 900) {
      buttons[n - 1].scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCE ? 'auto' : 'smooth' });
    }
  }

  var timer = null;
  var autoBtn = document.getElementById('auto');
  function stopAuto() {
    if (timer) { clearInterval(timer); timer = null; }
    autoBtn.textContent = 'Auto-play';
    autoBtn.setAttribute('aria-pressed', 'false');
  }
  function startAuto() {
    if (cur >= STEPS.length) show(1);
    autoBtn.textContent = 'Pause';
    autoBtn.setAttribute('aria-pressed', 'true');
    timer = setInterval(function () {
      if (cur >= STEPS.length) { stopAuto(); return; }
      show(cur + 1);
    }, 5000);
  }
  autoBtn.addEventListener('click', function () { if (timer) stopAuto(); else startAuto(); });
  document.getElementById('reset').addEventListener('click', function () { stopAuto(); show(1); });

  show(1);
})();
