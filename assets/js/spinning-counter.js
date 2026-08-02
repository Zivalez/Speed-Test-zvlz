(function () {
  "use strict";

  let counterId = 0;
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  function ensureFilterLayer() {
    let layer = document.getElementById("zvlz-reel-filters");
    if (layer) return layer;
    layer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    layer.id = "zvlz-reel-filters";
    layer.setAttribute("aria-hidden", "true");
    layer.setAttribute("width", "0");
    layer.setAttribute("height", "0");
    layer.style.position = "absolute";
    layer.style.pointerEvents = "none";
    document.body.appendChild(layer);
    return layer;
  }

  function createVerticalBlur(id) {
    const layer = ensureFilterLayer();
    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.id = id;
    filter.setAttribute("x", "-20%");
    filter.setAttribute("y", "-60%");
    filter.setAttribute("width", "140%");
    filter.setAttribute("height", "220%");
    const blur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
    blur.setAttribute("in", "SourceGraphic");
    blur.setAttribute("stdDeviation", "0 3");
    filter.appendChild(blur);
    layer.appendChild(filter);
    return { filter, blur };
  }

  function plainCharacter(character) {
    const span = document.createElement("span");
    span.className = /\d/.test(character) ? "t-reel-static-digit" : "t-reel-separator";
    span.textContent = character;
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  function set(element, rawValue) {
    if (!element) return;
    const value = String(rawValue);
    const previous = String(element.dataset.reelValue || element.textContent || "0");
    element.dataset.reelValue = value;
    element.setAttribute("aria-label", value);
    element.replaceChildren();

    if (reduceMotion?.matches) {
      Array.from(value).forEach((character) => element.appendChild(plainCharacter(character)));
      return;
    }

    const computedSize = parseFloat(getComputedStyle(element).fontSize) || 38;
    element.style.setProperty("--reel-cell", `${computedSize}px`);
    const digitCount = Array.from(value).filter((character) => /\d/.test(character)).length;
    let digitIndex = 0;

    Array.from(value).forEach((character, characterIndex) => {
      if (!/\d/.test(character)) {
        element.appendChild(plainCharacter(character));
        return;
      }

      const targetDigit = Number(character);
      const priorCharacter = previous[characterIndex];
      const startDigit = /\d/.test(priorCharacter || "") ? Number(priorCharacter) : 0;
      const column = document.createElement("span");
      const strip = document.createElement("span");
      column.className = "t-reel-col";
      strip.className = "t-reel-strip";
      strip.setAttribute("aria-hidden", "true");

      const sequence = [startDigit];
      const spins = 2 + ((digitCount - digitIndex) % 2);
      for (let spin = 0; spin < spins; spin += 1) {
        for (let digit = 0; digit < 10; digit += 1) sequence.push(digit);
      }
      sequence.push(targetDigit);
      sequence.forEach((digit) => {
        const cell = document.createElement("span");
        cell.className = "t-reel-digit";
        cell.textContent = String(digit);
        strip.appendChild(cell);
      });

      const id = `zvlz-reel-blur-${counterId++}`;
      const { filter, blur } = createVerticalBlur(id);
      const delay = digitIndex * 90;
      const duration = 1400;
      strip.style.filter = `url(#${id})`;
      strip.style.transition = `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;
      column.appendChild(strip);
      element.appendChild(column);

      requestAnimationFrame(() => {
        strip.style.transform = `translateY(-${(sequence.length - 1) * computedSize}px)`;
        const startedAt = performance.now() + delay;
        const decayBlur = (now) => {
          const progress = Math.max(0, Math.min(1, (now - startedAt) / duration));
          blur.setAttribute("stdDeviation", `0 ${(3 * (1 - progress)).toFixed(2)}`);
          if (progress < 1) {
            requestAnimationFrame(decayBlur);
          } else {
            strip.style.filter = "none";
            filter.remove();
          }
        };
        requestAnimationFrame(decayBlur);
      });
      digitIndex += 1;
    });
  }

  window.zvlzCounter = { set };
})();
