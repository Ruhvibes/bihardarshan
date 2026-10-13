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
    vids:{hero:'बिहार — एक झलक',chhath:'छठ पूजा',nalanda:'नालंदा',bodhgaya:'बोधगया',kakolat:'ककोलत',valmiki:'वाल्मीकि'}
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
    vids:{hero:'Bihar — a glimpse',chhath:'Chhath Puja',nalanda:'Nalanda',bodhgaya:'Bodh Gaya',kakolat:'Kakolat',valmiki:'Valmiki'}
  }
};

function t(k){ return T[LANG][k]; }
function P(p, f){ return LANG==='hi' ? p[f+'Hi'] : p[f+'En']; }

function getPlaces(){
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
    ['videos/valmiki.mp4','valmiki','img/valmiki-1.jpg']
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
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
else init();
})();
