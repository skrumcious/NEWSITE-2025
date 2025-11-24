
    // Assuming your `contact` button has an ID of "contact"
document.getElementById('contact').addEventListener('click', () => {
    import('./ContactForm.js').then(module => {
        module.showContactForm();
    });
});

// Page wipe navigation: horizontal 'whip' animation before navigating
(function(){

  const links = document.querySelectorAll('.menu a');
  const wipe = document.getElementById('pageWipe');
  let animating = false;

  function navigateWithWipe(url){
    if(animating) return;
    animating = true;
    wipe.style.display = 'block';
    // force reflow so class addition triggers transition
    void wipe.offsetWidth;
    wipe.classList.add('animate');

    const onEnd = function(){
      wipe.removeEventListener('transitionend', onEnd);
      // navigate after animation completes
      window.location.href = url;
    };

    wipe.addEventListener('transitionend', onEnd);

    // fallback in case transitionend doesn't fire (safety)
    setTimeout(()=>{
      if(animating){ window.location.href = url; }
    }, 800);
  }

  links.forEach(a => {
    a.addEventListener('click', function(e){
      const href = a.getAttribute('href');
      if(!href || href === '#') return;
      e.preventDefault();
      navigateWithWipe(href);
    });
  });
})();

/* Image slider: auto-advance every 3s, pause on hover
   Supports multiple .slider instances on the page. Each slider has its own timer
   and looks for a sibling .slider-nav inside the same .slider-wrapper. */
(function(){
  const sliders = Array.from(document.querySelectorAll('.slider'));
  if(!sliders.length) return;

  const DEFAULT_DELAY = 3000; // 3s

  sliders.forEach(slider => {
    const slides = Array.from(slider.children);
    if(slides.length < 2) return;

    let interval = null;
    const delay = DEFAULT_DELAY;

    function nextSlide(){
      // Find nearest child by offset and advance to next — robust when slides change size/type
      const children = Array.from(slider.children);
      if(children.length === 0) return;
      const scrollLeft = slider.scrollLeft || 0;
      let idx = 0;
      let minDiff = Infinity;
      children.forEach((c,i)=>{
        const off = c.offsetLeft || 0;
        const diff = Math.abs(off - scrollLeft);
        if(diff < minDiff){ minDiff = diff; idx = i; }
      });
      const nextIdx = (idx + 1) % children.length;
      const target = children[nextIdx];
      const left = target ? (target.offsetLeft || 0) : nextIdx * slider.clientWidth;
      slider.scrollTo({ left, behavior: 'smooth' });
      // activate that index after a short delay so any video replacement has started
      setTimeout(()=> activateIndex(nextIdx), 450);
    }

    function startAuto(){ stopAuto(); interval = setInterval(nextSlide, delay); }
    function stopAuto(){ if(interval){ clearInterval(interval); interval = null; } }

    // allow external visibility toggles to pause/resume this slider
    slider.addEventListener('slider-visibility', (ev)=>{
      try{
        const visible = ev && ev.detail && ev.detail.visible;
        if(visible) startAuto(); else stopAuto();
      }catch(e){}
    });

    // pause / resume on hover & focus
    slider.addEventListener('mouseenter', stopAuto, {passive:true});
    slider.addEventListener('mouseleave', startAuto, {passive:true});
    slider.addEventListener('focusin', stopAuto);
    slider.addEventListener('focusout', startAuto);

    // if user scrolls manually, restart after short debounce
    let scrollTimeout = null;
    let currentIndex = -1;
    function activateIndex(idx){
      const children = Array.from(slider.children);
      if(idx < 0 || idx >= children.length) return;
      if(idx === currentIndex) return;
      currentIndex = idx;
      // pause any video elements in other slides
      children.forEach((child, i)=>{
        const el = child.tagName === 'VIDEO' ? child : child.querySelector && (child.querySelector('video') || child.querySelector('img'));
        if(!el) return;
        if(i !== idx){
          if(el.tagName === 'VIDEO'){
            try{ el.pause(); el.muted = true; el.currentTime = 0; }catch(e){}
          }
        }
      });

      // handle target slide: if it is a video, play it; if it's an img that points to an mp4, replace it with a muted looping video and play
      const target = children[idx];
      if(!target) return;
      // direct video element
      if(target.tagName === 'VIDEO'){
        try{ target.muted = true; target.currentTime = 0; target.play(); }catch(e){}
        return;
      }
      // image element that may point to mp4
      if(target.tagName === 'IMG'){
        const src = target.getAttribute('src') || '';
        if(src.match(/\.mp4(\?|$)/i)){
          // if not already replaced, create a video element
          const video = document.createElement('video');
          video.playsInline = true;
          video.muted = true;
          video.loop = true;
          video.style.width = '100%';
          video.style.height = '100%';
          const source = document.createElement('source');
          source.src = src;
          source.type = 'video/mp4';
          video.appendChild(source);
          target.replaceWith(video);
          try{ video.play(); }catch(e){}
        }
        return;
      }
      // otherwise, check for nested video or img
      const nestedVideo = target.querySelector && target.querySelector('video');
      if(nestedVideo){ try{ nestedVideo.muted = true; nestedVideo.currentTime = 0; nestedVideo.play(); }catch(e){}; 
        // ensure the slide is snapped in case sizes changed
        setTimeout(()=>{
          try{ const updated = Array.from(slider.children)[idx]; if(updated) slider.scrollTo({ left: updated.offsetLeft || 0, behavior: 'smooth' }); }catch(e){}
        }, 140);
        return;
      }
      const nestedImg = target.querySelector && target.querySelector('img');
      if(nestedImg){ const src = nestedImg.getAttribute('src')||''; if(src.match(/\.mp4(\?|$)/i)){
          const video = document.createElement('video');
          video.playsInline=true; video.muted=true; video.loop=true;
          video.style.width='100%'; video.style.height='100%'; video.style.display='block'; video.style.objectFit='cover';
          const source = document.createElement('source'); source.src=src; source.type='video/mp4'; video.appendChild(source);
          // Replace the image with the video but then re-snap to its offset so scrolling lines up
          nestedImg.replaceWith(video);
          try{video.play();}catch(e){}
          setTimeout(()=>{
            try{ const updated = Array.from(slider.children)[idx]; if(updated) slider.scrollTo({ left: updated.offsetLeft || 0, behavior: 'smooth' }); }catch(e){}
          }, 140);
        }
      }
    }

    slider.addEventListener('scroll', ()=>{
      if(scrollTimeout) clearTimeout(scrollTimeout);
      stopAuto();
      // compute nearest child by offset and activate it
      const children = Array.from(slider.children);
      const scrollLeft = slider.scrollLeft || 0;
      let nearest = 0; let nearestDiff = Infinity;
      children.forEach((c,i)=>{
        const diff = Math.abs((c.offsetLeft || 0) - scrollLeft);
        if(diff < nearestDiff){ nearestDiff = diff; nearest = i; }
      });
      activateIndex(nearest);
      scrollTimeout = setTimeout(()=> startAuto(), 1200);
    }, {passive:true});

    // ensure initial activation of first slide
    setTimeout(()=> activateIndex(0), 200);

    // wire nav dots inside the same slider-wrapper
    const wrapper = slider.closest('.slider-wrapper');
    const nav = wrapper ? wrapper.querySelector('.slider-nav') : null;
    if(nav){
      const children = Array.from(slider.children);
      const anchors = Array.from(nav.querySelectorAll('a'));
      // If anchor count doesn't match slides, rebuild the nav to match slides
      if(anchors.length !== children.length){
        nav.innerHTML = '';
        children.forEach((ch, i)=>{
          const a = document.createElement('a');
          a.href = '#';
          a.setAttribute('aria-label', 'Go to slide ' + (i+1));
          nav.appendChild(a);
        });
      }

      nav.querySelectorAll('a').forEach((a, idx)=>{
        a.addEventListener('click', (e)=>{
          e.preventDefault();
          const childrenNow = Array.from(slider.children);
          const target = childrenNow[idx];
          const left = target ? (target.offsetLeft || 0) : idx * slider.clientWidth;
          slider.scrollTo({ left, behavior: 'smooth' });
          // explicitly activate the clicked index (important for mp4/image replacements)
          setTimeout(()=> activateIndex(idx), 350);
          stopAuto();
          setTimeout(startAuto, 2500);
        });
      });
      // make sure nav is visible
      nav.style.display = nav.style.display || 'flex';
    }

    // ensure the slider starts
    startAuto();
    // run once to ensure correct snapping on load
    setTimeout(nextSlide, delay);
  });
})();

// Pause sliders and videos when they are offscreen to save CPU/bandwidth
(function(){
  if(!('IntersectionObserver' in window)) return;

  // Observe sliders/slider-wrappers and dispatch visibility events
  const sliderObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const el = entry.target;
      // find the actual .slider element (the wrapper might be observed)
      const sliderEl = el.classList && el.classList.contains('slider') ? el : (el.querySelector && el.querySelector('.slider')) || null;
      if(sliderEl){
        sliderEl.dispatchEvent(new CustomEvent('slider-visibility', {detail:{visible: entry.isIntersecting}}));
      }
    });
  }, { threshold: 0.25 });

  document.querySelectorAll('.slider, .slider-wrapper').forEach(el => sliderObserver.observe(el));

  // Observe videos and pause/play based on visibility. Play only muted/looping previews automatically.
  const vidObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const v = entry.target;
      if(!v || v.tagName !== 'VIDEO') return;
      try{
        // play only when fully inside the viewport (intersectionRatio >= 1)
        if(entry.intersectionRatio >= 1){
          if(v.muted || v.loop || v.dataset.autoplay === 'true'){
            v.play().catch(()=>{});
          }
        } else {
          v.pause();
        }
      }catch(e){}
    });
  }, { threshold: 1.0 });

  document.querySelectorAll('video').forEach(v => vidObserver.observe(v));
})();

/* Hover overlay and modal playback for videos
   - show overlay after 1.5s hover
   - pause all other videos while overlay is visible, resume when hidden
   - clicking CTA (or the wrapper) opens a modal: other videos remain paused while modal open
   - modal plays from start, unmuted, with controls and scaled up (max 1000px)
*/
(function(){
  const wrappers = document.querySelectorAll('.video-wrapper');
  if(!wrappers || wrappers.length === 0) return;

  const HOVER_DELAY = 800; // ms

  // helper to humanize data-title or id
  function humanize(str){
    if(!str) return '';
    // replace camelCase and underscores/hyphens with spaces
      return str
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  // pause all videos except optional exclude
  function pauseOthers(exclude){
    const playing = [];
    document.querySelectorAll('.video-wrapper video').forEach(v => {
      if(v === exclude) return;
      try{
        if(!v.paused){ playing.push(v); v.pause(); }
      }catch(e){}
    });
    return playing; // return previously playing videos
  }

  // resume list of videos
  function resumeList(list){
    if(!list) return;
    list.forEach(v=>{
      try{ v.play(); }catch(e){}
    });
  }

  // Create modal element and play
  function openModalFor(video){
    // pause/hide hover for this video
    const previouslyPlaying = pauseOthers(video);

    // create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'video-modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'video-modal';

    // build modal video element with same source(s)
    const modalVideo = document.createElement('video');
    modalVideo.controls = true;
    modalVideo.playsInline = true;
    modalVideo.autoplay = true;
    modalVideo.muted = false;
    modalVideo.style.maxWidth = '100%';
    

    // copy sources
    const srcs = Array.from(video.querySelectorAll('source'));
    if(srcs.length){
      srcs.forEach(s => {
        const copy = document.createElement('source');
        copy.src = s.src || s.getAttribute('src');
        copy.type = s.type || s.getAttribute('type') || '';
        modalVideo.appendChild(copy);
      });
    } else {
      // fallback: try src attribute on video
      if(video.currentSrc) modalVideo.src = video.currentSrc;
    }

    modal.appendChild(modalVideo);

    // close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '1rem';
    closeBtn.style.right = '1rem';
    closeBtn.style.zIndex = '20100';
    closeBtn.style.padding = '.5rem 1rem';
    closeBtn.style.borderRadius = '6px';
    backdrop.appendChild(modal);
    backdrop.appendChild(closeBtn);

    document.body.classList.add('modal-open');
    document.body.appendChild(backdrop);

    // start from beginning, unmuted
    modalVideo.currentTime = 0;
    modalVideo.muted = false;
    modalVideo.volume = 1;
    // try to play (some browsers require user gesture)
    const p = modalVideo.play();
    if(p && p.catch){ p.catch(()=>{}); }

    // clicking backdrop outside modal closes
    backdrop.addEventListener('click', (e)=>{
      if(e.target === backdrop || e.target === closeBtn){
        closeModal();
      }
    });

    function closeModal(){
      try{ modalVideo.pause(); }catch(e){}
      if(backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      document.body.classList.remove('modal-open');
      // resume any videos that were playing before modal
      resumeList(previouslyPlaying);
    }

    // return a handle to close if needed
    return { backdrop, modalVideo, close: closeModal };
  }

  // For each wrapper, wire hover timer and overlay
  wrappers.forEach(wrapper => {
    const video = wrapper.querySelector('video');
    const overlay = wrapper.querySelector('.video-hover-overlay');
    const titleEl = overlay ? overlay.querySelector('.title') : null;
    const cta = overlay ? overlay.querySelector('.cta') : null;
    if(titleEl) titleEl.textContent = humanize(wrapper.dataset.title || video.id || '');

    let hoverTimer = null;
    let pausedByHover = [];

    function showOverlay(){
      if(!overlay) return;
      overlay.classList.add('show');
      overlay.setAttribute('aria-hidden','false');
      // pause other videos and remember which were playing
      pausedByHover = pauseOthers(video);
    }
    function hideOverlay(){
      if(!overlay) return;
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden','true');
      // resume those that were playing
      resumeList(pausedByHover);
      pausedByHover = [];
    }

    wrapper.addEventListener('mouseenter', ()=>{
      // start timer
      hoverTimer = setTimeout(showOverlay, HOVER_DELAY);
    }, {passive:true});
    wrapper.addEventListener('mouseleave', ()=>{
      if(hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = null;
      hideOverlay();
    }, {passive:true});

    // Also handle focus/blur for keyboard users
    wrapper.addEventListener('focusin', ()=>{
      hoverTimer = setTimeout(showOverlay, HOVER_DELAY);
    });
    wrapper.addEventListener('focusout', ()=>{
      if(hoverTimer) clearTimeout(hoverTimer);
      hideOverlay();
    });

    // click on CTA or wrapper to open modal
    const openHandler = (e)=>{
      e.preventDefault();
      // clean overlay timers and hide overlay immediately
      if(hoverTimer) clearTimeout(hoverTimer);
      hideOverlay();
      openModalFor(video);
    };
    if(cta) cta.addEventListener('click', openHandler);
    // also allow clicking the video area itself — but only after the overlay is visible
    wrapper.addEventListener('click', (e)=>{
      // CTA click is handled separately
      if(e.target.closest('.cta')) return;
      // only open modal if overlay was shown (user hovered long enough)
      if(!overlay || !overlay.classList.contains('show')) return;
      // avoid triggering when clicking controls inside video; allow click when overlay visible
      if(e.target.closest('video') || e.target === wrapper){
        openHandler(e);
      }
    });
  });

})();