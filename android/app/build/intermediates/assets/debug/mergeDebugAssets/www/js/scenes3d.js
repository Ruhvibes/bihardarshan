/* Bihar Darshan — procedural Three.js (r128) scenes. No external assets. */
window.BD3D = (function(){
'use strict';
var raf=null, renderer=null, S=null;

function M(c,o){ return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.88,metalness:.04},o||{})); }
function E(c,i){ return new THREE.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:i==null?1:i,roughness:.6}); }

/* ---------- small builders ---------- */
function sh(m){ m.castShadow=true; m.receiveShadow=true; return m; }
function B(g,w,h,d,x,y,z,c,o){ var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c,o)); m.position.set(x,y,z); g.add(sh(m)); return m; }
function CY(g,rt,rb,h,x,y,z,c,seg,o){ var m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||20),M(c,o)); m.position.set(x,y,z); g.add(sh(m)); return m; }
function DM(g,r,x,y,z,c,o){ var m=new THREE.Mesh(new THREE.SphereGeometry(r,24,14,0,Math.PI*2,0,Math.PI/2),M(c,o)); m.position.set(x,y,z); g.add(sh(m)); return m; }
function CN(g,r,h,x,y,z,c,seg){ var m=new THREE.Mesh(new THREE.ConeGeometry(r,h,seg||20),M(c)); m.position.set(x,y,z); g.add(sh(m)); return m; }
function SP(g,r,x,y,z,c,o){ var m=new THREE.Mesh(new THREE.SphereGeometry(r,18,14),M(c,o)); m.position.set(x,y,z); g.add(sh(m)); return m; }

var BRICK=0x9c4a2a, SAND=0xd9b77c, WHITE=0xf5f1e6, GOLD=0xd9a520, LEAF=0x3e7d3a, TRUNK=0x6b4a2f, WATER=0x2f7fc4;

/* ---------- realism kit: procedural textures, jitter, sky, dust ---------- */
var _texCache={};
function canvasTex(key, painter, size){
  if(_texCache[key]) return _texCache[key];
  size=size||256;
  var cv=document.createElement('canvas'); cv.width=cv.height=size;
  var x=cv.getContext('2d'); painter(x,size);
  var t=new THREE.CanvasTexture(cv);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  if(THREE.sRGBEncoding!==undefined) t.encoding=THREE.sRGBEncoding;
  _texCache[key]=t; return t;
}
function grain(x,s,n,cols,aMax){
  for(var i=0;i<n;i++){
    x.fillStyle=cols[(Math.random()*cols.length)|0];
    x.globalAlpha=Math.random()*aMax;
    var r=1+Math.random()*3;
    x.fillRect(Math.random()*s,Math.random()*s,r,r);
  }
  x.globalAlpha=1;
}
function stoneTex(base, dark){
  return canvasTex('stone'+base+'_'+dark, function(x,s){
    x.fillStyle='#'+base.toString(16).padStart(6,'0'); x.fillRect(0,0,s,s);
    var dc='#'+dark.toString(16).padStart(6,'0');
    for(var i=0;i<26;i++){ x.fillStyle=dc; x.globalAlpha=.12+Math.random()*.2;
      x.beginPath(); x.arc(Math.random()*s,Math.random()*s,8+Math.random()*30,0,7); x.fill(); }
    x.globalAlpha=1;
    grain(x,s,900,[dc,'#000000','#ffffff'],.10);
  });
}
function grassTex(base){
  return canvasTex('grass'+base, function(x,s){
    x.fillStyle='#'+base.toString(16).padStart(6,'0'); x.fillRect(0,0,s,s);
    grain(x,s,2600,['#2e5d28','#4c8a3e','#6a9a4a','#87b35e'],.35);
    for(var i=0;i<40;i++){ x.strokeStyle='rgba(40,80,30,.25)'; x.lineWidth=1;
      var px=Math.random()*s, py=Math.random()*s;
      x.beginPath(); x.moveTo(px,py); x.lineTo(px+Math.random()*4-2,py-3-Math.random()*4); x.stroke(); }
  });
}
function jitter(geo, amt){
  var p=geo.attributes.position;
  for(var i=0;i<p.count;i++){
    p.setXYZ(i, p.getX(i)+(Math.random()-.5)*amt, p.getY(i)+(Math.random()-.5)*amt, p.getZ(i)+(Math.random()-.5)*amt);
  }
  geo.computeVertexNormals();
  return geo;
}
function skyDome(){
  var geo=new THREE.SphereGeometry(220,24,14);
  var mat=new THREE.ShaderMaterial({
    side:THREE.BackSide, depthWrite:false, fog:false,
    uniforms:{ top:{value:new THREE.Color(0x5f9fd4)}, mid:{value:new THREE.Color(0xcfd9e8)}, bot:{value:new THREE.Color(0xf6d9a8)} },
    vertexShader:'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying vec3 vP; uniform vec3 top,mid,bot;'+
      'void main(){ float h=normalize(vP).y;'+
      ' vec3 c=h>0.12? mix(mid,top,smoothstep(0.12,0.75,h)) : mix(bot,mid,smoothstep(-0.08,0.12,h));'+
      ' float sun=pow(max(dot(normalize(vP),normalize(vec3(0.45,0.38,0.32))),0.0),24.0);'+
      ' c+=vec3(1.0,0.75,0.45)*sun*0.55;'+
      ' gl_FragColor=vec4(c,1.0); }'
  });
  return new THREE.Mesh(geo,mat);
}
function dustMotif(){
  return canvasTex('dust', function(x,s){
    var g=x.createRadialGradient(s/2,s/2,1,s/2,s/2,s/2);
    g.addColorStop(0,'rgba(255,240,210,0.85)'); g.addColorStop(1,'rgba(255,240,210,0)');
    x.fillStyle=g; x.fillRect(0,0,s,s);
  },64);
}
function addDust(scene,n){
  n=n||70;
  var pos=new Float32Array(n*3), seed=new Float32Array(n);
  for(var i=0;i<n;i++){ pos[i*3]=(Math.random()-.5)*70; pos[i*3+1]=.5+Math.random()*14; pos[i*3+2]=(Math.random()-.5)*70; seed[i]=Math.random()*10; }
  var bg=new THREE.BufferGeometry(); bg.setAttribute('position',new THREE.BufferAttribute(pos,3));
  var pm=new THREE.PointsMaterial({size:.55,map:dustMotif(),transparent:true,opacity:.5,depthWrite:false,color:0xffe8c0});
  var pts=new THREE.Points(bg,pm); pts.userData.seed=seed; scene.add(pts); return pts;
}

function ground(g,c,r){ c=c||0xb99c68; r=r||60;
  var tex=grassTex(c);
  tex.repeat.set(6,6);
  var m=new THREE.Mesh(new THREE.CircleGeometry(r,48),new THREE.MeshStandardMaterial({map:tex,color:0xffffff,roughness:1,metalness:0}));
  m.rotation.x=-Math.PI/2; m.receiveShadow=true; g.add(m); return m; }
var _leafCols=[0x3e7d3a,0x4a8a3f,0x35702f,0x5a9a44,0x2f6b2a];
function tree(g,x,z,s){ s=s||1; var t=new THREE.Group();
  var trunk=CY(t,.16*s,.3*s,1.7*s,0,.85*s,0,TRUNK); trunk.rotation.z=(Math.random()-.5)*.12;
  var lc=_leafCols[(Math.random()*_leafCols.length)|0];
  var layers=3+((Math.random()*2)|0);
  for(var i=0;i<layers;i++){
    var lr=(1.5-i*.32)*s*(0.9+Math.random()*.25), lh=(1.1-i*.12)*s;
    var ly=(1.9+i*.85)*s;
    var cone=new THREE.Mesh(jitter(new THREE.ConeGeometry(lr,lh,9),.16*s),
      new THREE.MeshStandardMaterial({color:i?lc:0x4a8a3f,roughness:1,flatShading:true}));
    cone.position.set((Math.random()-.5)*.5*s,ly,(Math.random()-.5)*.5*s);
    cone.castShadow=true; t.add(cone);
  }
  t.position.set(x,0,z); t.rotation.y=Math.random()*6.28; g.add(t); }
function stupa(g,x,z,s,c){ s=s||1; c=c||BRICK; var t=new THREE.Group();
  var sm=new THREE.MeshStandardMaterial({map:stoneTex(c,0x5a2a16),roughness:.95,metalness:0});
  function sm_(geo,px,py,pz){ var m=new THREE.Mesh(geo,sm); m.position.set(px,py,pz); m.castShadow=true; m.receiveShadow=true; t.add(m); return m; }
  sm_(new THREE.BoxGeometry(3.4*s,.7*s,3.4*s),0,.35*s,0);
  sm_(new THREE.CylinderGeometry(1.15*s,1.3*s,1.1*s,20),0,1.2*s,0);
  sm_(new THREE.SphereGeometry(1.15*s,24,14,0,Math.PI*2,0,Math.PI/2),0,1.75*s,0);
  /* harmika (square railing box on dome) */
  sm_(new THREE.BoxGeometry(.55*s,.42*s,.55*s),0,2.32*s,0);
  /* yashti mast + chattra umbrella discs */
  var ym=new THREE.Mesh(new THREE.CylinderGeometry(.06*s,.06*s,1.3*s,8),M(GOLD,{roughness:.4,metalness:.5}));
  ym.position.set(0,3.05*s,0); ym.castShadow=true; t.add(ym);
  for(var di=0;di<3;di++){ var dd=new THREE.Mesh(new THREE.CylinderGeometry((.5-di*.11)*s,(.5-di*.11)*s,.07*s,14),M(GOLD,{roughness:.45,metalness:.45}));
    dd.position.set(0,(2.75+di*.32)*s,0); dd.castShadow=true; t.add(dd); }
  /* vedika railing posts around base */
  for(var ri=0;ri<10;ri++){ var a=ri/10*Math.PI*2;
    sm_(new THREE.BoxGeometry(.14*s,.9*s,.14*s),Math.cos(a)*2.35*s,.45*s,Math.sin(a)*2.35*s); }
  var rail=new THREE.Mesh(new THREE.TorusGeometry(2.35*s,.06*s,8,32),sm);
  rail.rotation.x=Math.PI/2; rail.position.y=.9*s; t.add(rail);
  t.position.set(x,0,z); g.add(t); }
function minaret(g,x,z,h,c){ h=h||9; c=c||WHITE; var t=new THREE.Group();
  CY(t,.5,.65,h,0,h/2,0,c,12); CY(t,.8,.8,.35,0,h*.55,0,GOLD,12); CY(t,.8,.8,.35,0,h*.85,0,GOLD,12);
  DM(t,.55,0,h+.1,0,GOLD); t.position.set(x,0,z); g.add(t); }
function domeOn(g,r,x,y,z,c){ DM(g,r,x,y,z,c||GOLD); }
function statue(g,x,z,h,c){ // abstract memorial figure
  var t=new THREE.Group(); c=c||0x6e5a3e;
  B(t,1.6,.5,1.6,0,.25,0,0x8a8a8a); CY(t,.7,.9,h*.55,0,.5+h*.28,0,c,12);
  SP(t,.42,0,.5+h*.55+.55,0,0xd9a077); CN(t,.5,.4,0,.5+h*.55+1.05,0,0xeeeeee,12);
  t.position.set(x,0,z); g.add(t); }

/* ---------- scene builders: each gets ctx {g, anim} ---------- */
var builders = {
nalanda:function(c){ var g=c.g; ground(g,0xc2a06a);
  stupa(g,-6,0,1.5); stupa(g,5,-3,1.1); stupa(g,1,6,0.9);
  B(g,16,3,4,0,1.5,-10,BRICK);
  for(var i=0;i<7;i++){ B(g,1.2,1.8,.2,-6.5+i*2.15,1.1,-7.9,0x2b1a12); }
  B(g,16,.5,4.6,0,3.2,-10,0x7c3a20);
  tree(g,-11,6); tree(g,11,7); tree(g,-12,-6); tree(g,12,-8); tree(g,0,11); },

bodhgaya:function(c){ var g=c.g; ground(g,0xb59a6a);
  var t=new THREE.Group(); var w=3.2;
  for(var i=0;i<5;i++){ B(t,w,w*1.15,w,0,w*.575+i*w*1.12,0,SAND); w*=.82; }
  CY(t,.7,.9,.8,0,5*w+ .4,0,SAND,12); CN(t,.25,1.6,0,5*w+1.6,0,GOLD,10); t.position.set(0,0,-2); g.add(t);
  var tr=new THREE.Group(); CY(tr,.5,.7,4,0,2,0,TRUNK);
  SP(tr,2.6,0,5.4,0,LEAF); SP(tr,1.8,1.8,4.6,0,LEAF); SP(tr,1.8,-1.8,4.6,0,LEAF);
  tr.position.set(7,0,3); g.add(tr);
  for(var j=0;j<8;j++){ var a=j/8*Math.PI*2; B(g,.35,1.1,.35,Math.cos(a)*5.4,.55,3+Math.sin(a)*5.4,0x9a8a72); }
  tree(g,-8,6); tree(g,9,-5); },

rajgir:function(c){ var g=c.g; ground(g,0x9aa864);
  /* Ratnagiri hill + Vishwa Shanti Stupa */
  var hill=new THREE.Mesh(new THREE.ConeGeometry(16,11,24),M(0x4c7a45)); hill.position.set(0,5.5,-4); g.add(hill);
  var st=new THREE.Group(); CY(st,2.2,2.5,1.2,0,.6,0,WHITE); DM(st,2.2,0,1.2,0,WHITE);
  CY(st,.12,.12,2.2,0,3.2,0,GOLD,8); SP(st,.4,0,4.4,0,GOLD); st.position.set(0,11,-4); g.add(st);
  /* ropeway: two lines + moving cars */
  var cars=[];
  [[-1.2,0],[1.2,0]].forEach(function(off){
    var lg=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-11+off[0],.6,9),new THREE.Vector3(off[0],11.6,-4)]);
    g.add(new THREE.Line(lg,new THREE.LineBasicMaterial({color:0x2b2b2b})));
    var car=B(g,1.1,.9,1.4,0,0,0,0xc23b2e); cars.push({m:car,t:Math.random(),off:off[0]});
  });
  c.anim.push(function(dt){ cars.forEach(function(o){ o.t=(o.t+dt*.06)%1;
    o.m.position.set(-11+o.off+(o.off+11)*o.t, .6+11*o.t, 9-13*o.t); }); });
  /* Griddhakuta peak + shrine */
  var gp=new THREE.Mesh(new THREE.ConeGeometry(7,8,10),M(0x5a6e52,{flatShading:true})); gp.position.set(15,4,-10); g.add(gp);
  B(g,2,1.4,2,15,8.6,-10,SAND); CN(g,1.6,1.4,15,10,-10,0xb08d5a,4);
  /* Saptaparni caves: rock cluster with dark mouths */
  var rk=new THREE.Group();
  [[0,0],[2.6,.6],[-2.4,.4],[1.2,2.2]].forEach(function(p,i){
    var d=new THREE.Mesh(new THREE.DodecahedronGeometry(1.6,0),M(0x7a7268,{flatShading:true})); d.position.set(p[0],1.2,p[1]); rk.add(d); });
  B(rk,1.1,1.4,.3,-1.2,1,2.05,0x14100c); B(rk,1.1,1.4,.3,1.4,1,2.1,0x14100c);
  rk.position.set(-14,0,-9); g.add(rk);
  /* Bimbisara's jail: stone cell block with barred window */
  var jl=new THREE.Group(); B(jl,5,2.6,4,0,1.3,0,0x9a8a72); B(jl,5.6,.5,4.6,0,2.85,0,0x7a6a58);
  for(var bi=0;bi<4;bi++) B(jl,.22,1.2,.2,-1.2+bi*.8,1.4,2.02,0x2b2118);
  jl.position.set(-9,0,8); g.add(jl);
  /* Jarasandh akhada: sand arena ring */
  var ar=new THREE.Mesh(new THREE.CircleGeometry(3.4,24),M(0xd9b77c)); ar.rotation.x=-Math.PI/2; ar.position.set(10,.04,8); g.add(ar);
  var ring=new THREE.Mesh(new THREE.TorusGeometry(3.4,.22,8,28),M(0x8a3a2e)); ring.rotation.x=Math.PI/2; ring.position.set(10,.25,8); g.add(ring);
  /* Brahmakund: stepped hot-spring tank with steam */
  CY(g,2.6,2.6,.6, -3,.3,11,0x9a8a72,4); CY(g,2,2,.6,-3,.9,11,0xa89880,4);
  var hw=new THREE.Mesh(new THREE.CircleGeometry(1.8,18),M(0x6fb7d6,{roughness:.25})); hw.rotation.x=-Math.PI/2; hw.position.set(-3,1.25,11); g.add(hw);
  var stm=[]; for(var si=0;si<6;si++){ var sm=SP(g,.28,-3+Math.random()*2-1,1.4,11+Math.random()*2-1,0xffffff);
    sm.material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35}); stm.push({m:sm,p:Math.random()*3}); }
  c.anim.push(function(){ var t=performance.now()*.001; stm.forEach(function(o){ var k=(t*.6+o.p)%1.6; o.m.position.y=1.4+k; o.m.material.opacity=.35*(1-k/1.6); }); });
  /* Maniyar Math: small shrine */
  var mn=new THREE.Group(); B(mn,2.6,2,2.6,0,1,0,0xc9a86a); CN(mn,1.9,1.8,0,2.9,0,0xb08d5a,4); mn.position.set(6,0,-12); g.add(mn);
  tree(g,-12,4); tree(g,12,6); tree(g,-9,-10); tree(g,10,-11); tree(g,-16,2); tree(g,17,2); },

vaishali:function(c){ var g=c.g; ground(g,0xa8bf7a);
  CY(g,.9,1.1,11,0,5.5,0,0xd8c49a,18); B(g,2.2,.8,2.2,0,11.4,0,0xd8c49a);
  var lion=new THREE.Group();
  B(lion,1.6,.9,1.0,0,.45,0,0xd8c49a); SP(lion,.55,.9,.9,0,0xd8c49a); lion.position.set(0,11.8,0); g.add(lion);
  var st=new THREE.Group(); CY(st,2.6,2.9,1.4,0,.7,0,BRICK); DM(st,2.6,0,1.4,0,BRICK); st.position.set(8,0,-4); g.add(st);
  tree(g,-8,5); tree(g,10,6); tree(g,-10,-6); },

patna:function(c){ var g=c.g; ground(g,0xbfae86);
  var gh=new THREE.Mesh(new THREE.SphereGeometry(6,28,18,0,Math.PI*2,0,Math.PI/2),M(0xc9a86a)); gh.position.set(-7,0,0); g.add(gh);
  CY(g,6.2,6.2,1.2,-7,.6,0,0xb08d5a,28);
  var gur=new THREE.Group(); B(gur,7,3.4,5,0,1.7,0,WHITE);
  domeOn(gur,1.7,0,3.4,0,WHITE); domeOn(gur,1.1,-2.2,3.4,0,GOLD); domeOn(gur,1.1,2.2,3.4,0,GOLD);
  CY(gur,.08,.08,5,2.8,4.5,1.8,0x8a6f3a,8); gur.position.set(8,0,2); g.add(gur);
  tree(g,0,9); tree(g,-13,-6); },

sonepur:function(c){ var g=c.g; ground(g,0xd0b078);
  for(var i=0;i<4;i++){ var x=-9+i*6; CN(g,2.6,3.2,x,1.6,-6,[0xc23b2e,0xe8a93d,0x2f6fb2,0x3e7d3a][i],12); CY(g,.08,.08,4.4,x,2.2,-6,TRUNK,8); }
  var fw=new THREE.Group(); var ring=new THREE.Mesh(new THREE.TorusGeometry(4,.18,10,32),M(0xc23b2e)); fw.add(ring);
  for(var s=0;s<8;s++){ var sp=CY(fw,.07,.07,8,0,0,0,0xf5f1e6,6); sp.rotation.z=s*Math.PI/8; }
  B(fw,.5,6,.5,0,-5,0,0x6b4a2f); B(fw,.5,6,.5,0,-5,0,0x6b4a2f).rotation.z=.5;
  fw.position.set(9,7,-2); g.add(fw); c.anim.push(function(dt){ fw.rotation.z+=dt*.25; });
  for(var k=0;k<10;k++){ CY(g,.28,.34,1.1,-12+Math.random()*24,0.55,4+Math.random()*5,[0xc23b2e,0x2f6fb2,0xe8a93d,0x3e7d3a][k%4],8); }
  tree(g,-14,8); tree(g,14,9); },

vikramshila:function(c){ var g=c.g; ground(g,0xbaa26e);
  B(g,10,1.2,10,0,.6,0,BRICK); stupa(g,0,0,1.6,BRICK);
  stupa(g,-8,-8,.8); stupa(g,8,-8,.8); stupa(g,-8,8,.8); stupa(g,8,8,.8);
  B(g,14,2.4,3,0,1.2,12,BRICK); for(var i=0;i<6;i++) B(g,1,1.5,.2,-6+i*2.4,1,10.4,0x2b1a12);
  tree(g,-13,4); tree(g,13,5); },

pawapuri:function(c){ var g=c.g; ground(g,0x9fbf8a);
  var pond=new THREE.Mesh(new THREE.CircleGeometry(11,36),M(WATER,{roughness:.35})); pond.rotation.x=-Math.PI/2; pond.position.y=.02; g.add(pond);
  for(var i=0;i<14;i++){ var a=i/14*Math.PI*2; SP(g,.35,Math.cos(a)*8.5,.15,Math.sin(a)*8.5,0xe88aa0); }
  var tp=new THREE.Group(); B(tp,6,.8,6,0,.4,0,WHITE); B(tp,4.4,2.6,4.4,0,2.1,0,WHITE);
  domeOn(tp,1.9,0,3.4,0,WHITE); domeOn(tp,.8,-1.6,3.4,0,GOLD); domeOn(tp,.8,1.6,3.4,0,GOLD);
  CN(tp,.5,2.2,0,5.6,0,GOLD,10); B(tp,1.6,2.2,.3,0,1.4,2.3,0x3a2c1c);
  tp.position.set(0,0,0); g.add(tp);
  B(g,2.2,.3,12,0,.15,12,SAND); for(var r=0;r<5;r++){ B(g,.18,.7,12,-1+r*.5,.35,12,0x8a7358); }
  tree(g,-14,8); tree(g,14,-8); },

kesaria:function(c){ var g=c.g; ground(g,0xa4bd7f);
  var w=11; for(var i=0;i<6;i++){ CY(g,w,w+.6,1.7,0,.85+i*1.7,0,BRICK,24); w-=1.55; }
  DM(g,2.2,0,6*1.7,0,BRICK); CY(g,.08,.08,2,0,6*1.7+1.4,0,GOLD,8);
  tree(g,-12,6); tree(g,12,-7); tree(g,-9,-9); },

sasaram:function(c){ var g=c.g;
  var tank=new THREE.Mesh(new THREE.PlaneGeometry(60,60),M(WATER,{roughness:.3})); tank.rotation.x=-Math.PI/2; tank.position.y=0; g.add(tank);
  var tb=new THREE.Group(); B(tb,9,1,9,0,.5,0,0xb08d5a); B(tb,7.4,3.4,7.4,0,2.7,0,0xc9a86a);
  var oct=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.4,2.4,8),M(0xc9a86a)); oct.position.y=5.4; tb.add(oct);
  var dm=new THREE.Mesh(new THREE.SphereGeometry(3.6,24,16,0,Math.PI*2,0,Math.PI/2),M(0x8f6f4a)); dm.position.y=6.6; tb.add(dm);
  CN(tb,.3,2,0,10.6,0,GOLD,8);
  [[-3.4,-3.4],[3.4,-3.4],[-3.4,3.4],[3.4,3.4]].forEach(function(p){
    CY(tb,.22,.22,1.6,p[0],5.2,p[1],0xc9a86a,8); DM(tb,.8,p[0],6,p[1],0xc9a86a); });
  tb.position.set(0,0,0); g.add(tb);
  B(g,2.6,.4,16,0,.2,12,0xb08d5a);
  c.anim.push(function(dt){ tank.position.y = Math.sin(performance.now()*.001)*.05; }); },

madhubani:function(c){ var g=c.g; ground(g,0xd8c9a8);
  function artCanvas(){ var cv=document.createElement('canvas'); cv.width=cv.height=256; var x=cv.getContext('2d');
    x.fillStyle='#f7ead0'; x.fillRect(0,0,256,256); x.strokeStyle='#202020'; x.lineWidth=6; x.strokeRect(8,8,240,240);
    x.fillStyle='#c23b2e'; x.beginPath(); x.arc(128,128,52,0,7); x.fill();
    x.fillStyle='#e8a93d'; x.beginPath(); x.arc(128,128,34,0,7); x.fill();
    x.fillStyle='#202020'; for(var i=0;i<12;i++){ var a=i/12*6.283; x.beginPath(); x.arc(128+Math.cos(a)*88,128+Math.sin(a)*88,10,0,7); x.fill(); }
    x.fillStyle='#2f6fb2'; x.fillRect(40,190,176,26);
    x.strokeStyle='#3e7d3a'; x.lineWidth=5; x.beginPath(); x.moveTo(30,60); x.quadraticCurveTo(128,10,226,60); x.stroke();
    return new THREE.CanvasTexture(cv); }
  var tex=artCanvas();
  var wall=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.MeshStandardMaterial({map:tex,roughness:.9}));
  wall.position.set(0,5,-3); g.add(wall); B(g,11,.6,11,0,.3,-3,0x6b4a2f);
  var w2=new THREE.Mesh(new THREE.PlaneGeometry(6,6),new THREE.MeshStandardMaterial({map:tex,roughness:.9}));
  w2.position.set(-8,3,4); w2.rotation.y=.5; g.add(w2);
  tree(g,9,8); },

chhath:function(c){ var g=c.g;
  var river=new THREE.Mesh(new THREE.PlaneGeometry(80,40),M(0x2f6fb2,{roughness:.25})); river.rotation.x=-Math.PI/2; river.position.set(0,0,-8); g.add(river);
  for(var i=0;i<5;i++) B(g,30,1,2.4,0,.5-i*1,4-i*2.4,0xc9a86a);
  var sun=new THREE.Mesh(new THREE.SphereGeometry(3,20,16),E(0xffb52e,1.6)); sun.position.set(0,7,-30); g.add(sun);
  var glow=new THREE.Mesh(new THREE.SphereGeometry(4.4,20,16),new THREE.MeshBasicMaterial({color:0xffcf6e,transparent:true,opacity:.28}));
  glow.position.copy(sun.position); g.add(glow);
  for(var d=0;d<12;d++){ var dx=-14+d*2.6, dz=-6-Math.random()*8;
    CY(g,.32,.4,.22,dx,.32,dz,0x9c5a2e,10); SP(g,.14,dx,.55,dz,0xffd76e).material=E(0xffc93e,1.4); }
  var cols=[0xc23b2e,0xe8a93d,0x2f6fb2,0x8e44ad,0x3e7d3a];
  for(var p=0;p<8;p++){ var px=-13+p*3.7;
    CY(g,.42,.5,1.7,px,1.4,3.4,cols[p%5],10); SP(g,.3,px,2.5,3.4,0xd9a077);
    B(g,1.1,.5,.7,px,2.2,2.6,0x8a5a2e); }
  c.anim.push(function(){ var t2=performance.now()*.001;
    g.children.forEach(function(m){ if(m.geometry&&m.geometry.type==='SphereGeometry'&&m.material.emissiveIntensity>1){ m.position.y+=Math.sin(t2*2+m.position.x)*.0015; } }); }); },

/* ---- Islamic heritage ---- */
biharsharif:function(c){ var g=c.g; ground(g,0xc4ab7c);
  B(g,18,4,3,0,2,-6,0xc9a86a);
  for(var i=0;i<6;i++){ var x=-7.5+i*3;
    B(g,.7,3.4,.7,x,1.7,-4.4,0xb08d5a); CN(g,1.05,1.2,x,4,-4.4,0x8f6f4a,4); }
  var ch=new THREE.Group(); B(ch,6,3.6,6,0,1.8,0,0xe8e0cc); domeOn(ch,2.4,0,3.6,0,WHITE); domeOn(ch,1,-2,3.6,0,WHITE); domeOn(ch,1,2,3.6,0,WHITE);
  ch.position.set(0,0,4); g.add(ch); minaret(g,-8,4,10); minaret(g,8,4,10);
  tree(g,-12,8); tree(g,12,-6); },

maner:function(c){ var g=c.g; ground(g,0xcfc09a);
  B(g,14,.8,14,0,.4,0,WHITE);
  var sh=new THREE.Group(); B(sh,6.5,4,6.5,0,2.8,0,WHITE);
  domeOn(sh,2.8,0,4.8,0,0x3e7d5a); CY(sh,.1,.1,2.4,0,8.4,0,GOLD,8); SP(sh,.3,0,9.6,0,GOLD);
  B(sh,1.8,2.6,.4,0,1.6,3.3,0x4a3a28);
  [[-3,-3],[3,-3],[-3,3],[3,3]].forEach(function(p){ minaret(sh,p[0]*1.4,p[1]*1.4,8); });
  sh.position.set(0,0,0); g.add(sh);
  for(var i=0;i<10;i++){ var a=i/10*Math.PI*2; CY(g,.2,.2,.5,Math.cos(a)*11,.25,Math.sin(a)*11,0xd9a520,8); SP(g,.12,Math.cos(a)*11,.62,Math.sin(a)*11,0xffd76e).material=E(0xffc93e,1.5); }
  tree(g,-11,9); },

patharmasjid:function(c){ var g=c.g; ground(g,0xbfb49a);
  B(g,16,5,5,0,2.5,-4,0x9a8a76);
  for(var i=0;i<5;i++){ B(g,1.8,3,.3,-6+i*3,1.8,-1.4,0x2e2620); }
  domeOn(g,2,0,5,-4,0x8a7a64); domeOn(g,1.5,-5,5,-4,0x8a7a64); domeOn(g,1.5,5,5,-4,0x8a7a64);
  minaret(g,-9.5,-4,11,0x9a8a76); minaret(g,9.5,-4,11,0x9a8a76);
  B(g,20,.6,10,0,.3,3,0xd8cdb4); tree(g,-12,8); tree(g,12,7); },

/* ---- extra places ---- */
barabar:function(c){ var g=c.g; ground(g,0xa89a7c);
  var hill=new THREE.Mesh(new THREE.DodecahedronGeometry(9,1),M(0x7a7268,{flatShading:true})); hill.scale.set(1.4,.8,1); hill.position.set(0,4,-4); g.add(hill);
  B(g,3,2.6,.6,0,1.3,3.4,0x1c1712);
  var arch=new THREE.Mesh(new THREE.TorusGeometry(1.5,.28,10,20,Math.PI),M(0x8a7f6e)); arch.position.set(0,2.6,3.7); g.add(arch);
  B(g,4.4,.7,1.4,0,4.4,3.6,0x8a7f6e);
  tree(g,-11,6); tree(g,11,-6); },

lauria:function(c){ var g=c.g; ground(g,0xa4bd7f);
  CY(g,.8,1,12,0,6,0,0xd8c49a,18); B(g,2,.7,2,0,12.3,0,0xd8c49a);
  var lion=new THREE.Group(); B(lion,1.5,.85,.95,0,.42,0,0xd8c49a); SP(lion,.5,.85,.85,0,0xd8c49a); lion.position.set(0,12.6,0); g.add(lion);
  for(var i=0;i<3;i++){ CY(g,3.6,3.9,.7,-8+i*8,.35,-7,BRICK,18); DM(g,3.6,-8+i*8,.7,-7,BRICK); }
  tree(g,11,6); tree(g,-12,4); },

kakolat:function(c){ var g=c.g; ground(g,0x8fae7e);
  B(g,10,9,4,-2,4.5,-8,0x5a5a5e); B(g,7,6,4,4,3,-9,0x6a6a6e); B(g,12,3,6,0,1.5,-6,0x4c4c50);
  var pool=new THREE.Mesh(new THREE.CircleGeometry(6,28),M(WATER,{roughness:.25})); pool.rotation.x=-Math.PI/2; pool.position.set(0,.06,4); g.add(pool);
  var fall=new THREE.Mesh(new THREE.PlaneGeometry(3.4,9),new THREE.MeshBasicMaterial({color:0xbfe3ff,transparent:true,opacity:.75}));
  fall.position.set(-1,4.5,-5.8); g.add(fall);
  var drops=[];
  for(var i=0;i<26;i++){ var d=SP(g,.12,-2.4+Math.random()*2.8,9,-5.6,0xdff1ff); d.material=new THREE.MeshBasicMaterial({color:0xdff1ff,transparent:true,opacity:.85}); drops.push({m:d,s:4+Math.random()*4}); }
  c.anim.push(function(dt){ drops.forEach(function(o){ o.m.position.y-=o.s*dt; if(o.m.position.y<.4){ o.m.position.y=9; } }); });
  tree(g,-10,6); tree(g,10,7); tree(g,-13,-2); tree(g,12,-4); },

valmiki:function(c){ var g=c.g; ground(g,0x7fae62);
  for(var i=0;i<26;i++){ var x=-24+Math.random()*48, z=-20+Math.random()*40; if(Math.abs(z)<3) continue; tree(g,x,z,.8+Math.random()*.9); }
  var rv=new THREE.Mesh(new THREE.PlaneGeometry(70,5),M(WATER,{roughness:.3})); rv.rotation.x=-Math.PI/2; rv.position.set(0,.05,0); g.add(rv);
  CN(g,10,7,-20,3.5,-22,0x5c8a52,8); CN(g,13,9,18,4.5,-24,0x527d4a,8);
  for(var t2=0;t2<8;t2++){ var tg=new THREE.Mesh(new THREE.TetrahedronGeometry(.9),M(0x2e7d32)); tg.position.set(-18+t2*5,.5,8+Math.random()*4); g.add(tg); } },

rajendra:function(c){ var g=c.g; ground(g,0x9fbf8a);
  B(g,8,.8,8,0,.4,0,0x8a8a8a); B(g,6,.8,6,0,1.2,0,0x9a9a9a); B(g,4,.8,4,0,2,0,0xaaaaaa);
  statue(g,0,0,3.2,0x5a4a3a);
  CY(g,.12,.12,9,5,4.5,3,0x8a6f3a,8);
  var cv=document.createElement('canvas'); cv.width=90; cv.height=60; var x2=cv.getContext('2d');
  x2.fillStyle='#ff9933'; x2.fillRect(0,0,90,20); x2.fillStyle='#fff'; x2.fillRect(0,20,90,20); x2.fillStyle='#138808'; x2.fillRect(0,40,90,20);
  var fl=new THREE.Mesh(new THREE.PlaneGeometry(4.5,3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),side:THREE.DoubleSide}));
  fl.position.set(7.4,7,3); g.add(fl);
  c.anim.push(function(){ fl.rotation.y=Math.sin(performance.now()*.002)*.18; });
  for(var i=0;i<6;i++) tree(g,-12+i*5,10); tree(g,-13,-8); tree(g,13,-9); },

jp:function(c){ var g=c.g; ground(g,0xa8bf7a);
  B(g,8,.8,8,0,.4,0,0x7a7a7a); B(g,5,.8,5,0,1.2,0,0x8a8a8a);
  var t=new THREE.Group(); CY(t,.7,.9,1.9,0,1.6,0,0x4a5a6a,12); SP(t,.42,0,3,0,0xd9a077);
  var arm=B(t,.28,1.6,.28,.8,2.6,0,0x4a5a6a); arm.rotation.z=-2.2;
  B(t,.9,.5,.14,0,1.9,.5,0x8a3a2e); t.position.set(0,1.6,0); g.add(t);
  B(g,2.6,.5,2,0,.25,6,0x6b4a2f); for(var i=0;i<8;i++) tree(g,-12+i*4,-9);
  tree(g,11,8); tree(g,-11,7); },

sitakund:function(c){ var g=c.g; ground(g,0xc2b28a);
  CY(g,4.6,4.6,.8,0,.4,0,0x9a8a72,4); CY(g,3.6,3.6,.8,0,1.1,0,0xa89880,4); CY(g,2.6,2.6,.8,0,1.8,0,0xb0a088,4);
  var wtr=new THREE.Mesh(new THREE.CircleGeometry(2.4,20),M(0x6fb7d6,{roughness:.2})); wtr.rotation.x=-Math.PI/2; wtr.position.y=2.25; g.add(wtr);
  var st=[]; for(var i=0;i<10;i++){ var s=SP(g,.3,Math.random()*4-2,2.4,Math.random()*4-2,0xffffff); s.material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35}); st.push({m:s,p:Math.random()*6}); }
  c.anim.push(function(dt){ var t=performance.now()*.001; st.forEach(function(o){ o.m.position.y=2.4+((t*.7+o.p)%2); o.m.material.opacity=.35*(1-((t*.7+o.p)%2)/2); }); });
  var tp=new THREE.Group(); B(tp,3.4,2.6,3.4,0,1.3,0,SAND); CN(tp,2.4,2.4,0,3.8,0,0xb08d5a,4); tp.position.set(7,0,-3); g.add(tp);
  for(var f=0;f<8;f++){ var a=f/8*Math.PI*2; SP(g,.22,Math.cos(a)*6,.3,Math.sin(a)*6,0xe88a2e); }
  tree(g,-10,7); },

samachakeva:function(c){ var g=c.g; ground(g,0xd8c9a8);
  B(g,10,.7,7,0,.35,0,0xb08d5a);
  var cols=[0xc23b2e,0xe8a93d,0x2f6fb2,0x3e7d3a,0x8e44ad];
  for(var i=0;i<6;i++){ var x=-3.6+i*1.45;
    CN(g,.4,.9,x,1.15,-1,cols[i%5],8); SP(g,.28,x,1.75,-1,cols[(i+2)%5]); CN(g,.16,.5,x,1.9,-.6,0xe8a93d,6); }
  for(var d=0;d<14;d++){ var a=d/14*Math.PI*2, dx=Math.cos(a)*6.4, dz=Math.sin(a)*4.6;
    CY(g,.3,.36,.2,dx,.8,dz,0x9c5a2e,10); var fl=SP(g,.13,dx,1.02,dz,0xffd76e); fl.material=E(0xffc93e,1.5); }
  var gr=new THREE.Mesh(new THREE.TorusGeometry(5.6,.3,8,32),M(0xe88a2e)); gr.rotation.x=Math.PI/2; gr.position.y=.75; g.add(gr);
  tree(g,-10,6); tree(g,10,-6); }
};

/* ---------- engine ---------- */
function makeOrbit(cam, dom, st){
  var t={r:26,th:.7,ph:1.05,tx:0,ty:2.5,tz:0};
  var ptrs={}, lastD=0;
  function apply(){
    t.ph=Math.max(.18,Math.min(1.45,t.ph)); t.r=Math.max(9,Math.min(60,t.r));
    cam.position.set(
      t.tx + t.r*Math.sin(t.ph)*Math.sin(t.th),
      t.ty + t.r*Math.cos(t.ph),
      t.tz + t.r*Math.sin(t.ph)*Math.cos(t.th));
    cam.lookAt(t.tx,t.ty,t.tz);
  }
  dom.addEventListener('pointerdown',function(e){ ptrs[e.pointerId]={x:e.clientX,y:e.clientY}; dom.setPointerCapture(e.pointerId); });
  dom.addEventListener('pointermove',function(e){
    var p=ptrs[e.pointerId]; if(!p) return;
    var ids=Object.keys(ptrs);
    if(ids.length===1){ t.th-=(e.clientX-p.x)*.008; t.ph-=(e.clientY-p.y)*.008; p.x=e.clientX; p.y=e.clientY; apply(); }
  });
  function up(e){ delete ptrs[e.pointerId]; lastD=0; }
  dom.addEventListener('pointerup',up); dom.addEventListener('pointercancel',up);
  dom.addEventListener('touchmove',function(e){
    if(e.touches.length===2){ e.preventDefault();
      var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
      if(lastD) t.r*=lastD/d; lastD=d; apply();
    } else {
      var ids=Object.keys(ptrs);
      if(ids.length===2){ var a=ptrs[ids[0]],b=ptrs[ids[1]];
        var d2=Math.hypot(a.x-b.x,a.y-b.y); if(lastD) t.r*=lastD/d2; lastD=d2; apply(); }
    }
  },{passive:false});
  dom.addEventListener('wheel',function(e){ e.preventDefault(); t.r*=1+e.deltaY*.001; apply(); },{passive:false});
  apply();
  return { tick:function(dt,auto){ if(auto) t.th+=dt*.18; if(auto) apply(); }, apply:apply };
}

function show(canvas, sceneId, opts){
  stop();
  opts=opts||{};
  renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  /* cinematic realism: ACES tone mapping + soft shadows */
  if(THREE.ACESFilmicToneMapping!==undefined) renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  if(THREE.sRGBEncoding!==undefined) renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  var scene=new THREE.Scene();
  var camera=new THREE.PerspectiveCamera(50,1,0.1,600);
  var g=new THREE.Group(); scene.add(g);
  var ctx={g:g,anim:[],scene:scene};
  /* warm golden-hour key light with shadows */
  var hemi=new THREE.HemisphereLight(0xbfd9f2,0x9a7a4e,.75); scene.add(hemi);
  var dir=new THREE.DirectionalLight(0xffd9a0,1.35); dir.position.set(26,30,16); dir.castShadow=true;
  dir.shadow.mapSize.set(1024,1024);
  dir.shadow.camera.left=-32; dir.shadow.camera.right=32;
  dir.shadow.camera.top=32; dir.shadow.camera.bottom=-32;
  dir.shadow.camera.far=120; dir.shadow.bias=-0.0008;
  scene.add(dir); scene.add(dir.target);
  /* warm fill from opposite side (no shadow) */
  var fill=new THREE.DirectionalLight(0xaac4e8,.28); fill.position.set(-20,12,-14); scene.add(fill);
  /* gradient sky dome + warm haze fog + drifting dust */
  var sky=skyDome(); scene.add(sky);
  scene.fog=new THREE.Fog(0xe8cfa0,60,190);
  var dust=addDust(scene,70);
  ctx.anim.push(function(){ var t=performance.now()*.001;
    var p=dust.geometry.attributes.position, sd=dust.userData.seed;
    for(var i=0;i<sd.length;i++){
      p.setX(i, p.getX(i)+Math.sin(t*.3+sd[i])*.008);
      p.setY(i, p.getY(i)+Math.cos(t*.22+sd[i]*1.7)*.006);
    }
    p.needsUpdate=true;
  });
  var stars=null;
  function setNight(n){
    var su=sky.material.uniforms;
    if(n){ su.top.value.set(0x060a1c); su.mid.value.set(0x101a38); su.bot.value.set(0x1c1626);
      scene.fog.color.set(0x0a0f24);
    } else { su.top.value.set(0x5f9fd4); su.mid.value.set(0xcfd9e8); su.bot.value.set(0xf6d9a8);
      scene.fog.color.set(0xe8cfa0); }
    hemi.intensity=n?.25:.75; dir.intensity=n?.22:1.35;
    dir.color.set(n?0x8fb4ff:0xffd9a0);
    fill.intensity=n?.08:.28;
    dust.visible=!n;
    if(n&&!stars){
      var pos=new Float32Array(300*3);
      for(var i=0;i<300;i++){ pos[i*3]=(Math.random()-.5)*220; pos[i*3+1]=20+Math.random()*90; pos[i*3+2]=(Math.random()-.5)*220; }
      var bg=new THREE.BufferGeometry(); bg.setAttribute('position',new THREE.BufferAttribute(pos,3));
      stars=new THREE.Points(bg,new THREE.PointsMaterial({color:0xffffff,size:.9})); scene.add(stars);
    }
    if(stars) stars.visible=n;
  }
  var fn=builders[sceneId]||builders.nalanda;
  try{ fn(ctx); }catch(e){ if(window.console) console.log('scene err',sceneId,e); }
  setNight(!!opts.night);
  function resize(){
    var w=canvas.clientWidth||canvas.parentElement.clientWidth||320;
    var h=canvas.clientHeight||canvas.parentElement.clientHeight||340;
    renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
  }
  resize(); window.addEventListener('resize',resize);
  var orbit=makeOrbit(camera,canvas,{});
  var auto=opts.rotate!==false, last=performance.now();
  S={canvas:canvas,resize:resize,setNight:setNight,
     setRotate:function(v){auto=!!v;},
     api:{setNight:setNight,setRotate:function(v){auto=!!v;}}};
  (function loop(now){
    raf=requestAnimationFrame(loop);
    var dt=Math.min(.05,(now-last)/1000); last=now;
    ctx.anim.forEach(function(a){ try{a(dt);}catch(e){} });
    orbit.tick(dt,auto);
    renderer.render(scene,camera);
  })(last);
  return S.api;
}

function stop(){
  if(raf) cancelAnimationFrame(raf); raf=null;
  if(S&&S.resize) window.removeEventListener('resize',S.resize);
  if(renderer){ try{renderer.dispose();}catch(e){} renderer=null; }
  S=null;
}

return {show:show, stop:stop};
})();
