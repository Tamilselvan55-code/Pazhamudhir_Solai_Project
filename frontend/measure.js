(function() {
  const card = document.querySelector('.group'); // ProductCard root
  if (!card) return "No ProductCard found";
  
  const computed = window.getComputedStyle(card);
  const imgContainer = card.children[0];
  const infoContainer = card.children[1];
  
  const getMetrics = (el) => {
    if(!el) return null;
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      padding: style.padding,
      minHeight: style.minHeight,
      display: style.display,
      flexDirection: style.flexDirection,
      justifyContent: style.justifyContent
    };
  };

  const metrics = {
    card: getMetrics(card),
    imageContainer: getMetrics(imgContainer),
    infoContainer: getMetrics(infoContainer),
    addBtn: getMetrics(document.querySelector('.group button:not(.rounded-full)')) // The ADD button
  };
  
  return JSON.stringify(metrics, null, 2);
})();
