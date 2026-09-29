/* SkyKraken — shared behaviour */
(function(){
  // header shrink on scroll
  var hdr=document.querySelector('header.site');
  if(hdr){window.addEventListener('scroll',function(){hdr.classList.toggle('scrolled',window.scrollY>30)});}

  // mobile nav (accessible, robust) — moved out of <header> on mobile to escape its backdrop-filter stacking context
  var burger=document.querySelector('.burger'),nav=document.querySelector('nav.main');
  if(burger&&nav){
    var header=document.querySelector('header.site');
    var navHome=nav.parentElement, navNext=nav.nextElementSibling; // remember original spot
    burger.setAttribute('aria-label','Menu');
    burger.setAttribute('aria-expanded','false');
    if(!nav.id)nav.id='main-nav';
    burger.setAttribute('aria-controls',nav.id);
    var backdrop=document.createElement('div');backdrop.className='nav-backdrop';document.body.appendChild(backdrop);
    function isMobile(){return window.innerWidth<=900;}
    function placeNav(){
      if(isMobile()){ if(nav.parentElement!==document.body)document.body.appendChild(nav); }
      else { if(nav.parentElement!==navHome){ if(navNext&&navNext.parentElement===navHome)navHome.insertBefore(nav,navNext); else navHome.appendChild(nav); } }
    }
    placeNav();
    function openNav(){nav.classList.add('open');burger.classList.add('open');backdrop.classList.add('show');document.body.classList.add('nav-lock');burger.setAttribute('aria-expanded','true');}
    function closeNav(){nav.classList.remove('open');burger.classList.remove('open');backdrop.classList.remove('show');document.body.classList.remove('nav-lock');burger.setAttribute('aria-expanded','false');}
    function toggleNav(){nav.classList.contains('open')?closeNav():openNav();}
    burger.addEventListener('click',toggleNav);
    backdrop.addEventListener('click',closeNav);
    nav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',closeNav)});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&nav.classList.contains('open'))closeNav();});
    window.addEventListener('resize',function(){placeNav();if(!isMobile())closeNav();});
  }

  // scroll reveal
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});

  // animated counters (data-count = target, data-rate optional live increment)
  document.querySelectorAll('[data-count]').forEach(function(el){
    var target=+el.getAttribute('data-count'),rate=+(el.getAttribute('data-rate')||0),cur=0,
        step=target/60,started=false;
    var co=new IntersectionObserver(function(es){es.forEach(function(e){
      if(e.isIntersecting&&!started){started=true;
        var t=setInterval(function(){cur+=step;if(cur>=target){cur=target;clearInterval(t);
          if(rate){setInterval(function(){cur+=rate;el.textContent=Math.floor(cur).toLocaleString('en-US')},1000);}}
          el.textContent=Math.floor(cur).toLocaleString('en-US')},16);
      }})},{threshold:.5});
    co.observe(el);
  });
  // manifesto video sound toggle
  var mv=document.getElementById('manifestoVideo'),mb=document.getElementById('manifestoSound');
  if(mv&&mb){
    var lbl=document.getElementById('soundLabel');
    function setIcons(on){
      mb.querySelectorAll('.ico-muted').forEach(function(e){e.style.display=on?'none':'';});
      mb.querySelectorAll('.ico-on').forEach(function(e){e.style.display=on?'':'none';});
    }
    setIcons(false);
    var isFR=(lbl&&lbl.textContent.trim()==='Son');
    var L_SOUND=isFR?'Son':'Sound', L_MUTE=isFR?'Couper':'Mute';
    mb.addEventListener('click',function(){
      mv.muted=!mv.muted;
      if(!mv.muted){mv.play();}
      setIcons(!mv.muted);
      if(lbl)lbl.textContent=mv.muted?L_SOUND:L_MUTE;
      mb.setAttribute('aria-label',mv.muted?(isFR?'Activer le son':'Activate sound'):(isFR?'Couper le son':'Mute'));
    });
  }
})();
