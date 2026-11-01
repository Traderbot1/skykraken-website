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

  // scroll reveal (content stays visible without JS). Anything that has reached or passed the
  // viewport is revealed, so a fast fling or a dragged scrollbar can never leave text invisible.
  root.classList.add('js-motion');
  var pending=[].slice.call(document.querySelectorAll('.reveal'));
  var revealCheck=function(){
    if(!pending.length)return;
    var lim=window.innerHeight*0.94;
    pending=pending.filter(function(el){
      if(!el.classList.contains('reveal')||el.getBoundingClientRect().top<lim){el.classList.add('in');return false;}
      return true;
    });
  };
  var rq=false;
  var onRevealScroll=function(){if(rq)return;rq=true;requestAnimationFrame(function(){rq=false;revealCheck();});};
  window.addEventListener('scroll',onRevealScroll,{passive:true});
  window.addEventListener('resize',onRevealScroll);
  revealCheck();

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
    if(window.SplitText)gsap.registerPlugin(window.SplitText);

    // smooth scrolling on fine pointers, driven by GSAP's ticker so ScrollTrigger stays in sync
    var fine=window.matchMedia('(pointer: fine)').matches;
    if(window.Lenis&&window.ScrollTrigger&&fine){
      var lenis=new window.Lenis({duration:1.15,easing:function(t){return Math.min(1,1.001-Math.pow(2,-10*t));},wheelMultiplier:.95});
      lenis.on('scroll',window.ScrollTrigger.update);
      gsap.ticker.add(function(t){lenis.raf(t*1000);});
      gsap.ticker.lagSmoothing(0);
      root.classList.add('lenis');
      // in-page anchors glide too
      document.querySelectorAll('a[href^="#"]').forEach(function(a){
        a.addEventListener('click',function(e){var id=a.getAttribute('href');if(id.length<2)return;var el=document.querySelector(id);if(!el)return;e.preventDefault();lenis.scrollTo(el,{offset:-80});history.replaceState(null,'',id);});
      });
    }

    // first viewport: the headline settles line by line, then the legend is drawn
    var intro=document.querySelector('[data-intro]');
    if(intro){
      var tl=gsap.timeline({defaults:{ease:'expo.out'}});
      tl.from(intro.querySelectorAll('[data-intro-line]'),{yPercent:40,opacity:0,filter:'blur(8px)',duration:1.3,stagger:.12})
        .from(intro.querySelectorAll('[data-intro-fade]'),{y:16,opacity:0,duration:1,stagger:.08},'-=.9');
      var legend=document.querySelector('.legend');
      if(legend){
        tl.from(legend,{scaleX:0,transformOrigin:'0 50%',duration:1.4,ease:'expo.inOut'},'-=1')
          .from(legend.querySelectorAll('a'),{opacity:0,y:12,duration:.9,stagger:.07},'-=.6');
      }
    }

    if(window.ScrollTrigger){
      // section headings rise out of a mask, line by line, once fonts are in
      var heads=gsap.utils.toArray('.section-head h2, .split > div > h2, .closing h2, .page-hero h1, .product-hero ~ section h2');
      var splitHeads=function(){
        heads.forEach(function(h){
          if(h.dataset.split)return; h.dataset.split='1';
          h.classList.remove('reveal');
          if(window.SplitText){
            var st=window.SplitText.create(h,{type:'lines',mask:'lines',linesClass:'split-line'});
            gsap.from(st.lines,{yPercent:105,duration:1.15,ease:'expo.out',stagger:.09,scrollTrigger:{trigger:h,start:'top 86%'}});
          }else{
            gsap.from(h,{y:30,opacity:0,duration:1,ease:'expo.out',scrollTrigger:{trigger:h,start:'top 86%'}});
          }
        });
      };
      (document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(splitHeads);

      // chapter panels slide in from the copy side as the map flies to each product
      gsap.utils.toArray('.chapter .panel').forEach(function(p){
        gsap.from(p,{x:-40,opacity:0,duration:1.1,ease:'expo.out',scrollTrigger:{trigger:p,start:'top 78%'}});
      });
      // key figures count up together
      gsap.utils.toArray('.figures-row > div').forEach(function(d,i){
        gsap.from(d,{y:24,opacity:0,duration:1,ease:'expo.out',delay:i*.06,scrollTrigger:{trigger:d,start:'top 90%'}});
      });
      // integration route: stations arrive in sequence
      gsap.utils.toArray('.route').forEach(function(r){
        gsap.from(r.querySelectorAll('li:not(.route-pulse)'),{opacity:0,y:18,duration:.8,stagger:.14,ease:'expo.out',scrollTrigger:{trigger:r,start:'top 80%'}});
      });
      // evidence sheet lands like paper on a desk
      gsap.utils.toArray('.sheet[data-land]').forEach(function(s){
        gsap.from(s,{y:60,rotate:-2.2,opacity:0,duration:1.3,ease:'expo.out',scrollTrigger:{trigger:s,start:'top 85%'}});
      });
      // the spectrum opens like an instrument screen
      gsap.utils.toArray('[data-spectrum]').forEach(function(sp){
        gsap.from(sp,{clipPath:'inset(0 0 100% 0)',duration:1.6,ease:'expo.inOut',scrollTrigger:{trigger:sp,start:'top 80%'}});
      });
      // product photos ease in with a slow scale, like a lens settling
      gsap.utils.toArray('.plate img, .photo img, .feed img').forEach(function(im){
        gsap.fromTo(im,{scale:1.12},{scale:1,ease:'none',scrollTrigger:{trigger:im,start:'top bottom',end:'bottom top',scrub:true}});
      });
    }

    // magnetic primary buttons (fine pointers only)
    if(fine){
      document.querySelectorAll('.btn-primary').forEach(function(b){
        var qx=gsap.quickTo(b,'x',{duration:.5,ease:'power3'}),qy=gsap.quickTo(b,'y',{duration:.5,ease:'power3'});
        b.addEventListener('pointermove',function(e){var r=b.getBoundingClientRect();qx((e.clientX-r.left-r.width/2)*.18);qy((e.clientY-r.top-r.height/2)*.28);});
        b.addEventListener('pointerleave',function(){qx(0);qy(0);});
      });
      // evidence sheet tilts toward the pointer
      document.querySelectorAll('[data-tilt]').forEach(function(el){
        el.parentElement.style.perspective='1200px';
        el.addEventListener('pointermove',function(e){var r=el.getBoundingClientRect();var x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;el.style.transform='rotateY('+(x*7)+'deg) rotateX('+(-y*6)+'deg)';});
        el.addEventListener('pointerleave',function(){el.style.transform='';});
      });
    }
  }

  // integration route: light each station as the signal pulse passes it
  document.querySelectorAll('[data-route]').forEach(function(r){
    var pulse=r.querySelector('.route-pulse');if(!pulse||reduce)return;
    var stations=[].slice.call(r.querySelectorAll('li:not(.route-pulse)'));
    var on=false;
    new IntersectionObserver(function(es){on=es[0].isIntersecting;if(on)requestAnimationFrame(tick);}).observe(r);
    function tick(){
      if(!on)return;
      var px=pulse.getBoundingClientRect().left;
      stations.forEach(function(li){var x=li.getBoundingClientRect().left;li.classList.toggle('lit',px>=x-6&&px<x+60);});
      requestAnimationFrame(tick);
    }
  });

  // footer wordmark: radio wavefronts travel through the letters of the name
  var mark=document.querySelector('.foot-mark');
  if(mark){
    var cv=mark.querySelector('canvas'),cx=cv.getContext('2d'),word='SKYKRAKEN';
    var MW=0,MH=0,DP=1,fs=100,base=0,inView=false,raf=0,t0=performance.now();
    var size=function(){
      DP=Math.min(window.devicePixelRatio||1,2);
      MW=Math.max(1,mark.clientWidth);
      cx.setTransform(1,0,0,1,0,0);
      cx.font='800 100px Archivo';try{cx.fontStretch='expanded';}catch(e){}
      var m=cx.measureText(word);fs=100*MW/m.width;
      MH=Math.round(fs*0.78);base=Math.round(fs*0.86);
      cv.width=Math.round(MW*DP);cv.height=Math.round(MH*DP);cv.style.height=MH+'px';
      draw(performance.now());
    };
    var draw=function(now){
      var t=(now-t0)/1000;
      cx.setTransform(DP,0,0,DP,0,0);
      cx.globalCompositeOperation='source-over';
      cx.clearRect(0,0,MW,MH);
      // the emitter drifts slowly along the name, like a sensor sweeping the line
      var ox=MW*(0.5+0.4*Math.sin(t*0.11)),oy=MH*0.5,spacing=Math.max(14,fs*0.11),R=Math.hypot(MW,MH)*1.1;
      cx.lineWidth=Math.max(1.2,fs*0.012);
      for(var r=(t*fs*0.22)%spacing;r<R;r+=spacing){
        var a=Math.max(0,1-r/R);
        cx.strokeStyle='rgba(245,242,234,'+(0.18+0.6*a).toFixed(3)+')';
        cx.beginPath();cx.arc(ox,oy,r,0,2*Math.PI);cx.stroke();
      }
      // one red ring: a drone just identified
      var rr=(t*fs*0.5)%(R*1.4);
      cx.strokeStyle='rgba(236,91,91,'+Math.max(0,0.9-rr/R).toFixed(3)+')';cx.lineWidth=Math.max(1.6,fs*0.02);
      cx.beginPath();cx.arc(ox,oy,rr,0,2*Math.PI);cx.stroke();
      // keep the waves only inside the letters
      cx.globalCompositeOperation='destination-in';
      cx.font='800 '+fs+'px Archivo';try{cx.fontStretch='expanded';}catch(e){}
      cx.fillStyle='#000';cx.textBaseline='alphabetic';cx.fillText(word,0,base);
      // faint outline so the name reads even between wavefronts
      cx.globalCompositeOperation='destination-over';
      cx.fillStyle='rgba(245,242,234,0.055)';cx.fillText(word,0,base);
      cx.globalCompositeOperation='source-over';
      cx.strokeStyle='rgba(245,242,234,0.2)';cx.lineWidth=1;cx.strokeText(word,0,base);
    };
    var loopMark=function(now){if(!inView)return;draw(now);raf=requestAnimationFrame(loopMark);};
    new IntersectionObserver(function(es){inView=es[0].isIntersecting;cancelAnimationFrame(raf);if(inView&&!document.hidden)raf=requestAnimationFrame(loopMark);}).observe(mark);
    (document.fonts&&document.fonts.load?document.fonts.load('800 100px Archivo'):Promise.resolve()).then(function(){size();});
    window.addEventListener('resize',size);
    mark.classList.add('is-live');
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
