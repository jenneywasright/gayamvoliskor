(function(){
'use strict';
var KEY='vb_scoreboard_v1', app=document.getElementById('app'), modalEl=document.getElementById('modal');
var db=load(), modal=null;

function load(){try{var d=JSON.parse(localStorage.getItem(KEY));return d&&d.matches?d:{matches:[]}}catch(e){return{matches:[]}}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function other(t){return t==='A'?'B':'A'}
function getM(id){return db.matches.filter(function(m){return m.id===id})[0]}
function curSet(m){return m.set||1}
function score(m,n){n=n||curSet(m);var a=0,b=0;m.events.forEach(function(e){if((e.set||1)===n)e.team==='A'?a++:b++});return{A:a,B:b}}
function setsWon(m){var w={A:0,B:0},last=m.status==='live'?curSet(m)-1:curSet(m);
  for(var i=1;i<=last;i++){var x=score(m,i);if(x.A>x.B)w.A++;else if(x.B>x.A)w.B++}return w}
function ball(c){return '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="'+c+'"/><g fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"><circle cx="24" cy="24" r="15"/><path d="M24 9c-6 8-6 22 0 30M24 9c8 4 14 12 13 20M9 24c8-2 18 0 26 8"/></g></svg>'}
function pname(m,t,id){if(id==null)return'Tidak diketahui';var p=(t==='A'?m.pA:m.pB).filter(function(x){return x.id===id})[0];return p?p.name:id}
function fmtTime(ts){var d=new Date(ts);return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
function ago(ts){var s=Math.floor((Date.now()-ts)/1000);if(s<60)return'baru saja';if(s<3600)return Math.floor(s/60)+' menit lalu';return fmtTime(ts)}
function parsePlayers(txt,t){
  return txt.split(',').map(function(s){return s.trim()}).filter(Boolean).map(function(s,i){
    var mt=s.match(/^([A-Za-z]+\d+)\s*(.*)$/);
    if(mt)return{id:mt[1].toUpperCase(),name:mt[2]||mt[1].toUpperCase()};
    return{id:t+(i+1),name:s};
  });
}
/* statistik dihitung dari events */
function stats(m){
  var map={};
  function get(t,id){var k=t+'|'+id;return map[k]=map[k]||{team:t,id:id,attack:0,error:0}}
  m.events.forEach(function(e){
    if(e.playerId==null)return;
    if(e.type==='attack')get(e.team,e.playerId).attack++;
    else get(other(e.team),e.playerId).error++;
  });
  var all=Object.keys(map).map(function(k){return map[k]});
  return{
    top:all.filter(function(p){return p.attack>0}).sort(function(a,b){return b.attack-a.attack}).slice(0,3),
    err:all.filter(function(p){return p.error>0}).sort(function(a,b){return b.error-a.error}).slice(0,3)
  };
}
function playerLine(m,p,val){
  return '<div class="line"><div><b class="n '+p.team+'">'+esc(p.id)+'</b>'+esc(pname(m,p.team,p.id))+
    '<div class="mut">'+esc(p.team==='A'?m.teamA:m.teamB)+'</div></div><div class="pt">'+val+'<div class="mut">point</div></div></div>';
}

/* ---------- Views ---------- */
function viewHome(){
  var ms=db.matches.slice().sort(function(a,b){return b.createdAt-a.createdAt});
  var h='<div class="wrap"><div class="top"><div class="row">'+ball('#1e70ff').replace('<svg','<svg width="44" height="44"')+
    '<div><h1>Volleyball Scoreboard</h1><div class="mut">Catat skor & statistik pemain, tersimpan offline di perangkat ini.</div></div></div>'+
    '<a class="btn" href="#/setup" style="text-decoration:none">+ Buat Pertandingan</a></div>'+
    '<h2>Riwayat Pertandingan</h2><div class="list">';
  if(!ms.length)h+='<div class="card empty">Belum ada pertandingan. Buat yang pertama!</div>';
  ms.forEach(function(m){
    var s=score(m),live=m.status==='live';
    h+='<div class="card item" data-open="'+m.id+'"><div><b>'+esc(m.name)+'</b> <span class="badge '+(live?'live':'fin')+'">'+(live?'LIVE':'FINISHED')+'</span>'+
      '<div class="mut">'+esc(m.teamA)+' vs '+esc(m.teamB)+' • '+new Date(m.createdAt).toLocaleDateString('id-ID')+'</div></div>'+
      '<div class="row"><span class="sc">'+s.A+' - '+s.B+'</span><button class="btn ghost" data-del="'+m.id+'">Hapus</button></div></div>';
  });
  app.innerHTML=h+'</div></div>';
}
function viewSetup(){
  app.innerHTML='<div class="wrap"><div class="top"><a href="#/" class="btn ghost" style="text-decoration:none">← Kembali</a><h1>Buat Pertandingan</h1><span></span></div>'+
  '<form class="card" id="setup"><label>Nama Pertandingan<input name="name" required autocomplete="off" value="ES TEH-AN"></label>'+
  '<div class="two"><label>Nama Tim A<input name="ta" required autocomplete="off" value="LOR"></label><label>Nama Tim B<input name="tb" required autocomplete="off" value="KIDUL"></label></div>'+
  '<div class="two"><label>Pemain Tim A (pisahkan koma)<textarea name="pa" rows="4">Dwi, Dian, Rudi, Rafi, Ajik, Mendhot</textarea></label>'+
  '<label>Pemain Tim B (pisahkan koma)<textarea name="pb" rows="4">Didin, Alim, Dika, Nerpok, Supri, Tonggok</textarea></label></div>'+
  '<div class="mut">Format "A1 Nama" otomatis jadi kode A1 dengan nama pemain tersebut. Tanpa kode, pemain diberi kode otomatis.</div>'+
  '<button class="btn" type="submit">Simpan & Mulai</button></form></div>';
}
function viewMatch(m){
  var s=score(m),sw=setsWon(m),st=stats(m),live=m.status==='live',ev=m.events;
  var h='<div class="wrap"><div class="top"><a href="#/" class="btn ghost" style="text-decoration:none">← Riwayat</a>'+
    '<div class="row"><button class="btn ghost" data-undo '+(ev.length?'':'disabled')+'>↶ Undo Last Point</button>'+
    '<button class="btn ghost" data-nextset '+(live&&s.A+s.B>0?'':'disabled')+'>Set Berikutnya ▶</button>'+
    '<button class="btn '+(live?'red':'')+'" data-toggle>'+(live?'Selesaikan':'Lanjutkan')+'</button></div></div>'+
    '<div class="card head"><div class="team">'+ball('#1e70ff')+'<div>'+esc(m.teamA)+'<small>Team A</small></div></div>'+
    '<div class="mid"><div class="mut">'+esc(m.name)+'</div><div class="mut">Set '+curSet(m)+'</div><b>'+sw.A+' - '+sw.B+'</b></div>'+
    '<div class="team r"><div>'+esc(m.teamB)+'<small>Team B</small></div>'+ball('#ff3b5c')+'</div></div>'+
    '<div class="scores"><button class="score a" data-add="A" '+(live?'':'disabled')+'>'+s.A+'</button>'+
    '<button class="score b" data-add="B" '+(live?'':'disabled')+'>'+s.B+'</button></div>'+
    '<div class="hint mut">'+(live?'Ketuk blok skor untuk menambah poin':'Pertandingan selesai — tekan Lanjutkan untuk mencatat lagi')+'</div><div class="stats">';
  h+='<div class="card stat"><h2><span class="ic s">★</span>Top Skor</h2>'+
    (st.top.length?st.top.map(function(p){return playerLine(m,p,p.attack)}).join(''):'<div class="empty">Belum ada poin Attack</div>')+'</div>';
  h+='<div class="card stat"><h2><span class="ic e">🛡</span>Top Error</h2>'+
    (st.err.length?st.err.map(function(p){return playerLine(m,p,p.error)}).join(''):'<div class="empty">Belum ada error</div>')+'</div>';
  var run={},tl=ev.map(function(e){var k=e.set||1;run[k]=run[k]||{A:0,B:0};run[k][e.team]++;return{e:e,a:run[k].A,b:run[k].B}}).slice(-4).reverse();
  h+='<div class="card stat"><h2><span class="ic h">✨</span>Sorotan</h2>'+
    (tl.length?tl.map(function(x){
      var e=x.e,pt=e.type==='attack'?e.team:other(e.team);
      return '<div class="line"><div><b class="n '+e.team+'">'+x.a+'-'+x.b+'</b>'+(e.type==='attack'?'Attack':'Error Lawan')+' • '+esc(pname(m,pt,e.playerId))+
        '<div class="mut">'+esc(e.team==='A'?m.teamA:m.teamB)+'</div></div><div class="mut">'+fmtTime(e.timestamp)+'<br>'+ago(e.timestamp)+'</div></div>';
    }).join(''):'<div class="empty">Belum ada event</div>')+'</div></div></div>';
  app.innerHTML=h;
}
function renderModal(){
  if(!modal){modalEl.hidden=true;modalEl.innerHTML='';return}
  var m=getM(modal.mid),t=modal.team,c=t==='A'?'var(--a)':'var(--b)';
  var pt=modal.src==='attack'?t:other(t), list=pt==='A'?m.pA:m.pB;
  var h='<div class="modal" style="--c:'+c+'"><div class="row" style="justify-content:space-between"><h2>Tambah Poin untuk '+esc(t==='A'?m.teamA:m.teamB)+'</h2><button class="btn ghost" data-close>✕</button></div>'+
    '<b>Bagaimana poin didapat?</b><div class="src"><button data-src="attack" class="'+(modal.src==='attack'?'on':'')+'">⚡ Pukulan / Attack<div class="mut">Serangan berhasil</div></button>'+
    '<button data-src="error" class="'+(modal.src==='error'?'on':'')+'">🛡 Error Lawan<div class="mut">Lawan melakukan kesalahan</div></button></div>'+
    '<b>Pilih Pemain '+esc(pt==='A'?m.teamA:m.teamB)+'</b><div class="pl">';
  list.forEach(function(p){h+='<button data-pl="'+esc(p.id)+'" class="'+(modal.pid===p.id?'on':'')+'" title="'+esc(p.name)+'">'+esc(p.id)+(p.name!==p.id?' '+esc(p.name):'')+'</button>'});
  h+='<button data-pl="" class="'+(modal.pid===null?'on':'')+'">Tidak diketahui</button></div>'+
    '<button class="btn" data-confirm>Konfirmasi</button></div>';
  modalEl.innerHTML=h;modalEl.hidden=false;
}

/* ---------- Router ---------- */
function route(){
  modal=null;renderModal();
  var h=location.hash||'#/',p=h.split('/');
  if(p[1]==='setup')return viewSetup();
  if(p[1]==='match'){var m=getM(p[2]);if(m)return viewMatch(m);location.hash='#/';return}
  viewHome();
}
window.addEventListener('hashchange',route);

/* ---------- Events ---------- */
function curMatch(){return getM((location.hash||'').split('/')[2])}
document.addEventListener('submit',function(ev){
  if(ev.target.id!=='setup')return;
  ev.preventDefault();
  var f=ev.target.elements,id='m'+Date.now();
  db.matches.push({id:id,name:f.name.value.trim(),teamA:f.ta.value.trim(),teamB:f.tb.value.trim(),
    pA:parsePlayers(f.pa.value,'A'),pB:parsePlayers(f.pb.value,'B'),events:[],status:'live',createdAt:Date.now()});
  save();location.hash='#/match/'+id;
});
document.addEventListener('click',function(ev){
  var t=ev.target,el;
  if(el=t.closest('[data-del]')){ev.stopPropagation();if(confirm('Hapus pertandingan ini?')){db.matches=db.matches.filter(function(m){return m.id!==el.dataset.del});save();viewHome()}return}
  if(el=t.closest('[data-open]')){location.hash='#/match/'+el.dataset.open;return}
  if(el=t.closest('[data-add]')){var m=curMatch();if(m&&m.status==='live'){modal={mid:m.id,team:el.dataset.add,src:'attack',pid:null};renderModal()}return}
  if(t.closest('[data-close]')||t===modalEl){modal=null;renderModal();return}
  if(el=t.closest('[data-src]')){modal.src=el.dataset.src;modal.pid=null;renderModal();return}
  if(el=t.closest('[data-pl]')){modal.pid=el.dataset.pl===''?null:el.dataset.pl;renderModal();return}
  if(t.closest('[data-confirm]')){
    var mm=getM(modal.mid);
    mm.events.push({scoringTeam:modal.team,team:modal.team,set:curSet(mm),type:modal.src,sourceType:modal.src,playerId:modal.pid,timestamp:Date.now()});
    save();modal=null;renderModal();viewMatch(mm);return
  }
  if(t.closest('[data-undo]')){var u=curMatch();if(u&&u.events.length){var le=u.events.pop();if((le.set||1)<curSet(u))u.set=le.set||1;save();viewMatch(u)}return}
  if(t.closest('[data-nextset]')){var n=curMatch();if(n&&confirm('Selesaikan set '+curSet(n)+' dan mulai set berikutnya?')){n.set=curSet(n)+1;save();viewMatch(n)}return}
  if(t.closest('[data-toggle]')){var g=curMatch();g.status=g.status==='live'?'finished':'live';save();viewMatch(g);return}
});
route();
})();
