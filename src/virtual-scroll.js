// Virtual scrolling implementation for large history lists
export class VirtualScroll {
  constructor(container, itemHeight = 40, visibleItems = 5) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.visibleItems = visibleItems;
    this.data = [];
    this.scrollTop = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    this._onScroll = null;
    this._raf = 0;
    
    this.init();
  }

  init() {
    this.container.style.height = `${this.visibleItems * this.itemHeight}px`;
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';
    
    // Create viewport
    this.viewport = document.createElement('div');
    this.viewport.style.position = 'relative';
    this.viewport.style.height = '100%';
    this.container.appendChild(this.viewport);
    
    // Create spacer for total height
    this.spacer = document.createElement('div');
    this.spacer.style.position = 'absolute';
    this.spacer.style.top = '0';
    this.spacer.style.left = '0';
    this.spacer.style.right = '0';
    this.viewport.appendChild(this.spacer);
    
    // Create visible items container
    this.itemsContainer = document.createElement('div');
    this.itemsContainer.style.position = 'absolute';
    this.itemsContainer.style.top = '0';
    this.itemsContainer.style.left = '0';
    this.itemsContainer.style.right = '0';
    this.viewport.appendChild(this.itemsContainer);
    
    this._onScroll = this.handleScroll.bind(this);
    this.container.addEventListener('scroll', this._onScroll, { passive: true });
  }

  setData(data) {
    this.data = data;
    this.updateSpacer();
    this.updateVisibleRange();
    this.render();
  }

  updateSpacer() {
    this.spacer.style.height = `${this.data.length * this.itemHeight}px`;
  }

  handleScroll() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this.scrollTop = this.container.scrollTop;
      this.updateVisibleRange();
      this.render();
    });
  }

  updateVisibleRange() {
    this.startIndex = Math.floor(this.scrollTop / this.itemHeight);
    this.endIndex = Math.min(
      this.startIndex + this.visibleItems + 1, // +1 for buffer
      this.data.length
    );
  }

  render() {
    // Clear existing items
    this.itemsContainer.innerHTML = '';
    
    // Create visible items
    for (let i = this.startIndex; i < this.endIndex; i++) {
      if (this.data[i]) {
        const item = this.createItem(this.data[i], i);
        item.style.position = 'absolute';
        item.style.top = `${i * this.itemHeight}px`;
        item.style.left = '0';
        item.style.right = '0';
        item.style.height = `${this.itemHeight}px`;
        this.itemsContainer.appendChild(item);
      }
    }
  }

  createItem(data, index) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <span>${new Date(data.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
      <span>${data.wpm} wpm</span>
      <span>${data.accuracy}%</span>
      <span>${data.errors} errs</span>
    `;
    return item;
  }

  destroy() {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = 0;
    }
    if (this._onScroll) this.container.removeEventListener('scroll', this._onScroll);
    this.container.innerHTML = '';
    this.viewport = null;
    this.itemsContainer = null;
    this.spacer = null;
  }
}