function renderItem(dataItem) {
  const div = document.createElement("div");
  div.classList.add("row-content");
  div.textContent = dataItem;
  return div;
}
function loadMore(pageSize) {
  const data = [];
  for (let i = 0; i < pageSize; i++) {
    const dataItem = `I'm number ${this.data.length + i}`;
    data.push(dataItem);
  }
  return data;
}

const virtualScroller = new VirtualScroller({
  element: "#virtual-scroller",
  height: "100vh",
  rowHeight: 60,
  pageSize: 50,
  buffer: 10,
  renderItem,
  loadMore,
});
