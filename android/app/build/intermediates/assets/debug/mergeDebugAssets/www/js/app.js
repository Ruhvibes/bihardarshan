/* Bihar Darshan — app logic. Merges place data files, renders UI, drives 3D. */
(function(){
'use strict';

var LANG = localStorage.getItem('bd_lang') || 'hi';
var FAVS = {};
try { FAVS = JSON.parse(localStorage.getItem('bd_fav')||'{}'); } catch(e){ FAVS={}; }
var favOnly = false;
var currentPlace = null;

var T = {
  hi: {
    brandSub:'इतिहास • संस्कृति • धरोहर', searchPh:'खोजें…  /  Search…',
    heroTag:'जहाँ इतिहास साँस लेता है — धरोहरों की 3D यात्रा',
    heroBtn:'यात्रा शुरू करें ↓', videos:'🎬 झलकियाँ',
    places:'📍 धरोहर स्थल', back:'वापस', t3d:'3D दृश्य', story:'कथा',
    facts:'तथ्य', gallery:'गैलरी', night:'रात्रि', day:'दिवस', rot:'घुमाव',
    glHint:'उँगली से घुमाएँ • चुटकी से ज़ूम करें',
    noResult:'कोई स्थान नहीं मिला।', noFav:'अभी कोई पसंदीदा नहीं — ♡ दबाकर जोड़ें।',
    foot:'बिहार दर्शन • Hasnain Khan द्वारा निर्मित',
    updBanner:'↑ नया अपडेट आया है! टैप करें',
    vids:{hero:'बिहार — एक झलक',chhath:'छठ पूजा',nalanda:'नालंदा',bodhgaya:'बोधगया',kakolat:'ककोलत',valmiki:'वाल्मीकि',rajgir:'राजगीर',vaishali:'वैशाली',patna:'पटना',sasaram:'सासाराम',sonepur:'सोनपुर मेला',pawapuri:'पावापुरी'}
  },
  en: {
    brandSub:'History • Culture • Heritage', searchPh:'Search…  /  खोजें…',
    heroTag:'Where history breathes — a 3D journey through heritage',
    heroBtn:'Start Journey ↓', videos:'🎬 Glimpses',
    places:'📍 Heritage Places', back:'Back', t3d:'3D View', story:'Story',
    facts:'Facts', gallery:'Gallery', night:'Night', day:'Day', rot:'Rotate',
    glHint:'Drag to rotate • pinch to zoom',
    noResult:'No places found.', noFav:'No favourites yet — tap ♡ to add.',
    foot:'Bihar Darshan • Built by Hasnain Khan',
    updBanner:'↑ New update available! Tap here',
    vids:{hero:'Bihar — a glimpse',chhath:'Chhath Puja',nalanda:'Nalanda',bodhgaya:'Bodh Gaya',kakolat:'Kakolat',valmiki:'Valmiki',rajgir:'Rajgir',vaishali:'Vaishali',patna:'Patna',sasaram:'Sasaram',sonepur:'Sonepur Fair',pawapuri:'Pawapuri'}
  }
};

function t(k){ return T[LANG][k]; }
function P(p, f){ return LANG==='hi' ? p[f+'Hi'] : p[f+'En']; }

function getPlaces(){
  // CDN: cached remote content overrides bundled (nayi jagah bina APK update ke!)
  try {
    var cached = localStorage.getItem('bd_cdn_places');
    var cv = parseInt(localStorage.getItem('bd_cdn_v')||'0', 10);
    if (cached && cv >= BD_CDN_V) {
      var parsed = JSON.parse(cached);
      if (parsed && parsed.length) return parsed;
    }
  } catch(e){}
  var list = (window.BD_PLACES||[]).slice();
  (window.BD_PLACES_ISLAMIC||[]).forEach(function(p){
    var i = list.findIndex(function(q){ return q.id===p.id; });
    if(i>=0) list[i]=p; else list.push(p);
  });
  (window.BD_PLACES_EXTRA||[]).forEach(function(p){
    var i = list.findIndex(function(q){ return q.id===p.id; });
    if(i>=0) list[i]=p; else list.push(p);
  });
  (window.BD_PLACES_RAJGIR||[]).forEach(function(p){
    var i = list.findIndex(function(q){ return q.id===p.id; });
    if(i>=0) list[i]=p; else list.push(p);
  });
  return list;
}

function $(id){ return document.getElementById(id); }

function applyLang(){
  document.documentElement.lang = LANG;
  $('brandName').textContent = LANG==='hi' ? 'बिहार दर्शन' : 'Bihar Darshan';
  $('brandSub').textContent = t('brandSub');
  $('searchInput').placeholder = t('searchPh');
  $('heroTitle').textContent = LANG==='hi' ? 'बिहार दर्शन' : 'Bihar Darshan';
  $('heroTag').textContent = t('heroTag');
  $('heroExplore').textContent = t('heroBtn');
  $('videoTitle').textContent = t('videos');
  $('placesTitle').textContent = t('places') + ' (' + getPlaces().length + ')';
  $('backTxt').textContent = t('back');
  $('footText').textContent = t('foot');
  $('langBtn').textContent = LANG==='hi' ? 'EN' : 'हिं';
  document.querySelectorAll('#tabs [data-i18n]').forEach(function(el){
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  $('dnTxt').textContent = nightMode ? t('day') : t('night');
  $('rotTxt').textContent = t('rot');
  $('glHint').textContent = t('glHint');
  renderVideos(); renderCards();
  if(currentPlace) renderDetailText();
}

function renderVideos(){
  var vids = [
    ['videos/hero-montage.mp4','hero','img/bodhgaya-1.jpg'],
    ['videos/chhath.mp4','chhath','img/chhath-1.jpg'],
    ['videos/nalanda.mp4','nalanda','img/nalanda-1.jpg'],
    ['videos/bodhgaya.mp4','bodhgaya','img/bodhgaya-2.jpg'],
    ['videos/kakolat.mp4','kakolat','img/kakolat-1.jpg'],
    ['videos/valmiki.mp4','valmiki','img/valmiki-1.jpg'],
    ['videos/rajgir.mp4','rajgir','img/rajgir-1.jpg'],
    ['videos/vaishali.mp4','vaishali','img/vaishali-1.jpg'],
    ['videos/patna.mp4','patna','img/patna-1.jpg'],
    ['videos/sasaram.mp4','sasaram','img/sasaram-1.jpg'],
    ['videos/sonepur.mp4','sonepur','img/sonepur-1.jpg'],
    ['videos/pawapuri.mp4','pawapuri','img/pawapuri-1.jpg']
  ];
  $('videoRow').innerHTML = vids.map(function(v){
    return '<div class="vid-card"><video src="'+v[0]+'" poster="'+v[2]+'" preload="metadata" playsinline muted loop></video><p>'+T[LANG].vids[v[1]]+'</p></div>';
  }).join('');
  $('videoRow').querySelectorAll('video').forEach(function(v){
    v.addEventListener('click', function(){
      if(v.paused){ $('videoRow').querySelectorAll('video').forEach(function(o){o.pause();}); v.play(); }
      else v.pause();
    });
  });
}

function cardHTML(p){
  var fav = FAVS[p.id] ? ' on' : '';
  return '<div class="card" data-id="'+p.id+'">'+
    '<img loading="lazy" src="'+p.img[0]+'" alt="">'+
    '<button class="fav'+fav+'" data-fav="'+p.id+'">♡</button>'+
    '<div class="c-body"><h3>'+P(p,'name')+'</h3><p>'+P(p,'tagline')+'</p></div></div>';
}

function renderCards(){
  var q = ($('searchInput').value||'').trim().toLowerCase();
  var list = getPlaces().filter(function(p){
    if(favOnly && !FAVS[p.id]) return false;
    if(!q) return true;
    return (p.nameHi+' '+p.nameEn+' '+p.taglineHi+' '+p.taglineEn).toLowerCase().indexOf(q)>=0;
  });
  $('cards').innerHTML = list.length ? list.map(cardHTML).join('')
    : '<div class="empty">'+(favOnly?t('noFav'):t('noResult'))+'</div>';
  $('cards').querySelectorAll('.card').forEach(function(c){
    c.addEventListener('click', function(e){
      if(e.target.hasAttribute('data-fav')) return;
      openPlace(c.getAttribute('data-id'));
    });
  });
  $('cards').querySelectorAll('[data-fav]').forEach(function(b){
    b.addEventListener('click', function(e){
      e.stopPropagation();
      var id = b.getAttribute('data-fav');
      if(FAVS[id]) delete FAVS[id]; else FAVS[id]=1;
      localStorage.setItem('bd_fav', JSON.stringify(FAVS));
      renderCards();
    });
  });
}

function openPlace(id){
  var p = getPlaces().find(function(x){ return x.id===id; });
  if(!p) return;
  currentPlace = p;
  $('view-home').hidden = true;
  $('view-detail').hidden = false;
  window.scrollTo(0,0);
  $('dImg').src = p.img[0];
  renderDetailText();
  updateDetailFav();
  switchTab('t3d');
}

function renderDetailText(){
  var p = currentPlace; if(!p) return;
  $('dName').textContent = P(p,'name');
  $('dTag').textContent = P(p,'tagline');
  $('storyBody').textContent = P(p,'story');
  $('factsBody').innerHTML = P(p,'facts').map(function(f){ return '<li>'+f+'</li>'; }).join('');
  $('galBody').innerHTML = p.img.map(function(s){ return '<img loading="lazy" src="'+s+'" alt="">'; }).join('');
  $('galBody').querySelectorAll('img').forEach(function(im){
    im.addEventListener('click', function(){
      var lb = document.createElement('div'); lb.id='lightbox';
      lb.innerHTML = '<img src="'+im.src+'">';
      lb.addEventListener('click', function(){ lb.remove(); });
      document.body.appendChild(lb);
    });
  });
}

function updateDetailFav(){
  var on = currentPlace && FAVS[currentPlace.id];
  $('detailFav').textContent = on ? '♥' : '♡';
  $('detailFav').classList.toggle('on', !!on);
}

var nightMode = false, autoRot = true, bd3d = null;

function switchTab(name){
  document.querySelectorAll('#tabs button').forEach(function(b){
    b.classList.toggle('on', b.getAttribute('data-tab')===name);
  });
  ['t3d','story','facts','gallery'].forEach(function(n){
    $('pane-'+n).hidden = (n!==name);
  });
  if(name==='t3d' && currentPlace && window.BD3D){
    setTimeout(function(){
      bd3d = window.BD3D.show($('gl'), currentPlace.scene, {night:nightMode, rotate:autoRot});
    }, 60);
  } else if(window.BD3D){
    window.BD3D.stop();
  }
}


var APP_VC = 4; // internal versionCode — bump on each release
var BD_CDN_V = 1; // bundled content version — bump when places.json changes
var CDN_BASE = 'https://cdn.jsdelivr.net/gh/Ruhvibes/bihardarshan@main/cdn/';
function checkContent(){
  // CDN content update: nayi jagah/kahani bina APK ke!
  try {
    var last = parseInt(localStorage.getItem('bd_cdn_check')||'0', 10);
    if (Date.now() - last < 86400000) return; // once/day
    localStorage.setItem('bd_cdn_check', String(Date.now()));
  } catch(e){}
  fetch(CDN_BASE + 'content-version.json?t=' + Date.now(), {cache:'no-store'})
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){
      if (!j || !j.v || j.v <= BD_CDN_V) return;
      var cv = 0;
      try { cv = parseInt(localStorage.getItem('bd_cdn_v')||'0', 10); } catch(e){}
      if (j.v <= cv) return; // already cached
      return fetch(CDN_BASE + 'places.json?t=' + Date.now(), {cache:'no-store'})
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(places){
          if (!places || !places.length) return;
          try {
            localStorage.setItem('bd_cdn_places', JSON.stringify(places));
            localStorage.setItem('bd_cdn_v', String(j.v));
            toast(LANG==='hi' ? '🎉 नया कंटेंट आ गया! ऐप दोबारा खोलें' : '🎉 New content arrived! Reopen app');
          } catch(e){}
        });
    })
    .catch(function(){});
}

function checkUpdate(){
  try {
    var last = parseInt(localStorage.getItem('bd_upd_check')||'0', 10);
    if (Date.now() - last < 86400000) return; // once/day
    localStorage.setItem('bd_upd_check', String(Date.now()));
  } catch(e){}
  fetch('https://raw.githubusercontent.com/Ruhvibes/bihardarshan/main/version.json?t='+Date.now(), {cache:'no-store'})
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){
      if (!j || !j.versionCode || j.versionCode <= APP_VC || !j.apkUrl) return;
      var bar = document.createElement('div');
      bar.id = 'upd-bar';
      bar.textContent = t('updBanner');
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#ff6b35;color:#fff;text-align:center;padding:12px;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)';
      bar.addEventListener('click', function(){
        if (window.Android && typeof window.Android.downloadApk === 'function') {
          try { window.Android.downloadApk(j.apkUrl); } catch(e){ window.open(j.apkUrl, '_blank'); }
        } else { window.open(j.apkUrl, '_blank'); }
      });
      document.body.appendChild(bar);
    })
    .catch(function(){});
}

function init(){
  $('langBtn').addEventListener('click', function(){
    LANG = LANG==='hi' ? 'en' : 'hi';
    localStorage.setItem('bd_lang', LANG);
    applyLang();
  });
  $('searchInput').addEventListener('input', renderCards);
  $('favFilterBtn').addEventListener('click', function(){
    favOnly = !favOnly;
    $('favFilterBtn').classList.toggle('active', favOnly);
    renderCards();
  });
  $('heroExplore').addEventListener('click', function(){
    $('cardsSection').scrollIntoView({behavior:'smooth'});
  });
  $('backBtn').addEventListener('click', function(){
    if(window.BD3D) window.BD3D.stop();
    $('view-detail').hidden = true;
    $('view-home').hidden = false;
    currentPlace = null;
  });
  $('detailFav').addEventListener('click', function(){
    if(!currentPlace) return;
    var id = currentPlace.id;
    if(FAVS[id]) delete FAVS[id]; else FAVS[id]=1;
    localStorage.setItem('bd_fav', JSON.stringify(FAVS));
    updateDetailFav();
  });
  document.querySelectorAll('#tabs button').forEach(function(b){
    b.addEventListener('click', function(){ switchTab(b.getAttribute('data-tab')); });
  });
  $('dayNightBtn').addEventListener('click', function(){
    nightMode = !nightMode;
    $('dnTxt').textContent = nightMode ? t('day') : t('night');
    $('dayNightBtn').classList.toggle('on', nightMode);
    if(bd3d && bd3d.setNight) bd3d.setNight(nightMode);
  });
  $('rotBtn').addEventListener('click', function(){
    autoRot = !autoRot;
    $('rotBtn').classList.toggle('on', autoRot);
    if(bd3d && bd3d.setRotate) bd3d.setRotate(autoRot);
  });
  // video error fallback: hide broken sources quietly
  document.querySelectorAll('video').forEach(function(v){
    v.addEventListener('error', function(){ v.style.display='none'; }, true);
  });
  applyLang();
  checkUpdate();
  checkContent();
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
