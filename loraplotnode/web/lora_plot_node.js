/**
 * LoRAPlotNode custom widget UI.
 *
 * Re-creates the rgthree-comfy "Power Lora Loader" row layout 1:1
 * (rounded row, left on/off toggle, lora name, right-aligned strength
 * value with -/+ arrows, a "Toggle All" header row, and a "+ Add Lora"
 * button), but is fully self-contained: it does not import anything from
 * rgthree-comfy, so it works whether or not that node pack is installed.
 *
 * Each row's value is: { on: boolean, lora: string, strengths: string }
 * "strengths" may be a single number ("1.0") or a comma-separated list
 * ("0.8,0.9,1.0") to keep the original node's "plot every strength" ability,
 * now configurable per LoRA instead of shared globally.
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const NODE_TYPE = "LoRAPlotNode";

// ---------------------------------------------------------------------
// Small drawing helpers (re-implemented locally; no rgthree dependency)
// ---------------------------------------------------------------------

function isLowQuality() {
  const canvas = app.canvas;
  return ((canvas.ds && canvas.ds.scale) || 1) <= 0.5;
}

function measureText(ctx, str) {
  return ctx.measureText(str).width;
}

function fitString(ctx, str, maxWidth) {
  let width = measureText(ctx, str);
  const ellipsis = "…";
  const ellipsisWidth = measureText(ctx, ellipsis);
  if (width <= maxWidth || width <= ellipsisWidth) {
    return str;
  }
  let min = 0;
  let max = str.length;
  while (min <= max) {
    const guess = Math.floor((min + max) / 2);
    const w = measureText(ctx, str.substring(0, guess));
    if (w === maxWidth - ellipsisWidth) {
      min = guess;
      break;
    }
    if (w < maxWidth - ellipsisWidth) min = guess + 1;
    else max = guess - 1;
  }
  return str.substring(0, max) + ellipsis;
}

function drawRoundedRectangle(ctx, { pos, size, colorStroke, colorBackground, borderRadius }) {
  const lowQuality = isLowQuality();
  ctx.save();
  ctx.strokeStyle = colorStroke || LiteGraph.WIDGET_OUTLINE_COLOR;
  ctx.fillStyle = colorBackground || LiteGraph.WIDGET_BGCOLOR;
  ctx.beginPath();
  const radius = lowQuality ? 0 : (borderRadius != null ? borderRadius : size[1] * 0.5);
  if (ctx.roundRect) {
    ctx.roundRect(pos[0], pos[1], size[0], size[1], [radius]);
  } else {
    ctx.rect(pos[0], pos[1], size[0], size[1]);
  }
  ctx.fill();
  if (!lowQuality) ctx.stroke();
  ctx.restore();
}

function drawWidgetButton(ctx, { pos, size }, text, isMouseDownedAndOver) {
  const lowQuality = isLowQuality();
  const borderRadius = lowQuality ? 0 : 4;
  ctx.save();
  if (!lowQuality && !isMouseDownedAndOver) {
    drawRoundedRectangle(ctx, {
      pos: [pos[0] + 1, pos[1] + 1],
      size: [size[0] - 2, size[1]],
      borderRadius,
      colorBackground: "#000000aa",
      colorStroke: "#000000aa",
    });
  }
  drawRoundedRectangle(ctx, {
    pos: [pos[0], pos[1] + (isMouseDownedAndOver ? 1 : 0)],
    size,
    borderRadius,
    colorBackground: isMouseDownedAndOver ? "#444" : LiteGraph.WIDGET_BGCOLOR,
    colorStroke: "transparent",
  });
  if (!lowQuality && text) {
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = LiteGraph.WIDGET_TEXT_COLOR;
    ctx.fillText(text, pos[0] + size[0] / 2, pos[1] + size[1] / 2 + (isMouseDownedAndOver ? 1 : 0));
  }
  ctx.restore();
}

function drawTogglePart(ctx, { posX, posY, height, value }) {
  const lowQuality = isLowQuality();
  ctx.save();
  const toggleRadius = height * 0.36;
  const toggleBgWidth = height * 1.5;
  if (!lowQuality) {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(posX + 4, posY + 4, toggleBgWidth - 8, height - 8, [height * 0.5]);
    } else {
      ctx.rect(posX + 4, posY + 4, toggleBgWidth - 8, height - 8);
    }
    ctx.globalAlpha = (app.canvas.editor_alpha ?? 1) * 0.25;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fill();
    ctx.globalAlpha = app.canvas.editor_alpha ?? 1;
  }
  ctx.fillStyle = value === true ? "#89B" : "#888";
  const toggleX =
    lowQuality || value === false
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

// Like rgthree's drawNumberWidgetPart, but draws an arbitrary (possibly
// multi-value, comma separated) string instead of assuming a single float,
// so a row's strengths can be "1.0" or "0.8,0.9,1.0".
function drawStrengthPart(ctx, { posX, posY, height, text, textColor }) {
  const arrowWidth = 9;
  const arrowHeight = 10;
  const innerMargin = 3;
  const numberWidth = 46;
  const xBoundsArrowLess = [0, 0];
  const xBoundsNumber = [0, 0];
  const xBoundsArrowMore = [0, 0];
  ctx.save();
  // direction === -1 layout (right-aligned, like rgthree)
  let x = posX - arrowWidth - innerMargin - numberWidth - innerMargin - arrowWidth;
  const midY = posY + height / 2;

  ctx.fill(new Path2D(`M ${x} ${midY} l ${arrowWidth} ${arrowHeight / 2} l 0 -${arrowHeight} L ${x} ${midY} z`));
  xBoundsArrowLess[0] = x;
  xBoundsArrowLess[1] = arrowWidth;
  x += arrowWidth + innerMargin;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const oldColor = ctx.fillStyle;
  if (textColor) ctx.fillStyle = textColor;
  ctx.fillText(fitString(ctx, text, numberWidth), x + numberWidth / 2, midY);
  ctx.fillStyle = oldColor;
  xBoundsNumber[0] = x;
  xBoundsNumber[1] = numberWidth;
  x += numberWidth + innerMargin;

  ctx.fill(new Path2D(`M ${x} ${midY - arrowHeight / 2} l ${arrowWidth} ${arrowHeight / 2} l -${arrowWidth} ${arrowHeight / 2} v -${arrowHeight} z`));
  xBoundsArrowMore[0] = x;
  xBoundsArrowMore[1] = arrowWidth;

  ctx.restore();
  return [xBoundsArrowLess, xBoundsNumber, xBoundsArrowMore];
}
drawStrengthPart.WIDTH_TOTAL = 9 + 3 + 46 + 3 + 9;

// ---------------------------------------------------------------------
// Base widget with rgthree-style hit-area mouse handling
// ---------------------------------------------------------------------

class BaseWidget {
  constructor(name) {
    this.name = name;
    this.type = "custom";
    this.options = {};
    this.y = 0;
    this.last_y = 0;
    this.mouseDowned = null;
    this.isMouseDownedAndOver = false;
    this.hitAreas = {};
    this.downedHitAreasForMove = [];
    this.downedHitAreasForClick = [];
  }

  serializeValue(node, index) {
    return this.value;
  }

  clickWasWithinBounds(pos, bounds) {
    const xStart = bounds[0];
    const xEnd = xStart + (bounds.length > 2 ? bounds[2] : bounds[1]);
    const clickedX = pos[0] >= xStart && pos[0] <= xEnd;
    if (bounds.length === 2) return clickedX;
    return clickedX && pos[1] >= bounds[1] && pos[1] <= bounds[1] + bounds[3];
  }

  mouse(event, pos, node) {
    if (event.type === "pointerdown") {
      this.mouseDowned = [...pos];
      this.isMouseDownedAndOver = true;
      this.downedHitAreasForMove.length = 0;
      this.downedHitAreasForClick.length = 0;
      let anyHandled = false;
      for (const part of Object.values(this.hitAreas)) {
        if (this.clickWasWithinBounds(pos, part.bounds)) {
          if (part.onMove) this.downedHitAreasForMove.push(part);
          if (part.onClick) this.downedHitAreasForClick.push(part);
          if (part.onDown) {
            const handled = part.onDown.apply(this, [event, pos, node, part]);
            anyHandled = anyHandled || handled === true;
          }
          part.wasMouseClickedAndIsOver = true;
        }
      }
      const r = this.onMouseDown(event, pos, node);
      return r != null ? r : anyHandled;
    }
    if (event.type === "pointerup") {
      if (!this.mouseDowned) return true;
      this.downedHitAreasForMove.length = 0;
      const wasDownAndOver = this.isMouseDownedAndOver;
      this.cancelMouseDown();
      let anyHandled = false;
      for (const part of Object.values(this.hitAreas)) {
        if (part.onUp && this.clickWasWithinBounds(pos, part.bounds)) {
          const handled = part.onUp.apply(this, [event, pos, node, part]);
          anyHandled = anyHandled || handled === true;
        }
        part.wasMouseClickedAndIsOver = false;
      }
      for (const part of this.downedHitAreasForClick) {
        if (this.clickWasWithinBounds(pos, part.bounds)) {
          const handled = part.onClick.apply(this, [event, pos, node, part]);
          anyHandled = anyHandled || handled === true;
        }
      }
      this.downedHitAreasForClick.length = 0;
      if (wasDownAndOver) {
        const handled = this.onMouseClick(event, pos, node);
        anyHandled = anyHandled || handled === true;
      }
      const r = this.onMouseUp(event, pos, node);
      return r != null ? r : anyHandled;
    }
    if (event.type === "pointermove") {
      this.isMouseDownedAndOver = !!this.mouseDowned;
      if (
        this.mouseDowned &&
        (pos[0] < 15 || pos[0] > node.size[0] - 15 || pos[1] < this.last_y || pos[1] > this.last_y + LiteGraph.NODE_WIDGET_HEIGHT)
      ) {
        this.isMouseDownedAndOver = false;
      }
      for (const part of Object.values(this.hitAreas)) {
        if (this.downedHitAreasForMove.includes(part)) {
          part.onMove.apply(this, [event, pos, node, part]);
        }
        if (this.downedHitAreasForClick.includes(part)) {
          part.wasMouseClickedAndIsOver = this.clickWasWithinBounds(pos, part.bounds);
        }
      }
      const r = this.onMouseMove(event, pos, node);
      return r != null ? r : true;
    }
    return false;
  }

  cancelMouseDown() {
    this.mouseDowned = null;
    this.isMouseDownedAndOver = false;
    this.downedHitAreasForMove.length = 0;
  }

  onMouseDown() {}
  onMouseUp() {}
  onMouseClick() {}
  onMouseMove() {}
}

class DividerWidget extends BaseWidget {
  constructor(opts) {
    super("divider");
    this.value = {};
    this.options = { serialize: false };
    this.widgetOptions = Object.assign(
      { marginTop: 4, marginBottom: 0, marginLeft: 15, marginRight: 15, color: LiteGraph.WIDGET_OUTLINE_COLOR, thickness: 0 },
      opts || {}
    );
  }
  draw(ctx, node, width, posY) {
    if (this.widgetOptions.thickness) {
      ctx.strokeStyle = this.widgetOptions.color;
      const x = this.widgetOptions.marginLeft;
      const y = posY + this.widgetOptions.marginTop;
      const w = width - this.widgetOptions.marginLeft - this.widgetOptions.marginRight;
      ctx.stroke(new Path2D(`M ${x} ${y} h ${w}`));
    }
  }
  computeSize(width) {
    return [width, this.widgetOptions.marginTop + this.widgetOptions.marginBottom + this.widgetOptions.thickness];
  }
}

class AddLoraButtonWidget extends BaseWidget {
  constructor(onClick) {
    super("➕ Add Lora");
    this.value = "";
    this.onClickCb = onClick;
  }
  draw(ctx, node, width, y, height) {
    drawWidgetButton(ctx, { pos: [15, y], size: [width - 30, height] }, this.name, this.isMouseDownedAndOver);
  }
  onMouseClick(event, pos, node) {
    return this.onClickCb(event, pos, node);
  }
}

// ---------------------------------------------------------------------
// Header widget: "Toggle All" + "Strength" labels
// ---------------------------------------------------------------------

class LoraHeaderWidget extends BaseWidget {
  constructor() {
    super("lora_plot_header");
    this.value = { type: "LoraHeaderWidget" };
    this.options = { serialize: false };
    this.hitAreas = {
      toggle: { bounds: [0, 0], onDown: this.onToggleDown.bind(this) },
    };
  }
  draw(ctx, node, w, posY, height) {
    if (!node.hasLoraRows()) return;
    const margin = 10;
    const innerMargin = margin * 0.33;
    const lowQuality = isLowQuality();
    const allState = node.allLorasState();
    posY += 2;
    const midY = posY + height * 0.5;
    let posX = 10;
    ctx.save();
    this.hitAreas.toggle.bounds = drawTogglePart(ctx, { posX, posY, height, value: allState });
    if (!lowQuality) {
      posX += this.hitAreas.toggle.bounds[1] + innerMargin;
      ctx.globalAlpha = (app.canvas.editor_alpha ?? 1) * 0.55;
      ctx.fillStyle = LiteGraph.WIDGET_TEXT_COLOR;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("Toggle All", posX, midY);
      const rposX = node.size[0] - margin - innerMargin - innerMargin;
      ctx.textAlign = "center";
      ctx.fillText("Strength", rposX - drawStrengthPart.WIDTH_TOTAL / 2, midY);
    }
    ctx.restore();
  }
  onToggleDown(event, pos, node) {
    node.toggleAllLoras();
    this.cancelMouseDown();
    return true;
  }
}

// ---------------------------------------------------------------------
// Row widget: toggle + lora name + strength (own value per row)
// ---------------------------------------------------------------------

const DEFAULT_ROW_VALUE = { on: true, lora: "None", strengths: "1.0" };

class LoraRowWidget extends BaseWidget {
  constructor(name) {
    super(name);
    this.haveMouseMovedStrength = false;
    this._value = { ...DEFAULT_ROW_VALUE };
    this.hitAreas = {
      toggle: { bounds: [0, 0], onDown: this.onToggleDown.bind(this) },
      lora: { bounds: [0, 0], onClick: this.onLoraClick.bind(this) },
      strengthDec: { bounds: [0, 0], onClick: this.onStrengthDecDown.bind(this) },
      strengthVal: { bounds: [0, 0], onClick: this.onStrengthValUp.bind(this) },
      strengthInc: { bounds: [0, 0], onClick: this.onStrengthIncDown.bind(this) },
      strengthAny: { bounds: [0, 0], onMove: this.onStrengthAnyMove.bind(this) },
    };
  }

  set value(v) {
    if (v && typeof v === "object") {
      this._value = { ...DEFAULT_ROW_VALUE, ...v };
    } else {
      this._value = { ...DEFAULT_ROW_VALUE };
    }
  }
  get value() {
    return this._value;
  }

  setLora(lora) {
    this._value.lora = lora;
  }

  draw(ctx, node, w, posY, height) {
    ctx.save();
    const margin = 10;
    const innerMargin = margin * 0.33;
    const lowQuality = isLowQuality();
    const midY = posY + height * 0.5;
    let posX = margin;

    drawRoundedRectangle(ctx, { pos: [posX, posY], size: [node.size[0] - margin * 2, height] });
    this.hitAreas.toggle.bounds = drawTogglePart(ctx, { posX, posY, height, value: this.value.on });
    posX += this.hitAreas.toggle.bounds[1] + innerMargin;

    if (lowQuality) {
      ctx.restore();
      return;
    }

    if (!this.value.on) {
      ctx.globalAlpha = (app.canvas.editor_alpha ?? 1) * 0.4;
    }
    ctx.fillStyle = LiteGraph.WIDGET_TEXT_COLOR;

    let rposX = node.size[0] - margin - innerMargin - innerMargin;
    const strengthText = String(this.value.strengths ?? "1.0");

    const [leftArrow, textBounds, rightArrow] = drawStrengthPart(ctx, {
      posX: rposX,
      posY,
      height,
      text: strengthText,
    });
    this.hitAreas.strengthDec.bounds = leftArrow;
    this.hitAreas.strengthVal.bounds = textBounds;
    this.hitAreas.strengthInc.bounds = rightArrow;
    this.hitAreas.strengthAny.bounds = [leftArrow[0], rightArrow[0] + rightArrow[1] - leftArrow[0]];
    rposX = leftArrow[0] - innerMargin;

    const loraWidth = rposX - posX;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const loraLabel = String(this.value.lora || "None");
    ctx.fillText(fitString(ctx, loraLabel, loraWidth), posX, midY);
    this.hitAreas.lora.bounds = [posX, loraWidth];

    ctx.globalAlpha = app.canvas.editor_alpha ?? 1;
    ctx.restore();
  }

  onToggleDown() {
    this.value.on = !this.value.on;
    this.cancelMouseDown();
    return true;
  }

  onLoraClick(event, pos, node) {
    showLoraChooser(event, (value) => {
      if (typeof value === "string") {
        this.value.lora = value;
      }
      node.setDirtyCanvas(true, true);
    });
    this.cancelMouseDown();
  }

  onStrengthDecDown() {
    this.stepStrength(-1);
  }
  onStrengthIncDown() {
    this.stepStrength(1);
  }
  onStrengthAnyMove(event) {
    if (event.deltaX) {
      this.haveMouseMovedStrength = true;
      this.shiftStrengths(event.deltaX * 0.05);
    }
  }
  onStrengthValUp(event) {
    if (this.haveMouseMovedStrength) return;
    const canvas = app.canvas;
    canvas.prompt(
      "Strength(s) — a single value, or comma-separated to plot several (e.g. 0.8,0.9,1.0)",
      String(this.value.strengths ?? "1.0"),
      (v) => (this.value.strengths = String(v)),
      event
    );
  }
  onMouseUp(event, pos, node) {
    super.onMouseUp && super.onMouseUp(event, pos, node);
    this.haveMouseMovedStrength = false;
  }

  // Step: if the row has a single numeric strength, nudge it by +/-0.05.
  // If it's a comma-separated list, nudge every value in the list together
  // (keeps the relative spread intact while moving the whole plot range).
  stepStrength(direction) {
    const step = 0.05 * direction;
    this.shiftStrengths(step);
  }

  shiftStrengths(delta) {
    const raw = String(this.value.strengths ?? "1.0");
    const parts = raw.split(",").map((s) => s.trim()).filter((s) => s.length);
    if (!parts.length) {
      this.value.strengths = (1 + delta).toFixed(2);
      return;
    }
    const nums = parts.map((p) => {
      const n = parseFloat(p);
      return Number.isFinite(n) ? n : 1;
    });
    const shifted = nums.map((n) => Math.round((n + delta) * 100) / 100);
    this.value.strengths = shifted.map((n) => n.toFixed(2)).join(",");
  }
}

// ---------------------------------------------------------------------
// Simple lora chooser (context menu of available lora files)
// ---------------------------------------------------------------------

let lorasListPromise = null;
function getLorasList(force = false) {
  if (!lorasListPromise || force) {
    lorasListPromise = api
      .getNodeDefs()
      .then((defs) => {
        // Prefer LoraLoader's declared combo list; fall back to any node with a lora combo.
        const candidates = ["LoraLoader", "LoraLoaderModelOnly"];
        for (const name of candidates) {
          const def = defs && defs[name];
          const input = def && def.input && (def.input.required || def.input.optional);
          const key = input && Object.keys(input).find((k) => k.toLowerCase().includes("lora_name"));
          if (key && Array.isArray(input[key][0])) {
            return input[key][0];
          }
        }
        return [];
      })
      .catch(() => []);
  }
  return lorasListPromise;
}

function showLoraChooser(event, callback) {
  getLorasList().then((loras) => {
    const menuItems = [
      { content: "None", callback: () => callback("None") },
      ...loras.map((l) => ({ content: l, callback: () => callback(l) })),
    ];
    new LiteGraph.ContextMenu(menuItems, {
      event,
      title: "Choose a LoRA",
      scale: Math.max(1, (app.canvas.ds && app.canvas.ds.scale) || 1),
      className: "dark",
    });
  });
}

// ---------------------------------------------------------------------
// Node-level registration
// ---------------------------------------------------------------------

app.registerExtension({
  name: "loraplotnode.PowerStyleUI",
  async beforeRegisterNodeDef(nodeType, nodeData) {
    if (nodeData.name !== NODE_TYPE) return;

    let rowCounter = 0;

    nodeType.prototype.hasLoraRows = function () {
      return !!(this.widgets || []).find((w) => w instanceof LoraRowWidget);
    };

    nodeType.prototype.allLorasState = function () {
      let allOn = true;
      let allOff = true;
      let any = false;
      for (const widget of this.widgets || []) {
        if (widget instanceof LoraRowWidget) {
          any = true;
          const on = widget.value?.on;
          allOn = allOn && on === true;
          allOff = allOff && on === false;
        }
      }
      if (!any) return false;
      if (allOn) return true;
      if (allOff) return false;
      return null;
    };

    nodeType.prototype.toggleAllLoras = function () {
      const allOn = this.allLorasState();
      const toggledTo = !allOn;
      for (const widget of this.widgets || []) {
        if (widget instanceof LoraRowWidget) {
          widget.value.on = toggledTo;
        }
      }
    };

    nodeType.prototype.addNewLoraRow = function (lora) {
      rowCounter++;
      const widget = this.addCustomWidget(new LoraRowWidget("lora_" + rowCounter));
      if (lora) widget.setLora(lora);
      if (this._addLoraSpacer) {
        const idx = this.widgets.indexOf(this._addLoraSpacer);
        const cur = this.widgets.indexOf(widget);
        if (cur !== -1 && idx !== -1) {
          this.widgets.splice(cur, 1);
          this.widgets.splice(idx, 0, widget);
        }
      }
      const computed = this.computeSize();
      this.size[1] = Math.max(this.size[1], computed[1]);
      this.setDirtyCanvas(true, true);
      return widget;
    };

    nodeType.prototype.addNonRowWidgets = function () {
      if (this._nonRowWidgetsAdded) return;
      this._nonRowWidgetsAdded = true;
      this.addCustomWidget(new DividerWidget({ marginTop: 4, marginBottom: 0, thickness: 0 }));
      this.addCustomWidget(new LoraHeaderWidget());
      this._addLoraSpacer = this.addCustomWidget(new DividerWidget({ marginTop: 4, marginBottom: 0, thickness: 0 }));
      this.addCustomWidget(
        new AddLoraButtonWidget((event) => {
          getLorasList(true).then((loras) => {
            const menuItems = loras.map((l) => ({ content: l, callback: () => this.addNewLoraRow(l) }));
            new LiteGraph.ContextMenu(menuItems, {
              event,
              title: "Add a LoRA",
              scale: Math.max(1, (app.canvas.ds && app.canvas.ds.scale) || 1),
              className: "dark",
            });
          });
          return true;
        })
      );
    };

    const onNodeCreated = nodeType.prototype.onNodeCreated;
    nodeType.prototype.onNodeCreated = function () {
      const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
      this.addNonRowWidgets();
      const computed = this.computeSize();
      this.size = this.size || [0, 0];
      this.size[0] = Math.max(this.size[0], computed[0], 340);
      this.size[1] = Math.max(this.size[1], computed[1]);
      this.setDirtyCanvas(true, true);
      return r;
    };

    // Rebuild lora row widgets from saved workflow data.
    const onConfigure = nodeType.prototype.configure;
    nodeType.prototype.configure = function (info) {
      while (this.widgets && this.widgets.length) this.removeWidget(0);
      this._nonRowWidgetsAdded = false;
      this._addLoraSpacer = null;
      const tempWidth = info.size ? info.size[0] : this.size?.[0];
      const tempHeight = info.size ? info.size[1] : this.size?.[1];
      if (onConfigure) onConfigure.call(this, info);
      for (const wv of info.widgets_values || []) {
        if (wv && typeof wv === "object" && wv.lora !== undefined) {
          const widget = this.addNewLoraRow();
          widget.value = { ...wv };
        }
      }
      this.addNonRowWidgets();
      if (tempWidth) this.size[0] = tempWidth;
      if (tempHeight) this.size[1] = Math.max(tempHeight, this.computeSize()[1]);
    };

    // Right-click on a row: Toggle / Move Up / Move Down / Remove.
    const getSlotInPosition = nodeType.prototype.getSlotInPosition;
    nodeType.prototype.getSlotInPosition = function (canvasX, canvasY) {
      const slot = getSlotInPosition ? getSlotInPosition.apply(this, arguments) : undefined;
      if (!slot) {
        let lastWidget = null;
        for (const widget of this.widgets || []) {
          if (widget.last_y == null) continue;
          if (canvasY > this.pos[1] + widget.last_y) {
            lastWidget = widget;
            continue;
          }
          break;
        }
        if (lastWidget instanceof LoraRowWidget) {
          return { widget: lastWidget, output: { type: "LORA ROW" } };
        }
      }
      return slot;
    };

    const getSlotMenuOptions = nodeType.prototype.getSlotMenuOptions;
    nodeType.prototype.getSlotMenuOptions = function (slot) {
      if (slot?.widget instanceof LoraRowWidget) {
        const widget = slot.widget;
        const index = this.widgets.indexOf(widget);
        const prevIsRow = this.widgets[index - 1] instanceof LoraRowWidget;
        const nextIsRow = this.widgets[index + 1] instanceof LoraRowWidget;
        const menuItems = [
          {
            content: `${widget.value.on ? "⚫" : "🟢"} Toggle ${widget.value.on ? "Off" : "On"}`,
            callback: () => {
              widget.value.on = !widget.value.on;
            },
          },
          {
            content: "⬆️ Move Up",
            disabled: !prevIsRow,
            callback: () => {
              this.widgets.splice(index, 1);
              this.widgets.splice(index - 1, 0, widget);
            },
          },
          {
            content: "⬇️ Move Down",
            disabled: !nextIsRow,
            callback: () => {
              this.widgets.splice(index, 1);
              this.widgets.splice(index + 1, 0, widget);
            },
          },
          {
            content: "🗑️ Remove",
            callback: () => {
              this.removeWidget(widget);
            },
          },
        ];
        new LiteGraph.ContextMenu(menuItems, { title: "LORA ROW" });
        return undefined;
      }
      return getSlotMenuOptions ? getSlotMenuOptions.apply(this, arguments) : undefined;
    };
  },
});
