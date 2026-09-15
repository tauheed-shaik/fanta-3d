const frameCount = 300;
const framePath = (index) => `ezgif-frame-${String(index).padStart(3, "0")}.jpg`;
const canvas = document.querySelector("#scene");
const context = canvas.getContext("2d");
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);
const progress = document.querySelector("#progress");
const frameNumber = document.querySelector("#frameNumber");
const heroCopy = document.querySelector(".hero-copy");
const images = new Map();
let currentFrame = 1;
let requestedFrame = 1;
let renderQueued = false;

async function appendRemainingSections() {
  const response = await fetch("/code.html");
  if (!response.ok) throw new Error(`Unable to load website sections: ${response.status}`);

  const sourceMarkup = await response.text();
  const sourceDocument = new DOMParser().parseFromString(sourceMarkup, "text/html");
  const contentRoot = sourceDocument.querySelector("main > div");
  const footer = sourceDocument.querySelector("footer");
  const target = document.querySelector("#imported-content");
  if (!contentRoot || !target) return;

  const headAssets = [...sourceDocument.head.querySelectorAll("link[rel='stylesheet'], style, script")];
  for (const sourceAsset of headAssets) {
    const asset = document.createElement(sourceAsset.tagName.toLowerCase());
    for (const attribute of sourceAsset.attributes) asset.setAttribute(attribute.name, attribute.value);
    if (sourceAsset.tagName === "SCRIPT" && sourceAsset.src) {
      await new Promise((resolve) => {
        asset.onload = resolve;
        asset.onerror = resolve;
        document.head.append(asset);
      });
    } else {
      asset.textContent = sourceAsset.textContent;
      document.head.append(asset);
    }
  }

  const sectionRoot = contentRoot.cloneNode(true);
  sectionRoot.querySelector("section")?.remove();
  const embeddedScripts = [...sectionRoot.querySelectorAll("script")];
  embeddedScripts.forEach((script) => script.remove());
  target.append(sectionRoot);
  if (footer) target.append(footer.cloneNode(true));

  embeddedScripts.forEach((sourceScript) => {
    const script = document.createElement("script");
    script.textContent = sourceScript.textContent;
    document.body.append(script);
  });
  window.scrollTo(0, 0);
}

function loadFrame(index) {
  if (index < 1 || index > frameCount || images.has(index)) return images.get(index);
  const image = new Image();
  image.src = framePath(index);
  image.decoding = "async";
  images.set(index, image);
  return image;
}

function drawFrame(index) {
  const image = loadFrame(index);
  if (!image.complete || !image.naturalWidth) {
    image.addEventListener("load", () => drawFrame(index), { once: true });
    return;
  }

  const canvasRatio = canvas.width / canvas.height;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  let width = canvas.width;
  let height = canvas.height;
  let x = 0;
  let y = 0;

  if (imageRatio > canvasRatio) {
    width = canvas.height * imageRatio;
    x = (canvas.width - width) / 2;
  } else {
    height = canvas.width / imageRatio;
    y = (canvas.height - height) / 2;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, x, y, width, height);
  frameNumber.textContent = String(index).padStart(2, "0");
}

function resizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(canvas.clientWidth * ratio);
  canvas.height = Math.floor(canvas.clientHeight * ratio);
  drawFrame(currentFrame);
}

function queueFrame(index) {
  requestedFrame = Math.max(1, Math.min(frameCount, index));
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    currentFrame = requestedFrame;
    drawFrame(currentFrame);
    for (let offset = 1; offset <= 4; offset += 1) {
      loadFrame(currentFrame + offset);
      loadFrame(currentFrame - offset);
    }
    renderQueued = false;
  });
}

function updateFromScroll() {
  const sequence = document.querySelector(".sequence");
  const maxScroll = sequence.offsetHeight - window.innerHeight;
  const amount = Math.max(0, Math.min(1, window.scrollY / maxScroll));
  const nextFrame = Math.round(amount * (frameCount - 1)) + 1;
  progress.style.width = `${amount * 100}%`;
  const fadeAmount = Math.max(0, Math.min(1, (amount - 0.3) / 0.08));
  heroCopy.style.opacity = String(1 - fadeAmount);
  heroCopy.style.transform = `translateY(calc(-50% - ${fadeAmount * 18}px))`;
  queueFrame(nextFrame);
}

loadFrame(1);
loadFrame(2);
resizeCanvas();
window.addEventListener("resize", resizeCanvas, { passive: true });
window.addEventListener("scroll", updateFromScroll, { passive: true });
updateFromScroll();
appendRemainingSections().catch((error) => console.error(error));
window.addEventListener("load", () => window.scrollTo(0, 0), { once: true });
