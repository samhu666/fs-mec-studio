// ===================== hero proximity scale grid (GSAP) =====================
// 在 hero 區塊鋪一層點陣，滑鼠靠近時該點會放大＋變亮，模擬感測格 / 藍圖網格的互動效果。
(function () {
  const hero = document.querySelector('.hero');
  const container = document.getElementById('proximityGrid');
  if (!hero || !container || typeof gsap === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  if (reduceMotion || noHover) return;

  const SPACING = 88;   // 點與點間距 (px)，越小密度越高、DOM 節點越多
  const RADIUS = 170;   // 滑鼠影響半徑 (px)
  const MAX_SCALE = 3.2;
  const BASE_OPACITY = .4;
  const MAX_OPACITY = 1;
  const REST_COLOR = '#9a9da3';   // 對應 --ink-faint，平常融入藍圖底色
  const ACTIVE_COLOR = '#f59e0b'; // CAD 選取常用的琥珀橘，跟冷色調藍圖形成對比

  let dots = [];
  let pointer = { x: -9999, y: -9999 };
  let active = false;

  function buildGrid() {
    dots.forEach((d) => gsap.killTweensOf(d.el));
    container.innerHTML = '';
    dots = [];

    const { width, height } = hero.getBoundingClientRect();
    const cols = Math.ceil(width / SPACING) + 1;
    const rows = Math.ceil(height / SPACING) + 1;
    const frag = document.createDocumentFragment();
    const positions = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * SPACING;
        const y = r * SPACING;
        const el = document.createElement('span');
        el.className = 'proximity-dot';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        frag.appendChild(el);
        positions.push({ el, x, y });
      }
    }

    // 一定要先把元素插入真正的頁面 DOM，quickTo 才能正確讀取初始值。
    container.appendChild(frag);

    dots = positions.map(({ el, x, y }) => {
      // quickTo 對 "scale" 縮寫、以及顏色類屬性（backgroundColor）的快速路徑都不支援
      // （分別會丟出 "not eligible for reset" 警告、或是直接不生效），
      // 縮放拆成 scaleX / scaleY；顏色則用 quickTo 平滑一個 0~1 的虛擬進度值，
      // 再自己用這個進度值算出顏色手動寫入 style，藉此保留 quickTo 的效能優勢。
      const colorState = { p: 0 };
      const progressTo = gsap.quickTo(colorState, 'p', {
        duration: .35,
        ease: 'power2.out',
        onUpdate: () => {
          el.style.backgroundColor = gsap.utils.interpolate(REST_COLOR, ACTIVE_COLOR, colorState.p);
        },
      });

      return {
        x, y, el,
        scaleXTo: gsap.quickTo(el, 'scaleX', { duration: .45, ease: 'power3.out' }),
        scaleYTo: gsap.quickTo(el, 'scaleY', { duration: .45, ease: 'power3.out' }),
        opacityTo: gsap.quickTo(el, 'opacity', { duration: .45, ease: 'power3.out' }),
        progressTo,
      };
    });
  }

  function updateDots() {
    for (const dot of dots) {
      const dx = pointer.x - dot.x;
      const dy = pointer.y - dot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const proximity = Math.max(0, 1 - dist / RADIUS); // 0..1
      const scale = 1 + proximity * (MAX_SCALE - 1);

      dot.scaleXTo(scale);
      dot.scaleYTo(scale);
      dot.opacityTo(BASE_OPACITY + proximity * (MAX_OPACITY - BASE_OPACITY));
      dot.progressTo(proximity);
    }
  }

  function onPointerMove(e) {
    const rect = hero.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
  }

  function startTicker() {
    if (active) return;
    active = true;
    gsap.ticker.add(updateDots);
  }

  function stopTicker() {
    if (!active) return;
    active = false;
    gsap.ticker.remove(updateDots);
    pointer.x = -9999;
    pointer.y = -9999;
    updateDots(); // 讓所有點放鬆回原本大小/透明度
  }

  buildGrid();
  hero.addEventListener('pointermove', onPointerMove);
  hero.addEventListener('pointerenter', startTicker);
  hero.addEventListener('pointerleave', stopTicker);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildGrid, 200);
  });
})();
