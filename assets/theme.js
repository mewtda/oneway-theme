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

      this.button?.addEventListener('click', (event) => {
        event.preventDefault();
        this.loadNext();
      });
      if (this.dataset.mode === 'infinite') {
        this.observer = onIntersect(this.querySelector('[data-sentinel]'), () => this.loadNext());
      }
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
      this.button?.classList.add('is-loading');
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
      } finally {
        this.loading = false;
        this.button?.classList.remove('is-loading');
      }
    }
  }
  customElements.define('infinite-grid', InfiniteGrid);

  /* ---------- Vitrine contínua de recomendações (página de produto) ---------- */
  class ProductFeed extends HTMLElement {
    connectedCallback() {
      this.grid = this.querySelector('[data-feed-grid]');
      this.skeleton = this.querySelector('[data-feed-skeleton]');
      this.button = this.querySelector('[data-feed-more]');
      this.sources = (this.dataset.sources || '').split('|').filter(Boolean);
      this.maxItems = Number(this.dataset.maxItems || 60);
      this.autoLoads = Number(this.dataset.autoLoads || 0);
      this.key = this.dataset.memoryKey;
      this.state = { source: 0, page: 1, loads: 0, seen: (this.dataset.exclude || '').split(',').filter(Boolean) };
      this.loading = false;

      if (ScrollMemory.shouldRestore() && this.restore()) {
        /* conteúdo restaurado */
      } else {
        onIntersect(this, () => this.state.loads === 0 && this.load(), '400px 0px');
      }

      this.button.addEventListener('click', () => this.load(true));
      this.observer = onIntersect(this.querySelector('[data-sentinel]'), () => {
        if (this.state.loads > 0 && this.state.loads < this.autoLoads) this.load();
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
      this.updateButton();
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

    async load(manual = false) {
      if (this.loading || this.done) return;
      this.loading = true;
      this.button.classList.add('is-loading');
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
        this.button.classList.remove('is-loading');
        if (!this.grid.children.length) this.closest('.feed')?.setAttribute('hidden', '');
        this.updateButton();
      }
      if (manual) this.grid.lastElementChild?.querySelector('a')?.focus({ preventScroll: true });
    }

    updateButton() {
      this.button.hidden = this.done || this.state.loads < this.autoLoads;
    }
  }
  customElements.define('product-feed', ProductFeed);

  /* ---------- Galeria do produto: indicador no celular ---------- */
  class MediaGallery extends HTMLElement {
    connectedCallback() {
      this.dots = [...(this.parentElement.querySelectorAll('.product__media-dot') || [])];
      if (!this.dots.length) return;
      this.addEventListener('scroll', () => {
        const index = Math.round(this.scrollLeft / this.clientWidth);
        this.dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
      }, { passive: true });
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

  window.theme.templateName = document.body.className.match(/template-([\w-]+)/)?.[1];

  setupHeader();
  setupProductForms();
  setupCollectionFilters();
  setupShare();
  setupAddresses();
  setupLogin();
})();
