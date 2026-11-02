// XYRA post graphics for X (1600×900), rendered from HTML via headless Chrome.  node _studio/kit.cjs [name]
'use strict';
const fs = require('fs'), path = require('path'), { open, sleep } = require('./cdp.cjs');
const OUT = path.join(__dirname, '..', 'brand', 'kit'), SRC = path.join(__dirname, 'src'); fs.mkdirSync(SRC, { recursive: true }); fs.mkdirSync(OUT, { recursive: true });
const url = (f) => 'file:///' + f.split(path.sep).join('/');
const MARKSVG = fs.readFileSync(path.join(__dirname, '..', 'brand', 'xyra-mark.svg'), 'utf8');
const MARK = (px) => MARKSVG.replace('<svg ', `<svg width="${px}" height="${px}" `);
const HEAD = (W, H) => `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Geist+Mono:wght@400&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{width:${W}px;height:${H}px;overflow:hidden;position:relative;background:#0b0b0b;color:#e8e4dc;font:400 24px/1.5 'Archivo',sans-serif}
.cap{font:400 15px 'Geist Mono',monospace;letter-spacing:.2em;text-transform:uppercase;color:#9a968f}
.disp{font:500 76px/1 'Archivo';font-stretch:118%;letter-spacing:-.025em;color:#d4d0c8}.disp b{font-weight:500;color:#fff}
.labels{display:flex;align-items:center;gap:18px}.labels span{font:400 15px 'Geist Mono';letter-spacing:.22em;text-transform:uppercase;color:#9a968f}.labels i{flex:1;height:1px;background:rgba(232,228,220,.2)}
.frame{position:absolute;border:1px solid rgba(232,228,220,.2);background:#121211}.frame:before,.frame:after{content:'';position:absolute;width:12px;height:12px;border:1.5px solid #fff}.frame:before{top:-1px;left:-1px;border-right:0;border-bottom:0}.frame:after{bottom:-1px;right:-1px;border-left:0;border-top:0}
.r{display:grid;padding:16px 26px;border-bottom:1px solid rgba(232,228,220,.14);align-items:center}.r:last-child{border-bottom:0}.k{font:400 15px 'Geist Mono';letter-spacing:.16em;text-transform:uppercase;color:#9a968f}.m{font:400 20px 'Geist Mono'}
.foot{position:absolute;left:80px;right:80px;bottom:48px;display:flex;justify-content:space-between;align-items:center}.brand{display:flex;align-items:center;gap:14px;font:500 22px 'Archivo';font-stretch:118%;letter-spacing:.04em}.brand small{font:400 13px 'Geist Mono';letter-spacing:.24em;color:#9a968f}
</style></head><body>`;
const FOOT = (n) => `<div class="foot"><span class="brand">${MARK(30)}XYRA <small>LABS</small></span><span class="cap">@XyraLabsL1 · ${n}</span></div>`;
const LBL = (a) => `<div class="labels">${a.map((w, i) => (i ? '<i></i>' : '') + `<span>${w}</span>`).join('')}</div>`;
// marble stipple: soft blobs of bone dots (deterministic)
const FIELD = (W, H, n = 6, seed = 5, op = 1) => { let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; let o = '';
  for (let b = 0; b < n; b++) { const bx = r() * W, by = r() * H, R = 80 + r() * 230, c = Math.round(R * R / 70); for (let i = 0; i < c; i++) { const a = r() * 6.283, d = Math.sqrt(r()) * R * (0.7 + 0.3 * Math.sin(a * 3 + b)); o += `<rect x="${(bx + Math.cos(a) * d).toFixed(1)}" y="${(by + Math.sin(a) * d).toFixed(1)}" width="2" height="2" opacity="${((0.35 + r() * 0.65) * op).toFixed(2)}"/>`; } }
  return `<svg width="${W}" height="${H}" style="position:absolute;inset:0" fill="#e8e4dc">${o}</svg>`; };
const hx = (n, seed) => { let s = seed, o = ''; for (let i = 0; i < n; i++) { s = (s * 16807) % 2147483647; o += '0123456789abcdef'[s % 16]; if (i % 4 === 3 && i < n - 1) o += ' '; } return o; };

const G = {
  // 1. the threat
  'xyra-g01-threat': [1600, 900, () => HEAD(1600, 900) + `<div style="position:absolute;left:80px;right:80px;top:80px">${LBL(['what', 'happens', 'after', 'q-day'])}
    <div style="display:flex;justify-content:space-between;margin-top:22px" class="disp"><span>Record.</span><span>Wait.</span><b>Decrypt.</b></div></div>
    <div class="frame" style="left:80px;right:80px;top:330px;height:400px;display:grid;grid-template-columns:1fr 1fr">
      <div style="padding:26px 30px;border-right:1px solid rgba(232,228,220,.14)"><div class="k" style="margin-bottom:10px">a privacy coin today · read in 2036</div>${[['From', 'wallet 7f3a… linked'], ['To', 'wallet 91be… linked'], ['Amount', '1,250.00'], ['Memo', 'invoice #4410']].map(([k, v]) => `<div class="r" style="grid-template-columns:200px 1fr;padding:15px 0"><span style="font-size:20px">${k}</span><span class="m" style="text-align:right;color:#fff">${v}</span></div>`).join('')}<div class="k" style="margin-top:14px">every past payment exposed</div></div>
      <div style="padding:26px 30px"><div class="k" style="margin-bottom:10px;color:#e8e4dc">${MARK(14)} xyra · read in 2036</div>${['From', 'To', 'Amount', 'Memo'].map((k, i) => `<div class="r" style="grid-template-columns:200px 1fr;padding:15px 0"><span style="font-size:20px">${k}</span><span class="m" style="text-align:right;color:#9a968f">${hx(16, 11 + i * 7)}</span></div>`).join('')}<div class="k" style="margin-top:14px">still sealed</div></div></div>
    ${FOOT('post-quantum privacy')}</body></html>`],
  // 2. the primitives
  'xyra-g02-primitives': [1600, 900, () => HEAD(1600, 900) + `<div style="position:absolute;left:80px;right:80px;top:80px">${LBL(['inside', 'the', 'shielded', 'pool'])}
    <div class="disp" style="font-size:54px;margin-top:22px">Every curve, replaced with <b>hashes and lattices.</b></div></div>
    <div class="frame" style="left:80px;right:80px;top:290px">${[['spend proofs', 'zk-STARK', 'Groth16 · Halo 2'], ['stealth addresses', 'ML-KEM-768', 'elliptic-curve Diffie-Hellman'], ['note encryption', 'ChaCha20-Poly1305', 'keys from elliptic curves'], ['commitments + nullifiers', 'Poseidon2', 'Pedersen · Sinsemilla'], ['value balance', 'checked in the proof', 'Pedersen value commitments'], ['consensus', 'CPU proof of work', 'block signatures']].map(([a, b, c]) => `<div class="r" style="grid-template-columns:380px 480px 1fr"><span class="k">${a}</span><span style="font:500 30px 'Archivo';font-stretch:112%;color:#fff">${b}</span><span class="m" style="color:#9a968f;font-size:17px">replaces <span style="color:#d4d0c8">${c}</span></span></div>`).join('')}</div>
    ${FOOT('the design')}</body></html>`],
  // 3. a payment is a gap
  'xyra-g03-gap': [1600, 900, () => HEAD(1600, 900) + FIELD(1600, 900, 5, 23, 0.5) + `<div style="position:absolute;left:80px;right:80px;top:80px">${LBL(['how', 'a', 'payment', 'works'])}
    <div class="disp" style="margin-top:22px;text-align:center">On chain, a payment is <b>a gap.</b></div></div>
    <div class="frame" style="left:250px;width:540px;top:290px"><div class="r" style="grid-template-columns:1fr auto"><span class="k">on chain</span><span class="k" style="color:#e8e4dc;border:1px solid rgba(232,228,220,.4);padding:3px 10px;border-radius:6px">example</span></div>${[['Nullifier', '0x3a9f…c41e'], ['Note commitment', '0x81d0…07b3'], ['KEM ciphertext', '1,088 bytes'], ['Encrypted note', 'sealed'], ['STARK proof', '≈120 KB, folded'], ['Fee', 'public']].map(([k, v]) => `<div class="r" style="grid-template-columns:1fr auto;padding:13px 26px"><span style="font-size:20px">${k}</span><span class="m">${v}</span></div>`).join('')}</div>
    <div style="position:absolute;left:860px;top:300px;width:500px"><div class="k">never on chain</div><div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:20px">${['Sender', 'Recipient', 'Amount', 'Which note was spent', 'Memo'].map((t) => `<span style="font:400 22px 'Geist Mono';border:1px solid rgba(232,228,220,.4);border-radius:999px;padding:8px 18px;color:#e8e4dc">${t}</span>`).join('')}</div>
    <p style="color:#9a968f;font-size:22px;margin-top:34px;line-height:1.6">A shielded transaction proves a payment happened without saying who sent it, who received it, or how much moved.</p></div>
    ${FOOT('every transaction shielded')}</body></html>`],
  // 4. sizes
  'xyra-g04-sizes': [1600, 900, () => HEAD(1600, 900) + `<div style="position:absolute;left:80px;right:80px;top:80px">${LBL(['sizes', 'we', 'design', 'around'])}
    <div style="display:flex;justify-content:space-between;margin-top:22px" class="disp"><span>Lasting privacy</span><b>has a size.</b></div></div>
    <div style="position:absolute;left:80px;right:80px;top:330px;display:grid;grid-template-columns:repeat(4,1fr);gap:22px">${[['per transaction · estimate', '50–200 KB', 'STARK spend proof, before it is folded into the block proof.'], ['per block', '1 proof', 'Miners fold every transaction proof into one, so nodes verify a single proof per block.'], ['per address', '~1,900', 'Characters in an address. The ML-KEM-768 key alone is 1,184 bytes, so wallets use QR codes.'], ['trusted setups', '0', 'STARKs are transparent. No ceremony and no secret someone has to destroy.']].map(([a, b, c]) => `<div style="border:1px solid rgba(232,228,220,.2);border-radius:16px;background:#121211;padding:28px;height:330px"><div class="k">${a}</div><div style="font:500 46px/1 'Archivo';font-stretch:108%;white-space:nowrap;margin:22px 0 18px;color:#fff">${b}</div><p style="color:#9a968f;font-size:19px;line-height:1.55">${c}</p></div>`).join('')}</div>
    ${FOOT('the numbers')}</body></html>`],
  // 5. vs other chains
  'xyra-g05-vs': [1600, 900, () => { const cols = ['XYRA', 'Zcash', 'Monero', 'Bitcoin', 'Ethereum', 'QRL'];
    const rows = [['Every transaction shielded', [1, 0, 1, 0, 0, 0]], ['Hides sender, receiver and amount', [1, 1, 1, 0, 0, 0]], ['Post-quantum stealth addresses', [1, 0, 0, 0, 0, 0]], ['Hash-based spend proofs (STARK)', [1, 0, 0, 0, 0, 0]], ['Shielded pool with no trusted setup', [1, 1, 1, 0, 0, 0]], ['Past privacy holds after Q-day', [1, 0, 0, 0, 0, 0]]];
    const gc = 'grid-template-columns:520px repeat(6,1fr)', mk = (v, me) => v ? `<span style="font-size:30px;color:${me ? '#fff' : '#d4d0c8'}">✓</span>` : `<span style="font-size:26px;color:#5b5955">✕</span>`;
    return HEAD(1600, 900) + `<div style="position:absolute;left:80px;right:80px;top:70px">${LBL(['same', 'goal', 'different', 'math'])}
    <div style="display:flex;justify-content:space-between;margin-top:20px" class="disp"><span>Every box.</span><b>One chain.</b></div></div>
    <div class="frame" style="left:80px;right:80px;top:250px"><div class="r" style="${gc};padding:14px 26px"><span></span>${cols.map((c, i) => `<span style="text-align:center;${i ? 'font:400 15px \'Geist Mono\';letter-spacing:.14em;text-transform:uppercase;color:#9a968f' : 'display:flex;align-items:center;justify-content:center;gap:8px;font:500 20px Archivo;font-stretch:118%;color:#fff'}">${i ? c : MARK(18) + c}</span>`).join('')}</div>
    ${rows.map(([t, v]) => `<div class="r" style="${gc};padding:12px 26px"><span style="font-size:21px">${t}</span>${v.map((x, i) => `<span style="text-align:center${i ? '' : ';background:rgba(232,228,220,.06)'}">${mk(x, !i)}</span>`).join('')}</div>`).join('')}</div>
    <div class="cap" style="position:absolute;left:80px;right:80px;top:772px;font-size:12px;letter-spacing:.14em;color:#5b5955">XYRA per its published design. Zcash shielding is optional; Orchard has no trusted setup. QRL uses hash-based signatures but is transparent.</div>
    ${FOOT('compare')}</body></html>`; }],
};

(async () => { const only = process.argv[2]; const c = await open('about:blank', 1600, 900, 9600 + Math.floor(Math.random() * 90));
  for (const [name, [w, h, fn]] of Object.entries(G)) { if (only && only !== name) continue; const f = path.join(SRC, name + '.html'); fs.writeFileSync(f, fn());
    await c.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); await c.send('Page.navigate', { url: url(f) }); await sleep(1800); await c.ev('document.fonts.ready.then(()=>1)'); await sleep(300);
    await c.shot(path.join(OUT, name + '.png')); console.log('OK', name); }
  c.close(); process.exit(0); })();
