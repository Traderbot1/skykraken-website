/* SkyKraken — shared behaviour */
(function(){
  var root=document.documentElement;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FR=(root.lang||'').toLowerCase().indexOf('fr')===0;

  // header state on scroll
  var hdr=document.querySelector('header.site');
  if(hdr){var onS=function(){hdr.classList.toggle('scrolled',window.scrollY>30)};window.addEventListener('scroll',onS,{passive:true});onS();}

  // mobile nav (moved out of <header> on small screens to escape its stacking context)
  var burger=document.querySelector('.burger'),nav=document.querySelector('nav.main');
  if(burger&&nav){
    var navHome=nav.parentElement,navNext=nav.nextElementSibling;
    burger.setAttribute('aria-label',FR?'Menu':'Menu');
    burger.setAttribute('aria-expanded','false');
    if(!nav.id)nav.id='main-nav';
    burger.setAttribute('aria-controls',nav.id);
    var backdrop=document.createElement('div');backdrop.className='nav-backdrop';document.body.appendChild(backdrop);
    var isMobile=function(){return window.innerWidth<=1060;};
    var placeNav=function(){
      if(isMobile()){if(nav.parentElement!==document.body)document.body.appendChild(nav);}
      else if(nav.parentElement!==navHome){if(navNext&&navNext.parentElement===navHome)navHome.insertBefore(nav,navNext);else navHome.appendChild(nav);}
    };
    placeNav();
    var openNav=function(){nav.classList.add('open');burger.classList.add('open');backdrop.classList.add('show');document.body.classList.add('nav-lock');burger.setAttribute('aria-expanded','true');var f=nav.querySelector('a');if(f)f.focus();};
    var closeNav=function(){nav.classList.remove('open');burger.classList.remove('open');backdrop.classList.remove('show');document.body.classList.remove('nav-lock');burger.setAttribute('aria-expanded','false');};
    burger.addEventListener('click',function(){nav.classList.contains('open')?closeNav():openNav();});
    backdrop.addEventListener('click',closeNav);
    nav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',closeNav)});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&nav.classList.contains('open')){closeNav();burger.focus();}});
    window.addEventListener('resize',function(){placeNav();if(!isMobile())closeNav();});
  }

  // mark current page in nav
  var here=location.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
  document.querySelectorAll('nav.main a[href]').forEach(function(a){
    var h=a.getAttribute('href').replace(/\.html$/,'').replace(/\/$/,'')||'/';
    if(h===here&&!a.classList.contains('cta-nav')&&!a.closest('.lang'))a.setAttribute('aria-current','page');
  });

  // scroll reveal (content stays visible without JS)
  root.classList.add('js-motion');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
    document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
  }else document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('in')});

  // animated counters (data-count = target, data-rate optional live increment)
  document.querySelectorAll('[data-count]').forEach(function(el){
    var target=+el.getAttribute('data-count'),rate=+(el.getAttribute('data-rate')||0),cur=0,step=target/60,started=false;
    var loc=FR?'fr-FR':'en-US';
    if(reduce){el.textContent=target.toLocaleString(loc);return;}
    var co=new IntersectionObserver(function(es){es.forEach(function(e){
      if(e.isIntersecting&&!started){started=true;
        var t=setInterval(function(){cur+=step;if(cur>=target){cur=target;clearInterval(t);
          if(rate){setInterval(function(){cur+=rate;el.textContent=Math.floor(cur).toLocaleString(loc)},1000);}}
          el.textContent=Math.floor(cur).toLocaleString(loc)},16);
      }})},{threshold:.5});
    co.observe(el);
  });

  // decorative loops stop under reduced motion
  if(reduce)document.querySelectorAll('video[autoplay]').forEach(function(v){v.removeAttribute('autoplay');v.pause();v.setAttribute('controls','');});

  // manifesto video sound toggle
  var mv=document.getElementById('manifestoVideo'),mb=document.getElementById('manifestoSound');
  if(mv&&mb){
    var lbl=document.getElementById('soundLabel');
    var setIcons=function(on){mb.querySelectorAll('.ico-muted').forEach(function(e){e.style.display=on?'none':'';});mb.querySelectorAll('.ico-on').forEach(function(e){e.style.display=on?'':'none';});};
    setIcons(false);
    var isFR=(lbl&&lbl.textContent.trim()==='Son');
    mb.addEventListener('click',function(){
      mv.muted=!mv.muted;if(!mv.muted){mv.play();}
      setIcons(!mv.muted);
      if(lbl)lbl.textContent=mv.muted?(isFR?'Son':'Sound'):(isFR?'Couper':'Mute');
      mb.setAttribute('aria-label',mv.muted?(isFR?'Activer le son':'Activate sound'):(isFR?'Couper le son':'Mute'));
    });
  }

  // GSAP choreography (only where GSAP is loaded, never under reduced motion)
  if(window.gsap&&!reduce){
    var gsap=window.gsap;
    if(window.ScrollTrigger)gsap.registerPlugin(window.ScrollTrigger);
    // first viewport: the headline settles line by line, then the legend is drawn
    var intro=document.querySelector('[data-intro]');
    if(intro){
      var tl=gsap.timeline({defaults:{ease:'expo.out'}});
      tl.from(intro.querySelectorAll('[data-intro-line]'),{yPercent:40,opacity:0,filter:'blur(8px)',duration:1.3,stagger:.12})
        .from(intro.querySelectorAll('[data-intro-fade]'),{y:16,opacity:0,duration:1,stagger:.08},'-=.9')
        .from(document.querySelector('.legend'),{scaleX:0,transformOrigin:'0 50%',duration:1.4,ease:'expo.inOut'},'-=1')
        .from(document.querySelectorAll('.legend a'),{opacity:0,y:12,duration:.9,stagger:.07},'-=.6');
    }
    if(window.ScrollTrigger){
      // chapter panels slide in from the copy side as the map flies to each product
      gsap.utils.toArray('.chapter .panel').forEach(function(p){
        gsap.from(p,{x:-40,opacity:0,duration:1.1,ease:'expo.out',scrollTrigger:{trigger:p,start:'top 78%'}});
      });
      // integration route: stations light up in sequence
      gsap.utils.toArray('.route').forEach(function(r){
        var items=r.querySelectorAll('li');
        gsap.from(items,{opacity:0,y:18,duration:.8,stagger:.14,ease:'expo.out',scrollTrigger:{trigger:r,start:'top 80%'}});
      });
      // evidence sheet lands like paper on a desk
      gsap.utils.toArray('.sheet[data-land]').forEach(function(s){
        gsap.from(s,{y:60,rotate:-2.2,opacity:0,duration:1.3,ease:'expo.out',scrollTrigger:{trigger:s,start:'top 85%'}});
      });
    }
  }

  // contact form (shared by EN/FR pages)
  var form=document.getElementById('contactForm');
  if(form){
    var params=new URLSearchParams(location.search);
    var prod=params.get('product');
    var sel=form.querySelector('[name="product"]');
    if(prod&&sel){Array.prototype.forEach.call(sel.options,function(o){if(o.value===prod)sel.value=prod;});}
    var status=document.getElementById('formStatus'),btn=document.getElementById('sendBtn');
    form.addEventListener('submit',function(e){
      e.preventDefault();
      if(!form.reportValidity())return;
      btn.disabled=true;btn.setAttribute('aria-busy','true');
      status.style.display='block';status.className='';status.textContent=FR?'Envoi en cours…':'Sending…';
      fetch('/api/contact',{method:'POST',body:new FormData(form)})
        .then(function(r){return r.json().catch(function(){return {ok:false}})})
        .then(function(d){
          if(d&&d.ok){status.className='ok';status.textContent=FR?'Merci. Votre demande est bien partie : nous revenons vers vous rapidement.':'Thank you. Your enquiry has been sent and we will get back to you shortly.';form.reset();}
          else throw new Error();
        })
        .catch(function(){status.className='err';status.textContent=FR?'L’envoi a échoué. Réessayez, ou écrivez-nous à contact@skykraken.fr.':'Sending failed. Please try again, or email contact@skykraken.fr.';})
        .finally(function(){btn.disabled=false;btn.removeAttribute('aria-busy');});
    });
  }
})();
