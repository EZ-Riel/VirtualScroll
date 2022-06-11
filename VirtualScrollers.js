// 节流
function throttle(fn, wait) {
  let lastTime = 0;
  let timer;
  return function (...args) {
    function run() {
      const now = new Date().valueOf();
      if (now - lastTime > wait) {
        fn.apply(this, args);
        lastTime = now;
      }
    }
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(run, wait);
    run();
  };
}

class VirtualScroller {
  constructor({
    element,
    height,
    rowHeight,
    pageSize,
    buffer,
    renderItem,
    loadMore,
  }) {
    if (typeof element === "string") {
      this.scroller = document.querySelector(element);
    } else if (element instanceof HTMLElement) {
      this.scroller = element;
    }

    if (!this.scroller) {
      throw new Error("Invalid element");
    }

    if (!height || (typeof height !== "number" && typeof height !== "string")) {
      throw new Error("Invalid height value");
    }

    if (!rowHeight || typeof rowHeight !== "number") {
      throw new Error("rowHeight should be a number");
    }

    if (typeof renderItem !== "function") {
      throw new Error("renderItem is not a function");
    }

    if (typeof loadMore !== "function") {
      throw new Error("loadMore is not a function");
    }

    // 初始化实例对象
    this.height = height;
    this.rowHeight = rowHeight;
    this.pageSize =
      typeof pageSize === "number" && pageSize > 0 ? pageSize : 50;
    this.buffer = typeof buffer === "number" && buffer >= 0 ? buffer : 10;
    this.renderItem = renderItem;
    this.loadMore = loadMore;
    this.data = [];

    // 构造展示当前列
    const contentBox = document.createElement("div");
    this.contentBox = contentBox;
    this.scroller.append(contentBox);

    this.scroller.style.height =
      typeof height === "number" ? height + "px" : height;
    this._loadInitData();
    this.scroller.addEventListener("scroll", throttle(this._handleScroll, 150));
  }
  _topHiddenCount = 0; //初始时默认不隐藏,当滚动时,根据当前顶部可视化的index下标计算隐藏上面看不见的数据,并用padding-top代替覆盖
  _bottomHiddenCount = 0;
  _scrollTop = 0; //初始化默认当前数据项是否处于顶部
  _paddingTop = 0;
  _paddingBottom = 0;
  _lastVisibleItemIndex = 0;
  // 初始加载数据
  _loadInitData = () => {
    // const newData = this.loadMore(this.pageSize);
    // this.data.push(...newData);
    // this._renderNewData(newData);

    /**
     * getBoundingClientRect用于获取某个元素相对于视窗的位置集合。
     * 集合中有
     * top:元素上边到视窗上边的距离;
     * right:元素右边到视窗左边的距离;
     * bottom：元素下边到视窗上边的距离;
     * left:元素左边到视窗左边的距离;
     * width:元素自身的宽
     * height:元素自身的高
     *  */
    const scrollerRect = this.scroller.getBoundingClientRect();
    // console.log(scrollerRect);
    // 向上取整,计算出填充元素至少需要的数据数量
    const minCount = Math.ceil(scrollerRect.height / this.rowHeight);
    const page = Math.ceil(minCount / this.pageSize);
    // console.log(minCount, page, page * this.pageSize);
    const newData = this.loadMore(page * this.pageSize);
    this.data.push(...newData);
    this._renderNewData(newData);
  };
  // 构造dom元素
  _renderRow = (item) => {
    const rowContent = this.renderItem(item);
    const row = document.createElement("div");
    row.style.height = this.rowHeight + "px";
    row.dataset.index = item;
    row.appendChild(rowContent);
    return row;
  };
  //渲染数据
  _renderNewData = (newData) => {
    // append() - 在被选元素的结尾插入内容;
    // prepend() - 在被选元素的开头插入内容;
    newData.forEach((item) => {
      this.contentBox.append(this._renderRow(item));
    });
  };
  // 滚动处理
  _handleScroll = (e) => {
    // clientHeight:当前可视化数据的总高度;scrollTop:当前可视化数据顶部距离整个内容盒子的顶部距离
    // scrollHeight:当前整个内容盒子的总高度;  scrollHeight = clientHeight + scrollTop
    // 因此: 当 csrollHeight - (scrollTop + clientHeight) 等于零时,证明滚动条已经换到底部
    const { clientHeight, scrollTop, scrollHeight } = e.target;
    // console.log(clientHeight, scrollTop, scrollHeight);
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
    // console.log(distanceToBottom);
    // 当接近最底部一行时, 加载新的数据;
    if (distanceToBottom < 40) {
      console.log("load more");
      const newData = this.loadMore(this.pageSize);
      this.data.push(...newData);
      // this._renderNewData(newData);
    }

    // direction:  1=>往下滚动  -1=>往上滚动
    const direction = scrollTop > this._scrollTop ? 1 : -1;
    this._scrollTop = scrollTop;
    // console.log("direction", direction);

    // console.log(this.scroller.scrollTop);
    this._toggleTopItems(direction);
    this._toggleBottomItems(direction);
    // console.log({
    //   direction,
    //   topHiddenCount: this.#topHiddenCount,
    //   lastVisibleItemIndex: this.#lastVisibleItemIndex,
    // });
  };
  // 计算出当前窗口可视化数据数组的下标
  _toggleTopItems = (direction) => {
    const { scrollTop } = this.scroller;
    // firstVisibleItemIndex:当前可视化的数据数组下标
    const firstVisibleItemIndex = Math.floor(scrollTop / this.rowHeight);
    // console.log("firstVisibleItemIndex", firstVisibleItemIndex);
    const firstExistingItemIndex = Math.max(
      0,
      firstVisibleItemIndex - this.buffer
    );
    console.log("firstExistingItemIndex: ", firstExistingItemIndex);
    // rows:整个可视化数据dom数组
    const rows = this.contentBox.children;
    // console.log(rows[0]);
    // 向下滚动时,删除最顶项,最后计算填充padding-top
    if (direction === 1) {
      for (let i = this._topHiddenCount; i < firstExistingItemIndex; i++) {
        // 每次只需删除盒子内容的第一个dom
        if (rows[0]) rows[0].remove();
      }
    }
    // 向上滚动时恢复顶部隐藏的数据;
    if (direction === -1) {
      for (let i = this._topHiddenCount - 1; i >= firstExistingItemIndex; i--) {
        const item = this.data[i];
        const row = this._renderRow(item);
        this.contentBox.prepend(row);
      }
    }
    this._topHiddenCount = firstExistingItemIndex;
    this._paddingTop = this._topHiddenCount * this.rowHeight;
    this.contentBox.style.paddingTop = this._paddingTop + "px";
  };
  _toggleBottomItems = (direction) => {
    const { scrollTop, clientHeight } = this.scroller;
    const lastVisibleItemIndex = Math.floor(
      (scrollTop + clientHeight) / this.rowHeight
    );
    this._lastVisibleItemIndex = lastVisibleItemIndex;
    // console.log("lastVisibleItemIndex", lastVisibleItemIndex);
    const lastExistingItemIndex = lastVisibleItemIndex + this.buffer;
    console.log("lastExistingItemIndex: ", lastExistingItemIndex);

    const rows = [...this.contentBox.children];

    // 向上滚动时,计算可视化内容底部当前下标,删除多余dom
    if (direction === -1) {
      for (let i = lastExistingItemIndex + 1; i < this.data.length; i++) {
        const row = rows[i - this._topHiddenCount];
        if (row) row.remove();
      }
    }
    // 向下滚动时,恢复隐藏的底部dom
    if (direction === 1) {
      for (
        let i = this._topHiddenCount + rows.length;
        i <= lastExistingItemIndex;
        i++
      ) {
        const item = this.data[i];
        if (!item) break;
        const row = this._renderRow(item);
        this.contentBox.append(row);
      }
    }
    this._bottomHiddenCount = Math.max(
      0,
      this.data.length -
        (this._topHiddenCount + this.contentBox.children.length) -
        this.buffer
    );
    // console.log(this._bottomHiddenCount);
    this._paddingBottom = this._bottomHiddenCount * this.rowHeight;
    this.contentBox.style.paddingBottom = this._paddingBottom + "px";
  };
}
