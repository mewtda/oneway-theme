(() => {
  const parser = new DOMParser();
  const parseHTML = (html) => parser.parseFromString(html, 'text/html');

  const lockScroll = (lock) => document.body.classList.toggle('is-locked', lock);

  class AnnouncementSlider extends HTMLElement {
    connectedCallback() {
      this.messages = [...this.querySelectorAll('.announcement-bar__message')];
      if (this.messages.length < 2) return;
      this.index = 0;
      const speed = Number(this.dataset.speed || 5) * 1000;
      this.timer = setInterval(() => this.next(), speed);
    }

    disconnectedCallback() {
      clearInterval(this.timer);
    }

    next() {
      this.messages[this.index].classList.remove('is-active');
      this.index = (this.index + 1) % this.messages.length;
      this.messages[this.index].classList.add('is-active');
    }
  }
  customElements.define('announcement-slider', AnnouncementSlider);

  class SlideShow extends HTMLElement {
    connectedCallback() {
      this.slides = [...this.querySelectorAll('.slideshow__slide')];
      this.counter = this.querySelector('[data-slide-current]');
      this.index = 0;
      if (this.slides.length < 2) return;

      this.querySelector('[data-slide-prev]')?.addEventListener('click', () => this.go(this.index - 1, true));
      this.querySelector('[data-slide-next]')?.addEventListener('click', () => this.go(this.index + 1, true));

      let startX = 0;
      this.addEventListener('touchstart', (event) => (startX = event.touches[0].clientX), { passive: true });
      this.addEventListener('touchend', (event) => {
        const delta = event.changedTouches[0].clientX - startX;
        if (Math.abs(delta) > 50) this.go(this.index + (delta < 0 ? 1 : -1), true);
      });

      if (this.dataset.autoplay === 'true' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.play();
        this.addEventListener('mouseenter', () => this.stop());
        this.addEventListener('mouseleave', () => this.play());
      }

      document.addEventListener('shopify:block:select', (event) => {
        const position = this.slides.indexOf(event.target);
        if (position > -1) {
          this.stop();
          this.go(position);
        }
      });
    }

    disconnectedCallback() {
      this.stop();
    }

    play() {
      this.stop();
      this.timer = setInterval(() => this.go(this.index + 1), Number(this.dataset.speed || 6) * 1000);
    }

    stop() {
      clearInterval(this.timer);
    }

    go(position, manual = false) {
      const total = this.slides.length;
      this.slides[this.index].classList.remove('is-active');
      this.index = (position + total) % total;
      this.slides[this.index].classList.add('is-active');
      if (this.counter) this.counter.textContent = this.index + 1;
      if (manual && this.dataset.autoplay === 'true') this.play();
    }
  }
  customElements.define('slide-show', SlideShow);

  class CardGallery extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-track]');
      this.prev = this.querySelector('[data-gallery-prev]');
      this.next = this.querySelector('[data-gallery-next]');
      this.dots = [...this.querySelectorAll('.product-card__dot')];
      this.observeVideos();
      if (!this.track || !this.next) return;

      this.prev.addEventListener('click', () => this.go(-1));
      this.next.addEventListener('click', () => this.go(1));
      this.track.addEventListener('scroll', () => this.update(), { passive: true });
    }

    observeVideos() {
      const videos = this.querySelectorAll('video');
      if (!videos.length) return;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.play().catch(() => {});
          else entry.target.pause();
        });
      });
      videos.forEach((video) => observer.observe(video));
    }

    get index() {
      return Math.round(this.track.scrollLeft / this.track.clientWidth);
    }

    go(direction) {
      this.track.scrollTo({ left: (this.index + direction) * this.track.clientWidth, behavior: 'smooth' });
    }

    update() {
      const index = this.index;
      const last = this.track.children.length - 1;
      this.dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      this.prev.disabled = index <= 0;
      this.next.disabled = index >= last;
    }
  }
  customElements.define('card-gallery', CardGallery);

  const setupHeader = () => {
    const menu = document.getElementById('MobileMenu');
    const menuToggle = document.querySelector('[data-menu-open]');
    const search = document.getElementById('SearchDrawer');
    const searchToggle = document.querySelector('[data-search-open]');

    const toggleMenu = (open) => {
      if (!menu) return;
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      menuToggle?.setAttribute('aria-expanded', String(open));
      lockScroll(open);
      if (open) menu.querySelector('[data-menu-close]:not(.mobile-menu__overlay)')?.focus();
    };

    const toggleSearch = (open) => {
      if (!search) return;
      search.hidden = !open;
      searchToggle?.setAttribute('aria-expanded', String(open));
      if (open) search.querySelector('input[type="search"]')?.focus();
    };

    menuToggle?.addEventListener('click', () => toggleMenu(true));
    menu?.querySelectorAll('[data-menu-close]').forEach((el) => el.addEventListener('click', () => toggleMenu(false)));
    searchToggle?.addEventListener('click', () => toggleSearch(search?.hidden));
    document.querySelector('[data-search-close]')?.addEventListener('click', () => toggleSearch(false));

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      toggleMenu(false);
      toggleSearch(false);
      window.theme.cart?.close();
      document.querySelectorAll('[data-drawer].is-open').forEach((drawer) => toggleDrawer(drawer, false));
    });
  };

  class CartDrawer extends HTMLElement {
    connectedCallback() {
      window.theme.cart = this;
      this.addEventListener('click', (event) => {
        if (event.target.closest('[data-cart-close]')) this.close();
      });
      document.addEventListener('click', (event) => {
        const opener = event.target.closest('[data-cart-open]');
        if (opener && this.isDrawer) {
          event.preventDefault();
          this.open();
        }
      });
      document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-cart-qty]');
        if (button) this.changeLine(Number(button.dataset.line), Number(button.dataset.cartQty));
      });
    }

    get isDrawer() {
      return this.dataset.cartType === 'drawer' && window.theme.templateName !== 'cart';
    }

    open() {
      this.classList.add('is-open');
      this.setAttribute('aria-hidden', 'false');
      lockScroll(true);
      this.querySelector('.cart-drawer__header [data-cart-close]')?.focus();
    }

    close() {
      if (!this.classList.contains('is-open')) return;
      this.classList.remove('is-open');
      this.setAttribute('aria-hidden', 'true');
      lockScroll(false);
    }

    sectionIds() {
      const ids = ['cart-drawer'];
      const mainCart = document.querySelector('[data-main-cart]');
      if (mainCart) ids.push(mainCart.dataset.sectionId);
      return ids;
    }

    async changeLine(line, quantity) {
      const mainCart = document.querySelector('[data-main-cart]');
      this.classList.add('is-loading');
      mainCart?.classList.add('is-loading');
      try {
        const response = await fetch(`${window.theme.routes.cartChange}.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ line, quantity, sections: this.sectionIds(), sections_url: window.location.pathname })
        });
        const cart = await response.json();
        if (!response.ok) throw new Error(cart.description || cart.message);
        this.render(cart.sections, cart.item_count);
      } catch (error) {
        alert(error.message || window.theme.strings.error);
      } finally {
        this.classList.remove('is-loading');
        mainCart?.classList.remove('is-loading');
      }
    }

    render(sections, itemCount) {
      if (!sections) return;
      if (sections['cart-drawer']) {
        const fresh = parseHTML(sections['cart-drawer']).querySelector('.cart-drawer__panel');
        const current = this.querySelector('.cart-drawer__panel');
        if (fresh && current) current.innerHTML = fresh.innerHTML;
      }
      const mainCart = document.querySelector('[data-main-cart]');
      if (mainCart && sections[mainCart.dataset.sectionId]) {
        const fresh = parseHTML(sections[mainCart.dataset.sectionId]).querySelector('[data-main-cart]');
        if (fresh) mainCart.innerHTML = fresh.innerHTML;
      }
      if (typeof itemCount === 'number') updateCartCount(itemCount);
    }
  }
  customElements.define('cart-drawer', CartDrawer);

  const updateCartCount = (count) => {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = count;
      el.hidden = count === 0;
    });
  };

  const setupProductForms = () => {
    document.addEventListener('submit', async (event) => {
      const form = event.target.closest('[data-product-form]');
      if (!form) return;
      event.preventDefault();

      const button = event.submitter || form.querySelector('[data-add-to-cart]');
      const errorEl = form.querySelector('[data-form-error]');
      const cart = window.theme.cart;
      button?.classList.add('is-loading');
      if (errorEl) errorEl.hidden = true;

      const formData = new FormData(form, event.submitter);
      if (cart?.isDrawer) {
        formData.append('sections', cart.sectionIds().join(','));
        formData.append('sections_url', window.location.pathname);
      }

      try {
        const response = await fetch(`${window.theme.routes.cartAdd}.js`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: formData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.description || data.message);

        if (!cart?.isDrawer) {
          window.location.href = window.theme.routes.cart;
          return;
        }
        const cartResponse = await fetch(`${window.theme.routes.cart}.js`, { headers: { Accept: 'application/json' } });
        const cartData = await cartResponse.json();
        cart.render(data.sections, cartData.item_count);
        cart.open();
      } catch (error) {
        if (errorEl) {
          errorEl.textContent = error.message || window.theme.strings.error;
          errorEl.hidden = false;
        }
      } finally {
        button?.classList.remove('is-loading');
      }
    });

    document.addEventListener('click', (event) => {
      const minus = event.target.closest('[data-qty-minus]');
      const plus = event.target.closest('[data-qty-plus]');
      if (!minus && !plus) return;
      const input = (minus || plus).parentElement.querySelector('input');
      const value = Number(input.value) || 1;
      input.value = Math.max(1, value + (plus ? 1 : -1));
    });
  };

  class VariantPicker extends HTMLElement {
    connectedCallback() {
      this.addEventListener('change', (event) => this.onChange(event));
    }

    async onChange(event) {
      const fieldset = event.target.closest('fieldset');
      const label = fieldset?.querySelector('[data-option-value]');
      if (label) label.textContent = event.target.value;

      const optionValueIds = [...this.querySelectorAll('input:checked')].map((input) => input.dataset.optionValueId);
      const sectionId = this.dataset.sectionId;
      const section = this.closest('[data-section-id]');
      const url = `${this.dataset.url}?option_values=${optionValueIds.join(',')}&section_id=${sectionId}`;

      section?.querySelector('[data-add-to-cart]')?.classList.add('is-loading');
      try {
        const response = await fetch(url);
        const html = parseHTML(await response.text());

        ['[data-product-price]', '[data-product-buy]', '[data-sticky-bar]'].forEach((selector) => {
          const fresh = html.querySelector(selector);
          const current = section?.querySelector(selector);
          if (fresh && current) current.innerHTML = fresh.innerHTML;
        });

        const freshPicker = html.querySelector('variant-picker');
        if (freshPicker) {
          freshPicker.querySelectorAll('.variant-option__pill').forEach((pill, index) => {
            const currentPill = this.querySelectorAll('.variant-option__pill')[index];
            currentPill?.classList.toggle('is-unavailable', pill.classList.contains('is-unavailable'));
          });
        }

        const variantId = html.querySelector('[data-variant-id]')?.value;
        if (variantId) {
          const params = new URLSearchParams(window.location.search);
          params.set('variant', variantId);
          window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
        }

        const currentMedia = html.querySelector('.product__media-item.is-current');
        if (currentMedia) {
          const target = section?.querySelector(`[data-media-id="${currentMedia.dataset.mediaId}"]`);
          if (target) {
            const list = target.parentElement;
            if (window.matchMedia('(min-width: 990px)').matches) {
              if (target.hasAttribute('data-video')) return;
              const videos = list.querySelectorAll('[data-video]');
              if (videos.length) videos[videos.length - 1].after(target);
              else list.prepend(target);
            } else {
              list.scrollTo({ left: target.offsetLeft - list.offsetLeft, behavior: 'smooth' });
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
  }
  customElements.define('variant-picker', VariantPicker);

  const setupCollectionFilters = () => {
    const form = document.querySelector('[data-collection-filters]');
    if (!form) return;
    form.addEventListener('change', () => {
      const params = new URLSearchParams();
      new FormData(form).forEach((value, key) => {
        if (value !== '') params.append(key, value);
      });
      window.location.search = params.toString();
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      form.dispatchEvent(new Event('change'));
    });
  };

  const setupShare = () => {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-share]');
      if (!button) return;
      const { url, title } = button.dataset;
      if (navigator.share) {
        navigator.share({ url, title }).catch(() => {});
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        const original = button.textContent;
        button.textContent = '✓';
        setTimeout(() => (button.textContent = original), 1500);
      }
    });
  };

  const setupAddresses = () => {
    document.querySelectorAll('[data-country-select]').forEach((countrySelect) => {
      const provinceSelect = document.getElementById(countrySelect.dataset.provinceTarget);
      if (countrySelect.dataset.default) countrySelect.value = countrySelect.dataset.default;

      const updateProvinces = () => {
        const option = countrySelect.options[countrySelect.selectedIndex];
        const provinces = option ? JSON.parse(option.dataset.provinces || '[]') : [];
        provinceSelect.innerHTML = '';
        provinceSelect.closest('.field').hidden = provinces.length === 0;
        provinces.forEach(([value, label]) => provinceSelect.add(new Option(label, value)));
        if (provinceSelect.dataset.default) provinceSelect.value = provinceSelect.dataset.default;
      };

      countrySelect.addEventListener('change', () => {
        provinceSelect.dataset.default = '';
        updateProvinces();
      });
      updateProvinces();
    });

    document.querySelectorAll('form[data-confirm]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        if (!confirm(form.dataset.confirm)) event.preventDefault();
      });
    });
  };

  const setupLogin = () => {
    const recover = document.getElementById('RecoverPassword');
    const login = document.getElementById('CustomerLogin');
    if (!recover || !login) return;
    const show = (showRecover) => {
      recover.hidden = !showRecover;
      login.hidden = showRecover;
    };
    if (window.location.hash === '#recover' || recover.querySelector('.form-message--success')) show(true);
    document.querySelectorAll('[data-toggle-recover]').forEach((link) =>
      link.addEventListener('click', (event) => {
        event.preventDefault();
        show(recover.hidden);
      })
    );
  };

  /* ---------- Gavetas genéricas (filtros, guia de tamanhos) ---------- */
  let drawerOpener = null;
  const toggleDrawer = (drawer, open) => {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    document.querySelectorAll(`[data-drawer-open="${drawer.id}"]`).forEach((el) => el.setAttribute('aria-expanded', String(open)));
    lockScroll(open);
    if (open) {
      drawer.querySelector('.drawer__header [data-drawer-close]')?.focus();
    } else if (drawerOpener) {
      drawerOpener.focus();
      drawerOpener = null;
    }
  };
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-drawer-open]');
    if (opener) {
      drawerOpener = opener;
      toggleDrawer(document.getElementById(opener.dataset.drawerOpen), true);
      return;
    }
    const closer = event.target.closest('[data-drawer-close]');
    if (closer) toggleDrawer(closer.closest('[data-drawer]'), false);
  });

  /* ---------- Memória de rolagem ----------
     Guarda o conteúdo carregado (cards extras) e a posição ao abrir um produto,
     para restaurar quando a cliente volta pelo botão "voltar". */
  const navigationType = performance.getEntriesByType('navigation')[0]?.type;
  const ScrollMemory = {
    read(key) {
      try {
        const data = JSON.parse(sessionStorage.getItem(`ow:${key}`) || 'null');
        if (!data || Date.now() - data.time > 30 * 60 * 1000) return null;
        return data;
      } catch (error) {
        return null;
      }
    },
    write(key, data) {
      try {
        sessionStorage.setItem(`ow:${key}`, JSON.stringify({ ...data, time: Date.now() }));
      } catch (error) {
        /* sessionStorage cheio ou bloqueado: segue sem memória */
      }
    },
    shouldRestore() {
      return navigationType === 'back_forward';
    },
    restoreScroll(y) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      const go = () => window.scrollTo(0, y);
      requestAnimationFrame(() => {
        go();
        window.addEventListener('load', go, { once: true });
        setTimeout(go, 350);
      });
    }
  };
  window.addEventListener('pagehide', () => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
  });

  const onIntersect = (target, callback, rootMargin = '600px 0px') => {
    if (!target || !('IntersectionObserver' in window)) return null;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && callback()), { rootMargin });
    observer.observe(target);
    return observer;
  };

  const sentinelNearViewport = (sentinel) =>
    sentinel && sentinel.isConnected && sentinel.getBoundingClientRect().top < window.innerHeight + 600;

  /* ---------- Grade da coleção: carregar mais / rolagem contínua ---------- */
  class InfiniteGrid extends HTMLElement {
    connectedCallback() {
      this.items = this.querySelector('[data-grid-items]');
      this.button = this.querySelector('[data-load-more]');
      this.count = this.querySelector('[data-load-more-count]');
      this.nextUrl = this.dataset.nextUrl;
      this.key = this.dataset.memoryKey + window.location.search;
      this.loading = false;

      if (ScrollMemory.shouldRestore()) this.restore();

      /* Carregamento sempre infinito: o link fica só como alternativa sem JavaScript */
      this.button?.remove();
      this.button = null;
      this.sentinel = this.querySelector('[data-sentinel]');
      this.observer = onIntersect(this.sentinel, () => this.loadNext());
      this.addEventListener('click', (event) => {
        if (event.target.closest('a[href]')) this.save();
      });
    }

    disconnectedCallback() {
      this.observer?.disconnect();
    }

    save() {
      ScrollMemory.write(this.key, {
        html: this.items.innerHTML,
        next: this.nextUrl || '',
        count: this.count?.textContent || '',
        y: window.scrollY
      });
    }

    restore() {
      const data = ScrollMemory.read(this.key);
      if (!data) return;
      this.items.innerHTML = data.html;
      this.nextUrl = data.next;
      if (this.count && data.count) this.count.textContent = data.count;
      this.updateButton();
      ScrollMemory.restoreScroll(data.y);
    }

    updateButton() {
      if (!this.nextUrl) {
        this.button?.remove();
        this.observer?.disconnect();
      } else if (this.button) {
        this.button.href = this.nextUrl;
      }
    }

    async loadNext() {
      if (this.loading || !this.nextUrl) return;
      this.loading = true;
      this.classList.add('is-loading');
      try {
        const url = new URL(this.nextUrl, window.location.origin);
        url.searchParams.set('section_id', this.dataset.sectionId);
        const html = parseHTML(await (await fetch(url)).text());
        const grid = html.querySelector('infinite-grid');
        const fresh = grid?.querySelector('[data-grid-items]');
        if (fresh) this.items.append(...fresh.children);
        this.nextUrl = grid?.dataset.nextUrl || '';
        const freshCount = grid?.querySelector('[data-load-more-count]');
        if (this.count && freshCount) this.count.textContent = freshCount.textContent;
        this.updateButton();
      } catch (error) {
        console.error(error);
        this.nextUrl = '';
      } finally {
        this.loading = false;
        this.classList.remove('is-loading');
      }
      if (sentinelNearViewport(this.sentinel)) this.loadNext();
    }
  }
  customElements.define('infinite-grid', InfiniteGrid);

  /* ---------- Vitrine contínua de recomendações (página de produto) ---------- */
  class ProductFeed extends HTMLElement {
    connectedCallback() {
      this.grid = this.querySelector('[data-feed-grid]');
      this.skeleton = this.querySelector('[data-feed-skeleton]');
      this.sentinel = this.querySelector('[data-sentinel]');
      this.sources = (this.dataset.sources || '').split('|').filter(Boolean);
      this.maxItems = Number(this.dataset.maxItems || 60);
      this.key = this.dataset.memoryKey;
      this.state = { source: 0, page: 1, loads: 0, seen: (this.dataset.exclude || '').split(',').filter(Boolean) };
      this.loading = false;

      if (ScrollMemory.shouldRestore() && this.restore()) {
        /* conteúdo restaurado */
      } else {
        onIntersect(this, () => this.state.loads === 0 && this.load(), '400px 0px');
      }

      this.observer = onIntersect(this.sentinel, () => {
        if (this.state.loads > 0) this.load();
      });
      document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href]');
        if (link && this.grid.children.length) this.save();
      });
    }

    disconnectedCallback() {
      this.observer?.disconnect();
    }

    get done() {
      return this.state.source >= this.sources.length || this.grid.children.length >= this.maxItems;
    }

    save() {
      ScrollMemory.write(this.key, { html: this.grid.innerHTML, state: this.state, y: window.scrollY });
    }

    restore() {
      const data = ScrollMemory.read(this.key);
      if (!data || !data.html) return false;
      this.grid.innerHTML = data.html;
      this.state = data.state;
      this.skeleton?.remove();
      ScrollMemory.restoreScroll(data.y);
      return true;
    }

    sourceUrl() {
      const source = this.sources[this.state.source];
      if (!source.startsWith('collection:')) return source;
      const url = new URL(source.replace('collection:', ''), window.location.origin);
      url.searchParams.set('section_id', this.dataset.collectionSection);
      url.searchParams.set('page', this.state.page);
      return url.toString();
    }

    advance(nextPage) {
      if (nextPage) {
        this.state.page = Number(nextPage);
      } else {
        this.state.source += 1;
        this.state.page = 1;
      }
    }

    async fetchBatch() {
      const response = await fetch(this.sourceUrl());
      if (!response.ok) return { items: [], next: '' };
      const html = parseHTML(await response.text());
      const wrapper = html.querySelector('[data-feed-items]');
      return { items: [...(wrapper?.querySelectorAll('[data-feed-item]') || [])], next: wrapper?.dataset.nextPage || '' };
    }

    async load() {
      if (this.loading || this.done) return;
      this.loading = true;
      this.classList.add('is-loading');
      const target = Math.min(this.grid.children.length + 8, this.maxItems);

      try {
        while (!this.done && this.grid.children.length < target) {
          const { items, next } = await this.fetchBatch();
          const fresh = items.filter((item) => !this.state.seen.includes(item.dataset.productId));
          fresh.slice(0, this.maxItems - this.grid.children.length).forEach((item) => {
            this.state.seen.push(item.dataset.productId);
            this.grid.append(item);
          });
          this.advance(next);
        }
      } catch (error) {
        console.error(error);
        this.state.source = this.sources.length;
      } finally {
        this.state.loads += 1;
        this.loading = false;
        this.skeleton?.remove();
        this.skeleton = null;
        this.classList.remove('is-loading');
        if (!this.grid.children.length) this.closest('.feed')?.setAttribute('hidden', '');
      }
      if (!this.done && sentinelNearViewport(this.sentinel)) this.load();
    }
  }
  customElements.define('product-feed', ProductFeed);

  /* ---------- Galeria do produto: indicador no celular ---------- */
  class MediaGallery extends HTMLElement {
    connectedCallback() {
      const gallery = this.parentElement;
      this.dots = [...gallery.querySelectorAll('.product__media-dot')];
      this.thumbs = [...gallery.querySelectorAll('[data-thumb-index]')];
      this.thumbList = gallery.querySelector('.product__thumbs');
      if (!this.dots.length && !this.thumbs.length) return;

      this.addEventListener('scroll', () => this.update(), { passive: true });
      this.thumbs.forEach((thumb) => {
        thumb.addEventListener('click', () => {
          const index = Number(thumb.dataset.thumbIndex);
          this.scrollTo({ left: index * this.clientWidth, behavior: 'smooth' });
        });
      });
    }

    update() {
      const index = Math.round(this.scrollLeft / this.clientWidth);
      if (index === this.current) return;
      this.current = index;
      this.dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      this.thumbs.forEach((thumb, i) => {
        const active = i === index;
        thumb.classList.toggle('is-active', active);
        if (active) {
          thumb.setAttribute('aria-current', 'true');
          const list = this.thumbList;
          const left = thumb.offsetLeft - list.offsetLeft;
          if (left < list.scrollLeft || left + thumb.offsetWidth > list.scrollLeft + list.clientWidth) {
            list.scrollTo({ left: left - 8, behavior: 'smooth' });
          }
        } else {
          thumb.removeAttribute('aria-current');
        }
      });
    }
  }
  customElements.define('media-gallery', MediaGallery);

  /* ---------- Barra de compra fixa ---------- */
  class StickyBuyBar extends HTMLElement {
    connectedCallback() {
      const section = this.closest('[data-section-id]');
      const target = section?.querySelector('[data-product-buy]');
      if (!target || !('IntersectionObserver' in window)) return;
      this.observer = new IntersectionObserver(([entry]) => {
        const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        this.classList.toggle('is-visible', show);
        this.setAttribute('aria-hidden', String(!show));
        document.body.classList.toggle('has-sticky-buy', show);
      });
      this.observer.observe(target);
    }

    disconnectedCallback() {
      this.observer?.disconnect();
      document.body.classList.remove('has-sticky-buy');
    }
  }
  customElements.define('sticky-buy-bar', StickyBuyBar);

  /* ---------- Cabeçalho: altura, transparência e blur ao rolar ---------- */
  const setupHeaderState = () => {
    const header = document.querySelector('[data-header]');
    if (!header) return;
    const setHeight = () => document.documentElement.style.setProperty('--header-total', `${header.offsetHeight}px`);
    setHeight();
    if ('ResizeObserver' in window) new ResizeObserver(setHeight).observe(header);

    const overlay = header.classList.contains('site-header--overlay');
    let ticking = false;
    const update = () => {
      ticking = false;
      const scrolled = window.scrollY > 8;
      header.classList.toggle('is-scrolled', scrolled);
      if (overlay) header.classList.toggle('is-transparent', !scrolled);
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  };

  /* ---------- Zoom das fotos do produto ----------
     Abre em tela cheia; toque/clique amplia no ponto tocado (2,5x).
     Ampliada: arrastar/rolar move a foto no celular, o mouse move no desktop. */
  class ProductZoom extends HTMLElement {
    connectedCallback() {
      this.track = this.querySelector('[data-zoom-track]');
      this.slides = [...this.querySelectorAll('[data-zoom-slide]')];
      this.current = this.querySelector('[data-zoom-current]');
      this.section = this.closest('[data-section-id]');
      this.scale = 2.5;

      this.section?.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-zoom-open]');
        if (!trigger) return;
        this.opener = trigger;
        this.open(trigger.dataset.zoomOpen);
      });
      this.querySelector('[data-zoom-close]').addEventListener('click', () => this.close());
      this.querySelector('[data-zoom-prev]')?.addEventListener('click', () => this.go(this.index - 1));
      this.querySelector('[data-zoom-next]')?.addEventListener('click', () => this.go(this.index + 1));
      this.track.addEventListener('scroll', () => this.updateCounter(), { passive: true });

      this.slides.forEach((slide) => {
        let start = null;
        slide.addEventListener('pointerdown', (event) => (start = { x: event.clientX, y: event.clientY }));
        slide.addEventListener('click', (event) => {
          const moved = start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8;
          if (!moved) this.toggleZoom(slide, event);
        });
        slide.addEventListener('mousemove', (event) => {
          if (!slide.classList.contains('is-zoomed') || !window.matchMedia('(hover: hover)').matches) return;
          const rect = slide.getBoundingClientRect();
          slide.scrollLeft = ((event.clientX - rect.left) / rect.width) * (slide.scrollWidth - rect.width);
          slide.scrollTop = ((event.clientY - rect.top) / rect.height) * (slide.scrollHeight - rect.height);
        });
      });

      this.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') this.close();
        if (event.key === 'ArrowRight') this.go(this.index + 1);
        if (event.key === 'ArrowLeft') this.go(this.index - 1);
      });
    }

    get index() {
      return Math.round(this.track.scrollLeft / this.track.clientWidth);
    }

    open(mediaId) {
      const position = Math.max(0, this.slides.findIndex((slide) => slide.dataset.mediaId === mediaId));
      this.slides.forEach((slide) => slide.querySelector('img')?.setAttribute('loading', 'eager'));
      this.classList.add('is-open');
      this.setAttribute('aria-hidden', 'false');
      lockScroll(true);
      this.track.scrollTo({ left: position * this.track.clientWidth, behavior: 'instant' });
      this.updateCounter();
      this.querySelector('[data-zoom-close]').focus();
    }

    close() {
      if (!this.classList.contains('is-open')) return;
      this.slides.forEach((slide) => this.unzoom(slide));
      this.classList.remove('is-open');
      this.setAttribute('aria-hidden', 'true');
      lockScroll(false);
      this.opener?.focus({ preventScroll: true });
    }

    go(position) {
      const target = Math.max(0, Math.min(this.slides.length - 1, position));
      this.slides.forEach((slide) => this.unzoom(slide));
      this.track.scrollTo({ left: target * this.track.clientWidth, behavior: 'smooth' });
    }

    updateCounter() {
      if (this.current) this.current.textContent = this.index + 1;
    }

    unzoom(slide) {
      if (!slide.classList.contains('is-zoomed')) return;
      slide.classList.remove('is-zoomed');
      slide.style.removeProperty('--zoom-width');
      this.classList.remove('is-zoomed');
      slide.scrollTo(0, 0);
    }

    toggleZoom(slide, event) {
      if (slide.classList.contains('is-zoomed')) {
        this.unzoom(slide);
        return;
      }
      const image = slide.querySelector('img');
      if (!image) return;
      const rect = image.getBoundingClientRect();
      const slideRect = slide.getBoundingClientRect();
      const ratioX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const ratioY = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));

      slide.style.setProperty('--zoom-width', `${rect.width * this.scale}px`);
      slide.classList.add('is-zoomed');
      this.classList.add('is-zoomed');
      requestAnimationFrame(() => {
        slide.scrollLeft = ratioX * slide.scrollWidth - (event.clientX - slideRect.left);
        slide.scrollTop = ratioY * slide.scrollHeight - (event.clientY - slideRect.top);
      });
    }
  }
  customElements.define('product-zoom', ProductZoom);

  /* ---------- Cores irmãs (mesmo nome, cor diferente no final) ----------
     Busca uma vez por nome base na busca da loja (seção color-siblings)
     e guarda o resultado na sessão. */
  const colorCache = new Map();
  const fetchColorSiblings = (base, searchUrl) => {
    if (colorCache.has(base)) return colorCache.get(base);
    const storageKey = `ow:colors:${base}`;
    let cached = null;
    try {
      cached = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    } catch (error) {
      cached = null;
    }
    const promise = cached
      ? Promise.resolve(cached)
      : fetch(`${searchUrl}?${new URLSearchParams({ q: base, type: 'product', 'options[fields]': 'title', section_id: 'color-siblings' })}`)
          .then((response) => (response.ok ? response.text() : ''))
          .then((html) => {
            const list = [...parseHTML(html).querySelectorAll('[data-sibling]')].map((el) => ({
              id: el.dataset.id,
              url: el.getAttribute('href'),
              color: el.dataset.color,
              hex: el.dataset.hex,
              available: el.dataset.available === 'true',
              image: el.dataset.image || ''
            }));
            try {
              sessionStorage.setItem(storageKey, JSON.stringify(list));
            } catch (error) {
              /* sem sessionStorage */
            }
            return list;
          })
          .catch(() => []);
    colorCache.set(base, promise);
    return promise;
  };

  class ColorSwatches extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready) return;
      this.dataset.ready = 'true';
      if (this.dataset.mode === 'card' && 'IntersectionObserver' in window) {
        this.observer = new IntersectionObserver(([entry]) => {
          if (!entry.isIntersecting) return;
          this.observer.disconnect();
          this.load();
        }, { rootMargin: '300px 0px' });
        this.observer.observe(this);
      } else {
        this.load();
      }
    }

    disconnectedCallback() {
      this.observer?.disconnect();
    }

    async load() {
      const siblings = await fetchColorSiblings(this.dataset.base, this.dataset.searchUrl);
      if (!siblings.some((item) => item.id === this.dataset.current) || siblings.length < 2) {
        if (this.dataset.mode === 'card') this.classList.add('is-single');
        return;
      }
      const current = siblings.find((item) => item.id === this.dataset.current);
      const others = siblings.filter((item) => item.id !== this.dataset.current);
      const ordered = [current, ...others];
      const limit = Number(this.dataset.limit || 5);
      const list = this.querySelector('[data-swatch-list]');

      list.innerHTML = '';
      ordered.slice(0, limit).forEach((item) => {
        const li = document.createElement('li');
        const isCurrent = item.id === this.dataset.current;
        const el = document.createElement(isCurrent ? 'span' : 'a');
        el.className = `color-swatch${isCurrent ? ' is-current' : ''}${item.available ? '' : ' is-unavailable'}`;
        el.style.setProperty('--swatch', item.hex);
        el.title = item.color;
        if (isCurrent) {
          el.setAttribute('aria-current', 'true');
        } else {
          el.href = item.url;
          if (item.image) el.dataset.image = item.image;
        }
        const label = document.createElement('span');
        label.className = 'visually-hidden';
        label.textContent = item.color;
        el.append(label);
        li.append(el);
        list.append(li);
      });
      if (ordered.length > limit) {
        const more = document.createElement('li');
        more.className = 'color-swatches__more';
        more.textContent = `+${ordered.length - limit}`;
        list.append(more);
      }
      this.classList.add('is-loaded');
      if (this.dataset.mode === 'card') this.setupPreview();
    }

    /* No desktop, passar o mouse na bolinha mostra a foto da outra cor no card */
    setupPreview() {
      if (!window.matchMedia('(hover: hover)').matches) return;
      const card = this.closest('.product-card');
      const image = card?.querySelector('.product-card__image');
      if (!image) return;
      const original = { src: image.getAttribute('src'), srcset: image.getAttribute('srcset') };
      this.querySelectorAll('a[data-image]').forEach((link) => {
        link.addEventListener('mouseenter', () => {
          image.removeAttribute('srcset');
          image.src = link.dataset.image;
        });
        link.addEventListener('mouseleave', () => {
          image.src = original.src;
          if (original.srcset) image.setAttribute('srcset', original.srcset);
        });
      });
    }
  }
  customElements.define('color-swatches', ColorSwatches);

  window.theme.templateName = document.body.className.match(/template-([\w-]+)/)?.[1];

  setupHeader();
  setupHeaderState();
  setupProductForms();
  setupCollectionFilters();
  setupShare();
  setupAddresses();
  setupLogin();
})();
