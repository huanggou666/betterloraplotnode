/**
 * LoRAPlotNode Frontend — rgthree Power Lora Loader style layout
 *
 * Each LoRA row: [Toggle] [LoRA name ...] [◀ strength ▶]
 * Header row:    [Toggle All]  "Toggle All"       "Strength"
 * Footer:        [➕ Add Lora] button
 *
 * Faithfully replicates the drawing and interaction patterns from
 * rgthree-comfy's power_lora_loader.ts / utils_canvas.ts / utils_widgets.ts
 */
import { app } from "../../scripts/app.js";

/* ------------------------------------------------------------------ */
/*  Canvas drawing helpers (ported from rgthree utils_canvas.ts)       */
/* ------------------------------------------------------------------ */

function isLowQuality() {
  const canvas = app.canvas;
  return (canvas.ds?.scale || 1) <= 0.5;
}

function binarySearch(max, getValue, match) {
  let min = 0;
  while (min <= max) {
    let guess = Math.floor((min + max) / 2);
    const v = getValue(guess);
    if (v === match) return guess;
    if (v < match) min = guess + 1;
    else max = guess - 1;
  }
  return max;
}

function fitString(ctx, str, maxWidth) {
  let width = ctx.measureText(str).width;
  const ellipsis = "…";
  const ellipsisWidth = ctx.measureText(ellipsis).width;
  if (width <= maxWidth || width <= ellipsisWidth) return str;
  const idx = binarySearch(
    str.length,
    (g) => ctx.measureText(str.substring(0, g)).width,
    maxWidth - ellipsisWidth,
  );
  return str.substring(0, idx) + ellipsis;
}

function drawRoundedRectangle(ctx, options) {
  const lq = isLowQuality();
  ctx.save();
  ctx.strokeStyle = options.colorStroke || LiteGraph.WIDGET_OUTLINE_COLOR;
  ctx.fillStyle = options.colorBackground || LiteGraph.WIDGET_BGCOLOR;
  ctx.beginPath();
  const br = lq
    ? [0]
    : options.borderRadius
      ? [options.borderRadius]
      : [options.size[1] * 0.5];
  ctx.roundRect(...options.pos, ...options.size, br);
  ctx.fill();
  if (!lq) ctx.stroke();
  ctx.restore();
}

const ARROW_W = 9;
const ARROW_H = 10;
const INNER_M = 3;
const NUM_W = 32;
const NUMBER_TOTAL_W = ARROW_W + INNER_M + NUM_W + INNER_M + ARROW_W; // 56

function drawNumberWidgetPart(ctx, options) {
  const { posY, height, value, textColor } = options;
  let posX = options.posX;
  const midY = posY + height / 2;

  if (options.direction === -1) {
    posX = posX - NUMBER_TOTAL_W;
  }

  ctx.save();
  ctx.fillStyle = ctx.fillStyle; // keep current

  // Left arrow
  ctx.fill(
    new Path2D(
      `M ${posX} ${midY} l ${ARROW_W} ${ARROW_H / 2} l 0 -${ARROW_H} L ${posX} ${midY} z`,
    ),
  );
  const leftArrow = [posX, ARROW_W];
  posX += ARROW_W + INNER_M;

  // Number text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const oldFill = ctx.fillStyle;
  if (textColor) ctx.fillStyle = textColor;
  ctx.fillText(fitString(ctx, value.toFixed(2), NUM_W), posX + NUM_W / 2, midY);
  ctx.fillStyle = oldFill;
  const text = [posX, NUM_W];
  posX += NUM_W + INNER_M;

  // Right arrow
  ctx.fill(
    new Path2D(
      `M ${posX} ${midY - ARROW_H / 2} l ${ARROW_W} ${ARROW_H / 2} l -${ARROW_W} ${ARROW_H / 2} v -${ARROW_H} z`,
    ),
  );
  const rightArrow = [posX, ARROW_W];

  ctx.restore();
  return [leftArrow, text, rightArrow];
}

function drawTogglePart(ctx, options) {
  const lq = isLowQuality();
  ctx.save();
  const { posX, posY, height, value } = options;
  const toggleRadius = height * 0.36;
  const toggleBgWidth = height * 1.5;

  if (!lq) {
    ctx.beginPath();
    ctx.roundRect(posX + 4, posY + 4, toggleBgWidth - 8, height - 8, [
      height * 0.5,
    ]);
    ctx.globalAlpha = (app.canvas.editor_alpha ?? 1) * 0.25;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fill();
    ctx.globalAlpha = app.canvas.editor_alpha ?? 1;
  }

  ctx.fillStyle = value === true ? "#89B" : "#888";
  const toggleX =
    lq || value === false
      ? posX + height * 0.5
      : value === true
        ? posX + height
        : posX + height * 0.75;
  ctx.beginPath();
  ctx.arc(toggleX, posY + height * 0.5, toggleRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return [posX, toggleBgWidth];
}

function drawWidgetButton(ctx, options, text, isPressed) {
  const borderRadius = isLowQuality() ? 0 : (options.borderRadius ?? 4);
  ctx.save();
  if (!isLowQuality() && !isPressed) {
    drawRoundedRectangle(ctx, {
      size: [options.size[0] - 2, options.size[1]],
      pos: [options.pos[0] + 1, options.pos[1] + 1],
      borderRadius,
      colorBackground: "#000000aa",
      colorStroke: "#000000aa",
    });
  }
  drawRoundedRectangle(ctx, {
    size: options.size,
    pos: [options.pos[0], options.pos[1] + (isPressed ? 1 : 0)],
    borderRadius,
    colorBackground: isPressed ? "#444" : LiteGraph.WIDGET_BGCOLOR,
    colorStroke: "transparent",
  });
  if (isLowQuality()) {
    ctx.restore();
    return;
  }
  if (!isPressed) {
    drawRoundedRectangle(ctx, {
      size: [options.size[0] - 0.75, options.size[1] - 0.75],
      pos: options.pos,
      borderRadius: borderRadius - 0.5,
      colorBackground: "transparent",
      colorStroke: "#00000044",
    });
    drawRoundedRectangle(ctx, {
      size: [options.size[0] - 0.75, options.size[1] - 0.75],
      pos: [options.pos[0] + 0.75, options.pos[1] + 0.75],
      borderRadius: borderRadius - 0.5,
      colorBackground: "transparent",
      colorStroke: "#ffffff11",
    });
  }
  drawRoundedRectangle(ctx, {
    size: options.size,
    pos: [options.pos[0], options.pos[1] + (isPressed ? 1 : 0)],
    borderRadius,
    colorBackground: "transparent",
  });
  if (text) {
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = LiteGraph.WIDGET_TEXT_COLOR;
    ctx.fillText(
      text,
      options.pos[0] + options.size[0] / 2,
      options.pos[1] + options.size[1] / 2 + (isPressed ? 1 : 0),
    );
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/*  Hit-area helper                                                    */
/* ------------------------------------------------------------------ */

function inBounds(pos, bounds) {
  // bounds = [x, width]
  return pos[0] >= bounds[0] && pos[0] <= bounds[0] + bounds[1];
}

/* ------------------------------------------------------------------ */
/*  LoRA chooser menu (uses ComfyUI folder_paths via api)              */
/* ------------------------------------------------------------------ */

let _lorasCache = null;
let _lorasCacheTime = 0;
let _lorasFetchPromise = null;
const LORA_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchLoras(force) {
  const now = Date.now();
  if (!force && _lorasCache && now - _lorasCacheTime < LORA_CACHE_DURATION) return _lorasCache;

  // If a fetch is already in flight, return the same promise (dedup)
  if (_lorasFetchPromise && !force) return _lorasFetchPromise;

  _lorasFetchPromise = (async () => {
    // Primary: ComfyUI's standard LoraLoader object_info (most reliable)
    try {
      const resp = await fetch("/object_info/LoraLoader");
      if (resp.ok) {
        const data = await resp.json();
        const loraInput = data?.LoraLoader?.input?.required?.lora_name;
        if (loraInput && Array.isArray(loraInput[0])) {
          _lorasCache = loraInput[0];
          _lorasCacheTime = Date.now();
          _lorasFetchPromise = null;
          return _lorasCache;
        }
      }
    } catch (_) { /* ignore */ }

    // Fallback: try newer ComfyUI /api/loras or similar
    try {
      const resp = await fetch("/api/loras");
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          _lorasCache = data.map(item => typeof item === 'string' ? item : (item.name || item.file || String(item)));
          _lorasCacheTime = Date.now();
          _lorasFetchPromise = null;
          return _lorasCache;
        }
      }
    } catch (_) { /* ignore */ }

    _lorasFetchPromise = null;
    return [];
  })();

  return _lorasFetchPromise;
}

function showLoraChooser(event, callback) {
  // Use cached data synchronously if available, fetch in bg otherwise
  const cachedLoras = _lorasCache;
  const show = (loras) => {
    if (!loras || !loras.length) {
      alert("No LoRAs found");
      return;
    }

    // Build nested context menu from path structure
    const buildMenu = (loraList) => {
      // Group by first path segment
      const groups = {};
      const rootItems = [];
      
      for (const lora of loraList) {
        const parts = lora.split(/[/\\]/);
        if (parts.length > 1) {
          const group = parts[0];
          if (!groups[group]) groups[group] = [];
          groups[group].push(lora);
        } else {
          rootItems.push(lora);
        }
      }

      const menuItems = [];
      
      // Add grouped items as submenus
      const groupKeys = Object.keys(groups).sort();
      for (const group of groupKeys) {
        const submenu = groups[group].sort().map(l => ({
          content: l,
          callback: () => callback(l),
        }));
        menuItems.push({
          content: `📁 ${group}`,
          has_submenu: true,
          callback: () => {},
          submenu: { options: submenu },
        });
      }
      
      // Add root items
      for (const lora of rootItems.sort()) {
        menuItems.push({
          content: lora,
          callback: () => callback(lora),
        });
      }
      
      return menuItems;
    };

    const menuItems = buildMenu(loras);
    new LiteGraph.ContextMenu(menuItems, {
      event: event instanceof PointerEvent || event instanceof MouseEvent ? event : event?.canvasEvent || event,
      title: "Select LoRA",
    });
  };

  // If cache is fresh, show immediately (no await needed)
  if (cachedLoras && cachedLoras.length > 0) {
    show(cachedLoras);
    // Refresh cache in background for next time
    fetchLoras(false);
  } else {
    // First time: must await
    fetchLoras(false).then(show);
  }
}

/* ------------------------------------------------------------------ */
/*  Utility: move / remove array items                                 */
/* ------------------------------------------------------------------ */

function moveArrayItem(arr, item, toIndex) {
  const fromIndex = arr.indexOf(item);
  if (fromIndex < 0 || toIndex < 0 || toIndex >= arr.length) return;
  arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, item);
}

function removeArrayItem(arr, item) {
  const idx = arr.indexOf(item);
  if (idx >= 0) arr.splice(idx, 1);
}

/* ================================================================== */
/*  WIDGET: Header                                                     */
/* ================================================================== */

class LoraPlotHeaderWidget {
  constructor() {
    this.name = "loraplot_header";
    this.type = "custom";
    this.value = { type: "LoraPlotHeaderWidget" };
    this.options = { serialize: false };
    this.y = 0;
    this.last_y = 0;

    this._toggleBounds = [0, 0];
  }

  computeSize(width) {
    return [width, LiteGraph.NODE_WIDGET_HEIGHT];
  }

  draw(ctx, node, w, posY, height) {
    this.last_y = posY;
    // Only draw when we have lora widgets
    if (!node._hasLoraWidgets()) return;

    const margin = 10;
    const innerMargin = margin * 0.33;
    const lq = isLowQuality();
    const allState = node._allLorasState();

    posY += 2;
    const midY = posY + height * 0.5;
    let posX = 10;
    ctx.save();

    this._toggleBounds = drawTogglePart(ctx, {
      posX,
      posY,
      height,
      value: allState,
    });

    if (!lq) {
      posX += this._toggleBounds[1] + innerMargin;
      ctx.globalAlpha = (app.canvas.editor_alpha ?? 1) * 0.55;
      ctx.fillStyle = LiteGraph.WIDGET_TEXT_COLOR;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("Toggle All", posX, midY);

      let rposX = node.size[0] - margin - innerMargin - innerMargin;
      ctx.textAlign = "center";
      ctx.fillText("Strength", rposX - NUMBER_TOTAL_W / 2, midY);
    }
    ctx.restore();
  }

  mouse(event, pos, node) {
    if (event.type === "pointerdown") {
      if (inBounds(pos, this._toggleBounds)) {
        node._toggleAllLoras();
        return true;
      }
    }
    return false;
  }

  serializeValue() {
    return this.value;
  }
}

/* ================================================================== */
/*  WIDGET: Lora Row                                                   */
/* ================================================================== */

class LoraPlotWidget {
  constructor(name) {
    this.name = name;
    this.type = "custom";
    this._value = { on: true, lora: null, strength: 1 };
    this.options = {};
    this.y = 0;
    this.last_y = 0;

    // Hit areas (each is [x, width])
    this._toggleBounds = [0, 0];
    this._loraBounds = [0, 0];
    this._strengthDecBounds = [0, 0];
    this._strengthValBounds = [0, 0];
    this._strengthIncBounds = [0, 0];
    this._strengthAnyBounds = [0, 0];

    this._mouseDowned = null;
    this._mouseMovedStrength = false;
    this._downedAreas = []; // areas that got mousedown for move tracking
  }

  get value() {
    return this._value;
  }

  set value(v) {
    if (typeof v === "object" && v !== null) {
      this._value = v;
    } else {
      this._value = { on: true, lora: null, strength: 1 };
    }
  }

  setLora(lora) {
    this._value.lora = lora;
  }

  computeSize(width) {
    return [width, LiteGraph.NODE_WIDGET_HEIGHT];
  }

  serializeValue() {
    return { ...this._value };
  }

  draw(ctx, node, w, posY, height) {
    this.last_y = posY;
    ctx.save();
    const margin = 10;
    const innerMargin = margin * 0.33;
    const lq = isLowQuality();
    const midY = posY + height * 0.5;
    let posX = margin;

    // Background rounded rect
    drawRoundedRectangle(ctx, {
      pos: [posX, posY],
      size: [node.size[0] - margin * 2, height],
    });

    // Toggle
    this._toggleBounds = drawTogglePart(ctx, {
      posX,
      posY,
      height,
      value: this._value.on,
    });
    posX += this._toggleBounds[1] + innerMargin;

    if (lq) {
      ctx.restore();
      return;
    }

    // Fade if off
    if (!this._value.on) {
      ctx.globalAlpha = (app.canvas.editor_alpha ?? 1) * 0.4;
    }

    ctx.fillStyle = LiteGraph.WIDGET_TEXT_COLOR;

    // Draw strength part on right
    let rposX = node.size[0] - margin - innerMargin - innerMargin;
    const strengthValue = this._value.strength ?? 1;

    const [leftArrow, text, rightArrow] = drawNumberWidgetPart(ctx, {
      posX: rposX,
      posY,
      height,
      value: strengthValue,
      direction: -1,
    });

    this._strengthDecBounds = leftArrow;
    this._strengthValBounds = text;
    this._strengthIncBounds = rightArrow;
    this._strengthAnyBounds = [
      leftArrow[0],
      rightArrow[0] + rightArrow[1] - leftArrow[0],
    ];

    rposX = leftArrow[0] - innerMargin;

    // Lora label
    const loraWidth = rposX - posX;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const loraLabel = String(this._value?.lora || "None");
    ctx.fillText(fitString(ctx, loraLabel, loraWidth), posX, midY);
    this._loraBounds = [posX, loraWidth];

    ctx.globalAlpha = app.canvas.editor_alpha ?? 1;
    ctx.restore();
  }

  mouse(event, pos, node) {
    if (event.type === "pointerdown") {
      this._mouseDowned = [...pos];
      this._mouseMovedStrength = false;
      this._downedAreas = [];

      // Toggle
      if (inBounds(pos, this._toggleBounds)) {
        this._value.on = !this._value.on;
        this._mouseDowned = null;
        return true;
      }

      // Track strength area for drag
      if (inBounds(pos, this._strengthAnyBounds)) {
        this._downedAreas.push("strengthAny");
      }

      // Track lora & strength click areas
      if (inBounds(pos, this._loraBounds)) {
        this._downedAreas.push("lora");
      }
      if (inBounds(pos, this._strengthDecBounds)) {
        this._downedAreas.push("strengthDec");
      }
      if (inBounds(pos, this._strengthValBounds)) {
        this._downedAreas.push("strengthVal");
      }
      if (inBounds(pos, this._strengthIncBounds)) {
        this._downedAreas.push("strengthInc");
      }

      return true;
    }

    if (event.type === "pointermove") {
      if (!this._mouseDowned) return false;
      if (this._downedAreas.includes("strengthAny") && event.deltaX) {
        this._mouseMovedStrength = true;
        this._value.strength =
          (this._value.strength ?? 1) + event.deltaX * 0.05;
      }
      return true;
    }

    if (event.type === "pointerup") {
      if (!this._mouseDowned) return true;
      const downed = [...this._downedAreas];
      this._mouseDowned = null;
      this._downedAreas = [];

      // Strength dec/inc (only on click, not drag)
      if (!this._mouseMovedStrength) {
        if (
          downed.includes("strengthDec") &&
          inBounds(pos, this._strengthDecBounds)
        ) {
          this._stepStrength(-1);
          this._mouseMovedStrength = false;
          return true;
        }
        if (
          downed.includes("strengthInc") &&
          inBounds(pos, this._strengthIncBounds)
        ) {
          this._stepStrength(1);
          this._mouseMovedStrength = false;
          return true;
        }
        if (
          downed.includes("strengthVal") &&
          inBounds(pos, this._strengthValBounds)
        ) {
          // Prompt for exact value
          const canvas = app.canvas;
          canvas.prompt(
            "Strength",
            this._value.strength,
            (v) => {
              this._value.strength = Number(v);
            },
            event,
          );
          this._mouseMovedStrength = false;
          return true;
        }
        // Lora click
        if (downed.includes("lora") && inBounds(pos, this._loraBounds)) {
          showLoraChooser(event, (loraName) => {
            this._value.lora = loraName;
            node.setDirtyCanvas(true, true);
          });
          this._mouseMovedStrength = false;
          return true;
        }
      }

      this._mouseMovedStrength = false;
      return true;
    }

    return false;
  }

  _stepStrength(direction) {
    const step = 0.05;
    let s = (this._value.strength ?? 1) + step * direction;
    this._value.strength = Math.round(s * 100) / 100;
  }
}

/* ================================================================== */
/*  WIDGET: Divider / Spacer                                           */
/* ================================================================== */

class DividerWidget {
  constructor(opts) {
    this.name = "divider_" + Math.random().toString(36).slice(2, 8);
    this.type = "custom";
    this.value = {};
    this.options = { serialize: false };
    this.y = 0;
    this.last_y = 0;
    this._opts = Object.assign(
      {
        marginTop: 7,
        marginBottom: 7,
        marginLeft: 15,
        marginRight: 15,
        thickness: 1,
        color: LiteGraph.WIDGET_OUTLINE_COLOR,
      },
      opts || {},
    );
  }

  computeSize(width) {
    return [
      width,
      this._opts.marginTop + this._opts.marginBottom + this._opts.thickness,
    ];
  }

  draw(ctx, node, width, posY, h) {
    this.last_y = posY;
    if (this._opts.thickness) {
      ctx.strokeStyle = this._opts.color;
      const x = this._opts.marginLeft;
      const y = posY + this._opts.marginTop;
      const w = width - this._opts.marginLeft - this._opts.marginRight;
      ctx.stroke(new Path2D(`M ${x} ${y} h ${w}`));
    }
  }

  mouse() {
    return false;
  }

  serializeValue() {
    return this.value;
  }
}

/* ================================================================== */
/*  WIDGET: Add Lora Button                                            */
/* ================================================================== */

class AddLoraButtonWidget {
  constructor(onClickCallback) {
    this.name = "add_lora_button";
    this.type = "custom";
    this.value = "";
    this.options = { serialize: false };
    this.y = 0;
    this.last_y = 0;
    this._callback = onClickCallback;
    this._isPressed = false;
    this._mouseDowned = false;
  }

  computeSize(width) {
    return [width, LiteGraph.NODE_WIDGET_HEIGHT];
  }

  draw(ctx, node, width, posY, height) {
    this.last_y = posY;
    drawWidgetButton(
      ctx,
      { size: [width - 30, height], pos: [15, posY] },
      "➕ Add Lora",
      this._isPressed,
    );
  }

  mouse(event, pos, node) {
    if (event.type === "pointerdown") {
      this._mouseDowned = true;
      this._isPressed = true;
      return true;
    }
    if (event.type === "pointermove") {
      if (this._mouseDowned) {
        // Check if still over button
        this._isPressed =
          pos[0] >= 15 &&
          pos[0] <= node.size[0] - 15 &&
          pos[1] >= this.last_y &&
          pos[1] <= this.last_y + LiteGraph.NODE_WIDGET_HEIGHT;
      }
      return true;
    }
    if (event.type === "pointerup") {
      if (this._mouseDowned && this._isPressed) {
        this._callback(event, pos, node);
      }
      this._mouseDowned = false;
      this._isPressed = false;
      return true;
    }
    return false;
  }

  serializeValue() {
    return this.value;
  }
}

/* ================================================================== */
/*  Node registration                                                  */
/* ================================================================== */

// Pre-fetch LoRA list as soon as the extension loads
fetchLoras(false);

app.registerExtension({
  name: "LoRAPlotNode.PowerLayout",

  async beforeRegisterNodeDef(nodeType, nodeData, appInstance) {
    if (nodeData.name !== "LoRAPlotNode") return;

    /* ---- helpers attached to node prototype ---- */

    nodeType.prototype._hasLoraWidgets = function () {
      return !!this.widgets?.find((w) => w.name?.startsWith("lora_"));
    };

    nodeType.prototype._allLorasState = function () {
      let allOn = true;
      let allOff = true;
      for (const w of this.widgets || []) {
        if (w.name?.startsWith("lora_")) {
          const on = w._value?.on ?? w.value?.on;
          allOn = allOn && on === true;
          allOff = allOff && on === false;
          if (!allOn && !allOff) return null;
        }
      }
      if (!this._hasLoraWidgets()) return false;
      return allOn ? true : false;
    };

    nodeType.prototype._toggleAllLoras = function () {
      const allOn = this._allLorasState();
      const toggledTo = !allOn;
      for (const w of this.widgets || []) {
        if (w.name?.startsWith("lora_") && w._value) {
          w._value.on = toggledTo;
        }
      }
    };

    /* ---- hide the strengths widget ---- */
    nodeType.prototype._hideStrengthsWidget = function () {
      for (const w of this.widgets || []) {
        if (w.name === "strengths") {
          // Make the widget invisible but keep it for serialization
          w.computeSize = () => [0, -4];
          w.type = "converted-widget";
          Object.defineProperty(w, "hidden", { value: true, writable: true });
          break;
        }
      }
    };

    /* ---- counter for unique lora widget names ---- */
    nodeType.prototype._loraCounter = 0;
    nodeType.prototype._buttonSpacerWidget = null;

    nodeType.prototype._addNewLoraWidget = function (lora) {
      this._loraCounter++;
      const widget = new LoraPlotWidget("lora_" + this._loraCounter);
      if (lora) widget.setLora(lora);

      // Insert before the button spacer if it exists
      const spacerIdx = this._buttonSpacerWidget
        ? this.widgets.indexOf(this._buttonSpacerWidget)
        : -1;

      this.addCustomWidget(widget);

      if (spacerIdx >= 0) {
        moveArrayItem(this.widgets, widget, spacerIdx);
      }

      return widget;
    };

    nodeType.prototype._addNonLoraWidgets = function () {
      // Top divider
      const topDivider = new DividerWidget({
        marginTop: 4,
        marginBottom: 0,
        thickness: 0,
      });
      this.addCustomWidget(topDivider);
      moveArrayItem(this.widgets, topDivider, 0);

      // Header
      const header = new LoraPlotHeaderWidget();
      this.addCustomWidget(header);
      moveArrayItem(this.widgets, header, 1);

      // Button spacer
      this._buttonSpacerWidget = new DividerWidget({
        marginTop: 4,
        marginBottom: 0,
        thickness: 0,
      });
      this.addCustomWidget(this._buttonSpacerWidget);

      // Add Lora button
      const self = this;
      const addBtn = new AddLoraButtonWidget(function (event, pos, node) {
        showLoraChooser(event, (loraName) => {
          if (loraName && loraName !== "NONE") {
            self._addNewLoraWidget(loraName);
            const computed = self.computeSize();
            self.size[1] = Math.max(self.size[1], computed[1]);
            self.setDirtyCanvas(true, true);
          }
        });
      });
      this.addCustomWidget(addBtn);
    };

    /* ---- override onNodeCreated ---- */
    const origOnNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      origOnNodeCreated?.apply(this, arguments);

      // Hide the "strengths" widget that ComfyUI auto-creates for the required input.
      // The widget still exists for serialization, it's just invisible.
      this._hideStrengthsWidget();

      // Pre-fetch lora list so the menu opens instantly
      fetchLoras(false);

      this._addNonLoraWidgets();

      const computed = this.computeSize();
      this.size = this.size || [0, 0];
      this.size[0] = Math.max(this.size[0], computed[0], 300);
      this.size[1] = Math.max(this.size[1], computed[1]);
      this.setDirtyCanvas(true, true);
    };

    /* ---- override configure (loading from saved workflow) ---- */
    const origConfigure = nodeType.prototype.configure;
    nodeType.prototype.configure = function (info) {
      // First, remove all our custom widgets (keep ComfyUI default ones for model/clip/strengths)
      // We'll add them back from saved widget values
      const defaultWidgetNames = new Set();
      
      // Call original configure first to set up base node
      origConfigure?.apply(this, arguments);

      // Hide strengths widget
      this._hideStrengthsWidget();

      // Identify ComfyUI standard widgets (already created)
      const standardWidgets = [];
      const loraValues = [];

      for (const w of this.widgets || []) {
        if (
          w.name === "strengths" ||
          w.type === "converted-widget"
        ) {
          standardWidgets.push(w);
        }
      }

      // Extract lora widget values from saved data
      if (info.widgets_values) {
        for (const wv of info.widgets_values) {
          if (
            wv &&
            typeof wv === "object" &&
            wv.lora !== undefined
          ) {
            loraValues.push(wv);
          }
        }
      }

      // Remove all widgets except standard ones
      this.widgets = standardWidgets.slice();
      this._buttonSpacerWidget = null;
      this._loraCounter = 0;

      // Re-add custom chrome
      this._addNonLoraWidgets();

      // Re-add saved lora widgets
      for (const lv of loraValues) {
        const widget = this._addNewLoraWidget();
        widget.value = { ...lv };
      }

      // Fix sizing
      this.size[0] = Math.max(this.size[0] || 0, 300);
      const computed = this.computeSize();
      this.size[1] = Math.max(this.size[1] || 0, computed[1]);
    };

    /* ---- Right-click context menu for lora widgets ---- */
    const origGetSlotInPosition = nodeType.prototype.getSlotInPosition;
    nodeType.prototype.getSlotInPosition = function (canvasX, canvasY) {
      const slot = origGetSlotInPosition?.apply(this, arguments);
      if (!slot) {
        let lastWidget = null;
        for (const widget of this.widgets || []) {
          if (!widget.last_y && widget.last_y !== 0) return;
          if (canvasY > this.pos[1] + widget.last_y) {
            lastWidget = widget;
            continue;
          }
          break;
        }
        if (lastWidget?.name?.startsWith("lora_")) {
          return { widget: lastWidget, output: { type: "LORA WIDGET" } };
        }
      }
      return slot;
    };

    const origGetSlotMenuOptions = nodeType.prototype.getSlotMenuOptions;
    nodeType.prototype.getSlotMenuOptions = function (slot) {
      if (slot?.widget?.name?.startsWith("lora_")) {
        const widget = slot.widget;
        const index = this.widgets.indexOf(widget);
        const canMoveUp = !!this.widgets[index - 1]?.name?.startsWith(
          "lora_",
        );
        const canMoveDown = !!this.widgets[index + 1]?.name?.startsWith(
          "lora_",
        );

        const self = this;
        const menuItems = [
          {
            content: `${widget._value?.on ? "⚫" : "🟢"} Toggle ${widget._value?.on ? "Off" : "On"}`,
            callback: () => {
              widget._value.on = !widget._value.on;
              self.setDirtyCanvas(true, true);
            },
          },
          null, // divider
          {
            content: "⬆️ Move Up",
            disabled: !canMoveUp,
            callback: () => {
              moveArrayItem(self.widgets, widget, index - 1);
              self.setDirtyCanvas(true, true);
            },
          },
          {
            content: "⬇️ Move Down",
            disabled: !canMoveDown,
            callback: () => {
              moveArrayItem(self.widgets, widget, index + 1);
              self.setDirtyCanvas(true, true);
            },
          },
          null, // divider
          {
            content: "🗑️ Remove",
            callback: () => {
              removeArrayItem(self.widgets, widget);
              const computed = self.computeSize();
              self.size[1] = Math.max(computed[1], 100);
              self.setDirtyCanvas(true, true);
            },
          },
        ];

        new LiteGraph.ContextMenu(menuItems, {
          title: "LORA WIDGET",
          event:
            app.canvas.last_mouse_event ||
            event,
        });
        return undefined;
      }
      return origGetSlotMenuOptions?.apply(this, arguments);
    };
  },
});
