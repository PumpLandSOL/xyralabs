// XYRA videos for X (1920×1080, frame-exact): hype, threat, payment.  node _studio/videos.cjs [hype|threat|payment]
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process'), { open, sleep } = require('./cdp.cjs');
const OUT = path.join(__dirname, '..', 'brand', 'kit'), SRC = path.join(__dirname, 'src'), FPS = 30, url = (f) => 'file:///' + f.split(path.sep).join('/');
const MARKSVG = fs.readFileSync(path.join(__dirname, '..', 'brand', 'xyra-mark.svg'), 'utf8');
const MARK = (px) => MARKSVG.replace('<svg ', `<svg width="${px}" height="${px}" `);
// the mark's squares as [cx, cy, size] in its 8..92 viewBox, used as targets for the assembling dots
const SQ = [...MARKSVG.matchAll(/x="([\d.]+)" y="([\d.]+)" width="([\d.]+)"/g)].map((m) => [+m[1] + m[3] / 2, +m[2] + m[3] / 2, +m[3]]);
const HEAD = `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Geist+Mono:wght@400&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{width:1920px;height:1080px;background:#0b0b0b;color:#e8e4dc;overflow:hidden;position:relative;font:400 34px 'Archivo',sans-serif}
.s{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0}
.disp{font:500 120px/1.02 'Archivo';font-stretch:118%;letter-spacing:-.025em;color:#d4d0c8}.disp b{font-weight:500;color:#fff}
.cap{font:400 22px 'Geist Mono',monospace;letter-spacing:.22em;text-transform:uppercase;color:#9a968f}.m{font-family:'Geist Mono',monospace}
.frame{position:relative;border:1px solid rgba(232,228,220,.2);background:#121211;text-align:left}.frame:before,.frame:after{content:'';position:absolute;width:14px;height:14px;border:2px solid #fff}.frame:before{top:-1px;left:-1px;border-right:0;border-bottom:0}.frame:after{bottom:-1px;right:-1px;border-left:0;border-top:0}
.r{display:grid;grid-template-columns:260px 1fr;padding:18px 0;border-bottom:1px solid rgba(232,228,220,.14);font-size:30px}.r span:last-child{text-align:right;font:400 28px 'Geist Mono';transition:none}
#cv{position:absolute;inset:0}</style></head><body><canvas id="cv" width="1920" height="1080"></canvas>`;
const JS = `const $=(i)=>document.getElementById(i),cl=(x)=>Math.max(0,Math.min(1,x)),e=(x)=>1-Math.pow(1-cl(x),3),eio=(x)=>{x=cl(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2},win=(t,a,b,f=.45)=>cl(Math.min((t-a)/f,(b-t)/f));
const show=(id,t,a,b,f)=>{const o=win(t,a,b,f),el=$(id);el.style.opacity=o;el.style.transform='translateY('+((1-o)*14).toFixed(1)+'px)';};
const HX='0123456789abcdef',hr=(n,s)=>{let x=s,o='';for(let i=0;i<n;i++){x=(x*16807)%2147483647;o+=HX[x%16];if(i%4===3&&i<n-1)o+=' '}return o};
// marble field: soft blobs of bone dots, drifting
function field(t,amt){const g=$('cv').getContext('2d');g.clearRect(0,0,1920,1080);if(amt<=0)return;g.fillStyle='#e8e4dc';let x=9;const r=()=>(x=(x*16807)%2147483647)/2147483647;
  for(let b=0;b<8;b++){const bx=r()*1920+Math.sin(t*.12+b)*70,by=r()*1080+Math.cos(t*.1+b*2)*50,R=110+r()*220,n=Math.round(R*R/75);for(let i=0;i<n;i++){const a=r()*6.283,d=Math.sqrt(r())*R*(.72+.28*Math.sin(a*3+b));g.globalAlpha=amt*(.3+.7*r());g.fillRect(bx+Math.cos(a)*d,by+Math.sin(a)*d,2,2);}}g.globalAlpha=1;}`;
const END = (h) => `<div class="s" id="z">${MARK(170)}<div style="display:flex;align-items:center;gap:14px;margin-top:34px;font:500 46px Archivo;font-stretch:118%;letter-spacing:.04em">XYRA <span class="cap" style="font-size:24px">labs</span></div><div class="disp" style="font-size:78px;margin-top:46px">${h}</div><div class="cap" style="margin-top:40px">@XyraLabsL1</div></div>`;
const ENDJS = (a) => `$('z').style.opacity=cl((t-${a})/.6);`;
async function render(c, name, html, dur) { const FR = path.join(__dirname, 'frames-' + name); fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true }); fs.mkdirSync(SRC, { recursive: true });
  const f = path.join(SRC, name + '.html'); fs.writeFileSync(f, html);
  await c.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false }); await c.send('Page.navigate', { url: url(f) }); await sleep(3000); await c.ev('document.fonts.ready.then(()=>1)');
  const N = Math.round(dur * FPS); for (let i = 0; i < N; i++) { await c.ev('__seek(' + (i / FPS).toFixed(4) + ')'); await c.shot(path.join(FR, 'f_' + String(i).padStart(4, '0') + '.jpg'), 'jpeg'); }
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', String(FPS), '-i', path.join(FR, 'f_%04d.jpg'), '-vf', 'format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', path.join(OUT, name + '.mp4')]);
  fs.rmSync(FR, { recursive: true, force: true }); console.log('OK', name + '.mp4'); }

// 1. hype: scattered dots assemble into the mark, hold, disperse into the field as the headline lands
async function hype(c) {
  const html = HEAD + `<div class="s" id="a"><div class="disp">Privacy that<br><b>outlives</b> the<br>quantum computer.</div></div>
  <div class="s" id="b"><div class="cap">post-quantum from the first block</div><div style="display:flex;gap:28px;margin-top:40px">${['zk-STARK', 'ML-KEM-768', 'Poseidon2', 'ChaCha20-Poly1305'].map((t, i) => `<span id="t${i}" style="opacity:0;font:400 30px 'Geist Mono';border:1px solid rgba(232,228,220,.4);border-radius:999px;padding:12px 26px">${t}</span>`).join('')}</div><div class="disp" style="font-size:74px;margin-top:60px">Every transaction <b>shielded.</b></div></div>
  ${END('A post-quantum<br>privacy layer 1.')}
  <script>${JS}const SQ=${JSON.stringify(SQ)};let x=3;const r=()=>(x=(x*16807)%2147483647)/2147483647;
  const P=[];for(const [cx,cy,s] of SQ){const k=Math.max(3,Math.round(s*s*1.6));for(let i=0;i<k;i++)P.push({tx:960+(cx-50+(r()-.5)*s)*7.2,ty:520+(cy-50+(r()-.5)*s)*7.2,sx:r()*1920,sy:r()*1080,ex:r()*1920,ey:r()*1080,d:r()*.5});}
  window.__seek=(t)=>{const g=$('cv').getContext('2d');
    if(t<4.4){g.clearRect(0,0,1920,1080);g.fillStyle='#e8e4dc';for(const p of P){const k=eio((t-.2-p.d)/1.8),o=eio((t-3.2-p.d*.6)/1.2);const X=p.sx+(p.tx-p.sx)*k,Y=p.sy+(p.ty-p.sy)*k;const fx=X+(p.ex-X)*o,fy=Y+(p.ey-Y)*o;g.globalAlpha=.6+.4*k;g.fillRect(fx,fy,3,3);}g.globalAlpha=1;}
    else field(t,t<12?.55:.3);
    show('a',t,3.8,8.2);show('b',t,8.2,12.6);for(let i=0;i<4;i++)$('t'+i).style.opacity=cl((t-8.5-i*.35)/.3);${ENDJS(12.6)}};</script></body></html>`;
  await render(c, 'xyra-hype-16s', html, 16); }

// 2. threat: record → wait (years tick) → decrypt; the privacy coin opens, XYRA stays sealed
async function threat(c) {
  const F = [['From', 'wallet 7f3a… linked'], ['To', 'wallet 91be… linked'], ['Amount', '1,250.00'], ['Memo', 'invoice #4410']];
  const html = HEAD + `<div class="s" id="a"><div class="cap">what happens after q-day</div><div class="disp" style="margin-top:30px"><span id="w0">Record.</span> <span id="w1">Wait.</span> <b id="w2">Decrypt.</b></div></div>
  <div class="s" id="b"><div style="display:flex;justify-content:space-between;width:1620px;margin-bottom:26px"><span class="cap" id="ph">● record</span><span class="m" id="yr" style="font-size:54px">2026</span></div>
    <div class="frame" style="width:1620px;display:grid;grid-template-columns:1fr 1fr"><div style="padding:30px 38px;border-right:1px solid rgba(232,228,220,.14)"><div class="cap" style="font-size:18px;margin-bottom:8px">a privacy coin today</div>${F.map((x, i) => `<div class="r"><span>${x[0]}</span><span id="a${i}"></span></div>`).join('')}<div class="cap" id="na" style="font-size:18px;margin-top:16px">copied and kept</div></div>
    <div style="padding:30px 38px"><div class="cap" style="font-size:18px;margin-bottom:8px;color:#e8e4dc">xyra</div>${F.map((x, i) => `<div class="r"><span>${x[0]}</span><span id="b${i}"></span></div>`).join('')}<div class="cap" id="nb" style="font-size:18px;margin-top:16px">copied and kept</div></div></div></div>
  ${END('What was recorded<br><b>stays private.</b>')}
  <script>${JS}const F=${JSON.stringify(F)};window.__seek=(t)=>{field(t,.22);show('a',t,0,3.4);['w0','w1','w2'].forEach((w,i)=>$(w).style.opacity=cl((t-.3-i*.8)/.35));
  show('b',t,3.4,12.6);const yr=Math.min(2036,2026+Math.floor(cl((t-5.2)/3)*10));$('yr').textContent=yr;const dec=t>8.6;$('ph').textContent=t<5.2?'● record':dec?'● decrypt':'● wait';
  for(let i=0;i<4;i++){const a=$('a'+i),b=$('b'+i),seed=Math.floor(t*(t<8.6?8:0))+i*31;if(dec&&t>8.8+i*.25){a.textContent=F[i][1];a.style.color='#fff';}else{a.textContent=hr(16,seed+5);a.style.color='#9a968f';}b.textContent=hr(16,(dec?999:seed)+i*77);b.style.color='#9a968f';}
  $('na').textContent=t>9.8?'every past payment exposed':'copied and kept';$('nb').textContent=t>9.8?'still sealed':'copied and kept';$('na').style.color=t>9.8?'#fff':'#9a968f';${ENDJS(12.6)}};</script></body></html>`;
  await render(c, 'xyra-threat-16s', html, 16); }

// 3. payment: five steps, the on-chain record fills in, "a payment is a gap"
async function payment(c) {
  const S = [['01 · share an address', 'An ML-KEM-768 public key, about 1,900 characters'], ['02 · seal the note', 'A fresh secret encrypts amount, memo and spend data'], ['03 · prove the spend', 'A STARK proves ownership and balance'], ['04 · verify and mine', 'Nodes check the nullifier; miners fold every proof'], ['05 · receive', 'One key opens one note. Nobody else sees a thing']];
  const O = [['Nullifier', '0x3a9f…c41e'], ['Note commitment', '0x81d0…07b3'], ['KEM ciphertext', '1,088 bytes'], ['Encrypted note', 'sealed'], ['STARK proof', '≈120 KB, folded'], ['Fee', 'public']];
  const html = HEAD + `<div class="s" id="a"><div class="cap">how a payment works</div><div class="disp" style="margin-top:30px">On chain,<br>a payment is <b>a gap.</b></div></div>
  <div class="s" id="b" style="flex-direction:row;gap:90px"><div style="width:760px;text-align:left">${S.map(([h, p], i) => `<div id="s${i}" style="opacity:0;padding:20px 0;border-bottom:1px solid rgba(232,228,220,.14)"><div class="cap" style="font-size:18px">● ${h}</div><div style="font-size:32px;margin-top:8px">${p}</div></div>`).join('')}</div>
    <div class="frame" style="width:640px;padding:12px 34px 26px"><div class="cap" style="font-size:18px;padding:14px 0">on chain</div>${O.map(([k, v], i) => `<div class="r" style="font-size:26px;grid-template-columns:1fr auto;padding:15px 0"><span>${k}</span><span id="o${i}" style="font-size:24px"></span></div>`).join('')}<div class="cap" style="font-size:18px;margin-top:22px">never on chain</div><div class="m" style="font-size:22px;color:#9a968f;margin-top:8px">sender · recipient · amount · which note</div></div></div>
  ${END('Every transaction<br><b>shielded.</b>')}
  <script>${JS}const O=${JSON.stringify(O)};window.__seek=(t)=>{field(t,.2);show('a',t,0,3.2);show('b',t,3.2,12.8);
  for(let i=0;i<5;i++)$('s'+i).style.opacity=cl((t-3.6-i*1.5)/.4)*(t>3.6+i*1.5+1.5&&i<4?.45:1);
  for(let i=0;i<6;i++){const at=5.2+i*1.05,el=$('o'+i);el.textContent=t<at?'—':t<at+.5?hr(8,Math.floor(t*30)+i):O[i][1];el.style.color=t<at+.5?'#5b5955':'#e8e4dc';}${ENDJS(12.8)}};</script></body></html>`;
  await render(c, 'xyra-payment-16s', html, 16); }

(async () => { const only = process.argv[2]; const c = await open('about:blank', 1920, 1080, 9700 + Math.floor(Math.random() * 90));
  if (!only || only === 'hype') await hype(c); if (!only || only === 'threat') await threat(c); if (!only || only === 'payment') await payment(c); c.close(); process.exit(0); })();
