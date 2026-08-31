const panel=document.getElementById("panel"), toastEl=document.getElementById("toast"), historyEl=document.getElementById("history");
const statusEl=document.getElementById("status"); const state={tool:"generate"};

const presets={
  photorealistic:"Ultra-realistic professional photography",
  smartphone:"Authentic modern smartphone candid photography",
  cinematic:"Cinematic photography with motivated lighting",
  editorial:"High-end editorial fashion photography",
  street:"Raw candid street photography"
};

function toast(x){toastEl.textContent=x;toastEl.classList.add("show");setTimeout(()=>toastEl.classList.remove("show"),2600)}
async function api(url,opt={}){const r=await fetch(url,opt);const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Terjadi kesalahan.");return j}
async function health(){try{const j=await api("/api/health");statusEl.textContent=j.configured?"AI READY":"API KEY NEEDED";document.querySelector(".online").classList.toggle("ok",j.configured)}catch{statusEl.textContent="SERVER OFFLINE"}}
health();

const toolData={
generate:{
title:"Generate Image",sub:"Tulis ide. ZANE akan mengubahnya menjadi visual yang lebih terarah.",chip:"GPT-IMAGE-2",
html:()=>`<div class="toolHead"><div><h2>Generate Image</h2><p>Prompt → foto berkualitas tinggi</p></div><span class="modelChip">GPT-IMAGE-2 • HIGH</span></div>
<div class="field"><label>IDE / PROMPT</label><textarea id="prompt" placeholder="Contoh: pria muda berdiri santai di kafe malam, foto candid smartphone..."></textarea></div>
<div class="presets">${Object.entries(presets).map(([k,v])=>`<button class="preset" data-preset="${k}">${v}</button>`).join("")}</div>
<div class="row"><div class="field"><label>ASPECT RATIO</label><select id="size"><option value="1536x1024">Landscape 3:2</option><option value="1024x1536">Portrait 2:3</option><option value="1024x1024">Square 1:1</option><option value="2048x1152">Wide 16:9</option><option value="1152x2048">Tall 9:16</option></select></div><div class="field"><label>QUALITY</label><select id="quality"><option value="high">High — terbaik</option><option value="medium">Medium — lebih cepat</option><option value="low">Low — draft</option></select></div></div>
<div class="actions"><button class="secondary" id="enhance">✦ Rapikan Prompt</button><button class="primary" id="run">Generate Foto</button></div>
<div class="tiny">Tip: detail pose, kamera, cahaya, pakaian, lokasi dan mood biasanya menghasilkan kontrol yang lebih baik.</div>
<div class="loading" id="loading"><i class="spin"></i> Menyiapkan prompt & membuat gambar...</div><div class="result" id="result"></div>`,
bind:()=>document.querySelectorAll("[data-preset]").forEach(b=>b.onclick=()=>{document.getElementById("prompt").value=(document.getElementById("prompt").value+" "+presets[b.dataset.preset]).trim()}),
run:async()=>{const prompt=document.getElementById("prompt").value;const j=await api("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,size:document.getElementById("size").value,quality:document.getElementById("quality").value})});showResult(j.image,prompt)}
},
vision:{
html:()=>`<div class="toolHead"><div><h2>Prompt dari Foto</h2><p>Upload foto → dapat prompt fotografi detail.</p></div><span class="modelChip">GPT-5.6 VISION</span></div>
<div class="drop" id="drop"><strong>Upload atau drag foto ke sini</strong><span>JPG / PNG / WEBP • maksimal 20 MB • bisa paste dari clipboard</span><input id="file" hidden type="file" accept="image/*"></div><img class="preview" id="preview">
<div class="actions" style="margin-top:13px"><button class="primary" id="run">Analisis Foto</button></div><div class="loading" id="loading"><i class="spin"></i> AI sedang membaca komposisi foto...</div><div class="result" id="result"></div>`,
bind:single,
run:async()=>{const f=document.getElementById("file").files[0];if(!f)throw Error("Pilih foto terlebih dahulu.");const fd=new FormData();fd.append("image",f);const j=await api("/api/vision-prompt",{method:"POST",body:fd});document.getElementById("result").innerHTML=`<div class="promptResult"><label>PROMPT HASIL • ${j.provider}</label><textarea id="out">${esc(j.prompt)}</textarea><div class="actions" style="margin-top:10px"><button class="secondary" id="copy">Salin Prompt</button><button class="primary" id="use">Gunakan di Generate</button></div></div>`;document.getElementById("copy").onclick=()=>navigator.clipboard.writeText(j.prompt).then(()=>toast("Prompt disalin"));document.getElementById("use").onclick=()=>{state.tool="generate";render();setTimeout(()=>document.getElementById("prompt").value=j.prompt,20)}}
},
swap:{
html:()=>`<div class="toolHead"><div><h2>Face Swap AI</h2><p>Source face + target image → edit realistis.</p></div><span class="modelChip">GPT-IMAGE-2 • HIGH FIDELITY</span></div>
<div class="previews"><div><div class="drop" data-id="sourceDrop"><strong>Foto Wajah</strong><span>Wajah referensi</span><input id="source" hidden type="file" accept="image/*"></div><img id="sourcePreview" class="preview"></div><div><div class="drop" data-id="targetDrop"><strong>Foto Target</strong><span>Foto yang akan diedit</span><input id="target" hidden type="file" accept="image/*"></div><img id="targetPreview" class="preview"></div></div>
<div class="actions" style="margin-top:14px"><button class="primary" id="run">Tukar Wajah</button></div><div class="tiny">Gunakan foto yang jelas dan pencahayaan wajah yang serupa untuk hasil lebih natural.</div><div class="loading" id="loading"><i class="spin"></i> Memproses edit...</div><div class="result" id="result"></div>`,
bind:swapBind,
run:async()=>{const s=document.getElementById("source").files[0],t=document.getElementById("target").files[0];if(!s||!t)throw Error("Isi kedua foto terlebih dahulu.");const fd=new FormData();fd.append("source",s);fd.append("target",t);const j=await api("/api/face-swap",{method:"POST",body:fd});showResult(j.image,"Face Swap")}
},
hdr:{
html:()=>`<div class="toolHead"><div><h2>HDR Enhancer</h2><p>Tambah detail dan clarity tanpa efek HDR berlebihan.</p></div><span class="modelChip">GPT-IMAGE-2 • EDIT</span></div>
<div class="drop" id="drop"><strong>Upload foto</strong><span>JPG / PNG / WEBP • maksimal 20 MB</span><input id="file" hidden type="file" accept="image/*"></div><img class="preview" id="preview"><div class="actions" style="margin-top:13px"><button class="primary" id="run">Enhance HDR</button></div><div class="loading" id="loading"><i class="spin"></i> Meng-enhance foto...</div><div class="result" id="result"></div>`,
bind:single,
run:async()=>{const f=document.getElementById("file").files[0];if(!f)throw Error("Pilih foto terlebih dahulu.");const fd=new FormData();fd.append("image",f);const j=await api("/api/hdr",{method:"POST",body:fd});showResult(j.image,"HDR Enhanced")}
}
};

function render(){
 document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.tool===state.tool));
 const d=toolData[state.tool];panel.innerHTML=d.html();d.bind?.();
 const run=document.getElementById("run");run.onclick=async()=>{document.getElementById("loading").classList.add("show");try{await d.run();toast("Selesai.");}catch(e){toast(e.message)}finally{document.getElementById("loading").classList.remove("show")}};
 if(state.tool==="generate")document.getElementById("enhance").onclick=enhance;
}
async function enhance(){const prompt=document.getElementById("prompt").value;if(!prompt.trim())return toast("Tulis ide dulu.");const b=document.getElementById("enhance");b.disabled=true;b.textContent="✦ Merapikan...";try{const j=await api("/api/enhance-prompt",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,style:"photorealistic",ratio:document.getElementById("size").value})});document.getElementById("prompt").value=j.prompt;toast("Prompt diperkuat.")}catch(e){toast(e.message)}finally{b.disabled=false;b.textContent="✦ Rapikan Prompt"}}
function single(){const d=document.getElementById("drop"),i=document.getElementById("file"),p=document.getElementById("preview");const pick=()=>i.click();d.onclick=pick;i.onchange=()=>{const f=i.files[0];if(f){p.src=URL.createObjectURL(f);p.classList.add("show")}};d.ondragover=e=>{e.preventDefault();d.classList.add("drag")};d.ondragleave=()=>d.classList.remove("drag");d.ondrop=e=>{e.preventDefault();d.classList.remove("drag");i.files=e.dataTransfer.files;i.dispatchEvent(new Event("change"))}}
function swapBind(){["source","target"].forEach(id=>{const d=document.querySelector(`[data-id="${id}Drop"]`),i=document.getElementById(id),p=document.getElementById(id+"Preview");d.onclick=()=>i.click();i.onchange=()=>{const f=i.files[0];if(f){p.src=URL.createObjectURL(f);p.classList.add("show")}}})}
function showResult(src,title){document.getElementById("result").innerHTML=`<img src="${src}" alt="AI result"><a class="primary download" href="${src}" download="zane-ai-result.png">Download Hasil</a>`;saveHistory(src,title)}
function saveHistory(src,title){const arr=JSON.parse(localStorage.getItem("zaneHistory")||"[]");arr.unshift({src,title,at:Date.now()});localStorage.setItem("zaneHistory",JSON.stringify(arr.slice(0,8)));renderHistory()}
function renderHistory(){const arr=JSON.parse(localStorage.getItem("zaneHistory")||"[]");historyEl.innerHTML=arr.length?arr.map((x,i)=>`<div class="historyItem" data-i="${i}"><img src="${x.src}"><div>${esc(x.title)} • ${new Date(x.at).toLocaleDateString("id-ID")}</div></div>`).join(""):`<div class="empty">Belum ada hasil. Buat gambar pertamamu ✦</div>`}
function esc(s){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
document.querySelectorAll(".nav").forEach(n=>n.onclick=()=>{state.tool=n.dataset.tool;render()});
document.getElementById("clearHistory").onclick=()=>{localStorage.removeItem("zaneHistory");renderHistory();toast("History dihapus")};
document.getElementById("about").onclick=()=>document.getElementById("aboutModal").classList.add("show");
document.getElementById("aboutClose").onclick=()=>document.getElementById("aboutModal").classList.remove("show");
document.addEventListener("paste",e=>{const f=[...(e.clipboardData?.files||[])][0];if(f&&f.type.startsWith("image/")&&document.getElementById("file")){const dt=new DataTransfer();dt.items.add(f);document.getElementById("file").files=dt.files;document.getElementById("file").dispatchEvent(new Event("change"));toast("Foto dari clipboard dimuat.")}});
render();renderHistory();
