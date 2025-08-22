/* script.js — click-and-drag fixed, responsive 10x10 snap (coords 0..10) */

const CELL_COUNT = 20; // 20 intervals -> grid indices 0..20 map to logical coords -10..10
const ORIGIN = CELL_COUNT / 2; // 10

const grid = document.getElementById('grid');
const draggable = document.getElementById('draggable');
const tx = document.getElementById('tx');
const ty = document.getElementById('ty');
const cx = document.getElementById('cx');
const cy = document.getElementById('cy');
const checkBtn = document.getElementById('check-btn');
const newBtn = document.getElementById('new-btn');
const resetBtn = document.getElementById('reset-btn');

let target = { x: 0, y: 0 };
let dragging = false;
let activePointerId = null;

function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min }

function setNewTarget(){
  // target in logical coordinates -10..10
  target.x = randInt(-10, 10);
  target.y = randInt(-10, 10);
  tx.textContent = target.x;
  ty.textContent = target.y;
}

function setCurrentDisplay(gx, gy){
  // gx,gy are grid indices 0..CELL_COUNT; display logical coords (-10..10)
  cx.textContent = (gx - ORIGIN);
  cy.textContent = (gy - ORIGIN);
}

function clamp(v,a,b){ return Math.max(a, Math.min(b, v)) }

function getCellSize(){
  // return current bounding rect; keep CSS sizing unchanged to avoid layout shifts
  const rect = grid.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);
  // treat grid as square for calculations but don't mutate DOM here
  const squareRect = { left: rect.left, top: rect.top, width: size, height: size, right: rect.left + size, bottom: rect.top + size };
  return { rect: squareRect, cellSize: size / CELL_COUNT };
}

// ticks/labels rendering for logical -ORIGIN..ORIGIN
const ticksContainer = document.getElementById('ticks');
const labelsContainer = document.getElementById('labels');

function clearTicks(){ ticksContainer.innerHTML = ''; labelsContainer.innerHTML = '' }

function renderTicks(){
  clearTicks();
  const { rect, cellSize } = getCellSize();
  const pointSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--point-size')) || 24;
  const r = pointSize / 2;
  const usableW = rect.width - 2 * r;
  const usableH = rect.height - 2 * r;

  for(let i = 0; i <= CELL_COUNT; i++){
    const gx = i;
    const logical = gx - ORIGIN; // -10..10
    const x = r + (gx / CELL_COUNT) * usableW;
    // vertical ticks (x axis ticks)
    const tick = document.createElement('div');
    tick.className = 'tick x';
  tick.style.left = x + 'px';
  tick.style.top = (rect.height/2 - 4) + 'px';
    ticksContainer.appendChild(tick);

  const label = document.createElement('div');
  label.className = 'tick-label x';
  label.style.left = x + 'px';
  label.style.top = (rect.height/2 + 14) + 'px';
  label.textContent = logical;
  labelsContainer.appendChild(label);

  // horizontal ticks (y axis ticks)
  const gy = i;
  const logicalY = gy - ORIGIN; // top should be positive, bottom negative
    const y = r + ((CELL_COUNT - gy) / CELL_COUNT) * usableH;
    const tickY = document.createElement('div');
    tickY.className = 'tick y';
  tickY.style.top = y + 'px';
  tickY.style.left = (rect.width/2 - 4) + 'px';
    ticksContainer.appendChild(tickY);

  const labelY = document.createElement('div');
  labelY.className = 'tick-label y';
  labelY.style.top = y + 'px';
  labelY.style.left = (rect.width/2 - 14) + 'px';
  labelY.textContent = logicalY;
  labelsContainer.appendChild(labelY);
  }
  // set background-size so CSS grid lines match our ticks
  const cellSizePx = usableW / CELL_COUNT;
  grid.style.backgroundSize = `${cellSizePx}px ${cellSizePx}px`;
  // offset the background so the first grid line matches the left/top tick at r
  grid.style.backgroundPosition = `${r}px ${r}px`;
}

window.addEventListener('resize', ()=>{
  renderTicks();
  // re-place at current logical coords to adjust position
  const logicalX = parseInt(cx.textContent) || 0;
  const logicalY = parseInt(cy.textContent) || 0;
  placeAtGrid(logicalX + ORIGIN, logicalY + ORIGIN);
});

function snapToGrid(clientX, clientY){
  const { rect } = getCellSize();
  const pointSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--point-size')) || 24;
  const r = pointSize / 2;
  // usable area where the center of the point can move
  const usableW = rect.width - 2 * r;
  const usableH = rect.height - 2 * r;

  // clamp the pointer to the usable area so center won't go outside
  const localX = clamp(clientX - rect.left, r, rect.width - r);
  const localY = clamp(clientY - rect.top, r, rect.height - r);

  // relative position in 0..1 across usable area
  const relX = (localX - r) / usableW;
  const relY = (localY - r) / usableH;

  // grid coords (0..CELL_COUNT)
  const gx = Math.round(relX * CELL_COUNT);
  // invert Y so 0 is bottom
  const gy = Math.round((1 - relY) * CELL_COUNT);

  const cgx = clamp(gx, 0, CELL_COUNT);
  const cgy = clamp(gy, 0, CELL_COUNT);

  const px = r + (cgx / CELL_COUNT) * usableW;
  const py = r + ((CELL_COUNT - cgy) / CELL_COUNT) * usableH; // convert back to top-based px

  return { gx: cgx, gy: cgy, px, py };
}

function placeAtGrid(gx, gy){
  const { rect } = getCellSize();
  const pointSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--point-size')) || 24;
  const r = pointSize / 2;
  const usableW = rect.width - 2 * r;
  const usableH = rect.height - 2 * r;
  const cgx = clamp(gx, 0, CELL_COUNT);
  const cgy = clamp(gy, 0, CELL_COUNT);
  const px = r + (cgx / CELL_COUNT) * usableW;
  const py = r + ((CELL_COUNT - cgy) / CELL_COUNT) * usableH;
  draggable.style.left = px + 'px';
  draggable.style.top = py + 'px';
  setCurrentDisplay(cgx, cgy);
}

function resetPosition(){ placeAtGrid(0,0) }

// Start drag when pointerdown on draggable
draggable.addEventListener('pointerdown', (e)=>{
  e.preventDefault();
  dragging = true;
  activePointerId = e.pointerId;
  draggable.setPointerCapture(activePointerId);
});

// Also allow clicking the grid to move point (and start drag)
grid.addEventListener('pointerdown', (e)=>{
  // if target is the draggable itself, it will be handled above
  if(e.target === draggable) return;
  e.preventDefault();
  const { gx, gy, px, py } = snapToGrid(e.clientX, e.clientY);
  draggable.style.left = px + 'px';
  draggable.style.top = py + 'px';
  setCurrentDisplay(gx, gy);
  // begin dragging from this point
  dragging = true;
  activePointerId = e.pointerId;
  try{ draggable.setPointerCapture(activePointerId) }catch(_){}
});

// Move
window.addEventListener('pointermove', (e)=>{
  if(!dragging) return;
  if(activePointerId != null && e.pointerId !== activePointerId) return;
  e.preventDefault();
  const { gx, gy, px, py } = snapToGrid(e.clientX, e.clientY);
  draggable.style.left = px + 'px';
  draggable.style.top = py + 'px';
  setCurrentDisplay(gx, gy);
});

// End drag
function endDrag(e){
  if(activePointerId != null && e && e.pointerId !== activePointerId) return;
  dragging = false;
  try{ if(activePointerId != null) draggable.releasePointerCapture(activePointerId) }catch(_){}
  activePointerId = null;
}
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

// Keyboard accessibility
draggable.addEventListener('keydown', (e)=>{
  // read logical coordinates from display and convert to grid indices
  const logicalX = parseInt(cx.textContent) || 0;
  const logicalY = parseInt(cy.textContent) || 0;
  let nx = logicalX;
  let ny = logicalY;
  if(e.key === 'ArrowRight') nx = clamp(logicalX + 1, -ORIGIN, ORIGIN);
  if(e.key === 'ArrowLeft') nx = clamp(logicalX - 1, -ORIGIN, ORIGIN);
  if(e.key === 'ArrowUp') ny = clamp(logicalY + 1, -ORIGIN, ORIGIN);
  if(e.key === 'ArrowDown') ny = clamp(logicalY - 1, -ORIGIN, ORIGIN);
  // convert back to grid indices
  placeAtGrid(nx + ORIGIN, ny + ORIGIN);
});

// Check
checkBtn.addEventListener('click', async ()=>{
  const gx = parseInt(cx.textContent) || 0; // logical coords
  const gy = parseInt(cy.textContent) || 0;
  if(gx === target.x && gy === target.y){
    // correct: flash and start next round
    checkBtn.disabled = true;
    flash('success');
    await new Promise(r => setTimeout(r, 900));
    setNewTarget();
    placeAtGrid(ORIGIN, ORIGIN);
    checkBtn.disabled = false;
  } else {
    flash('fail');
  }
});

function flash(type){
  draggable.classList.remove('flash-success','flash-fail');
  void draggable.offsetWidth;
  if(type === 'success') draggable.classList.add('flash-success');
  else draggable.classList.add('flash-fail');
}

newBtn.addEventListener('click', ()=> setNewTarget());
resetBtn.addEventListener('click', ()=> resetPosition());

// init: new target and center point at logical (0,0)
setNewTarget();
renderTicks();
placeAtGrid(ORIGIN, ORIGIN);
