// DC360 additions to Logic (github.com/wbuk/logic-dc360): pictures for an IN instead of the IN circle, like the
// pictures in Input/Output. Called from Input.ts (see dc360/patch.js).
// - A push button: a grey base with a red cap that goes down while it is held.
// - A modern light switch (an IN with dc360look "switch"): a white plate with a rocker, which stays on or off.
import { COLOR_COMPONENT_BORDER, COMPONENT_OUTLINE_THICKNESS, INPUT_OUTPUT_DIAMETER, drawComponentName, drawWireLineToComponent } from "../drawutils"
import { LogicValue, Mode, isHighImpedance, isUnknown, toLogicValueRepr } from "../utils"
import { DrawContext, GraphicsRendering, PointerOverMode } from "./Drawable"
import { NodeOut } from "./Node"

function roundRect(g: GraphicsRendering, x: number, y: number, w: number, h: number, r: number) {
    g.beginPath()
    g.moveTo(x + r, y)
    g.lineTo(x + w - r, y)
    g.arcTo(x + w, y, x + w, y + r, r)
    g.lineTo(x + w, y + h - r)
    g.arcTo(x + w, y + h, x + w - r, y + h, r)
    g.lineTo(x + r, y + h)
    g.arcTo(x, y + h, x, y + h - r, r)
    g.lineTo(x, y + r)
    g.arcTo(x, y, x + r, y, r)
    g.closePath()
}

export function dc360DrawPushButton(comp: any, g: GraphicsRendering, ctx: DrawContext, output: NodeOut) {
    drawWireLineToComponent(g, output)

    const v: LogicValue = comp.parent.editor.options.hideInputColors ? false : output.value
    const pressed = v === true
    const d = INPUT_OUTPUT_DIAMETER
    const x = comp.posX
    const y = comp.posY
    const k = d / 40

    g.save()
    // base
    g.fillStyle = "#6b7280"
    roundRect(g, x - d / 2, y - 2 * k, d, d / 2 + 2 * k, 5 * k)
    g.fill()
    g.lineWidth = 2
    g.strokeStyle = "#1f2937"
    g.stroke()
    // cap: up when not pressed, down while held
    const capW = d * 0.62
    const capH = 12 * k
    const capY = pressed ? y - 6 * k : y - 14 * k
    g.fillStyle = isUnknown(v) || isHighImpedance(v) ? "#9ca3af" : pressed ? "#b91c1c" : "#ef4444"
    roundRect(g, x - capW / 2, capY, capW, capH + (pressed ? 3 * k : 8 * k), 4 * k)
    g.fill()
    g.stroke()
    // 0 / 1 on the base, below the cap
    g.fillStyle = "#ffffff"
    g.font = `bold ${Math.round(11 * k)}px sans-serif`
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.fillText(isUnknown(v) || isHighImpedance(v) ? "?" : pressed ? "1" : "0", x, y + 15 * k)
    g.restore()

    // pointed at or picked: Logic's highlight round it
    const over = ctx.pointerOver !== PointerOverMode.None && comp.parent.mode !== Mode.STATIC
    if (over && ctx.borderColor !== COLOR_COMPONENT_BORDER) {
        g.lineWidth = COMPONENT_OUTLINE_THICKNESS
        g.strokeStyle = ctx.borderColor
        roundRect(g, x - d / 2 - 3, y - 16 * k - 3, d + 6, d / 2 + 18 * k + 6, 6 * k)
        g.stroke()
    }

    if (comp.name !== undefined) {
        ctx.inNonTransformedFrame(ctx => drawComponentName(g, ctx, comp.name, toLogicValueRepr(v), comp, false))
    }
}

export function dc360DrawLightSwitch(comp: any, g: GraphicsRendering, ctx: DrawContext, output: NodeOut) {
    drawWireLineToComponent(g, output)

    const v: LogicValue = comp.parent.editor.options.hideInputColors ? false : output.value
    const on = v === true
    const unknown = isUnknown(v) || isHighImpedance(v)
    const d = INPUT_OUTPUT_DIAMETER
    const x = comp.posX
    const y = comp.posY
    const k = d / 40

    g.save()
    // the white plate
    g.fillStyle = "#f8fafc"
    roundRect(g, x - d / 2, y - d / 2, d, d, 6 * k)
    g.fill()
    g.lineWidth = 2
    g.strokeStyle = "#9ca3af"
    g.stroke()
    // the rocker: in the UK a switch is on when its bottom is pressed in
    const rw = d * 0.5
    const rh = d * 0.68
    const rx = x - rw / 2
    const ry = y - rh / 2
    g.fillStyle = "#ffffff"
    roundRect(g, rx, ry, rw, rh, 3 * k)
    g.fill()
    g.strokeStyle = "#6b7280"
    g.lineWidth = 1.5
    g.stroke()
    // the pressed-in half is shaded
    g.fillStyle = unknown ? "#d1d5db" : "#cbd5e1"
    roundRect(g, rx + 1.5, on ? y : ry + 1.5, rw - 3, rh / 2 - 1.5, 2.5 * k)
    g.fill()
    // a little light on the rocker when it is on
    g.beginPath()
    g.arc(x, ry + rh * 0.22, 2.5 * k, 0, 2 * Math.PI)
    g.fillStyle = unknown ? "#9ca3af" : on ? "#f59e0b" : "#e5e7eb"
    g.fill()
    // ON / OFF under the plate
    g.fillStyle = "#374151"
    g.font = `bold ${Math.round(10 * k)}px sans-serif`
    g.textAlign = "center"
    g.textBaseline = "top"
    g.fillText(unknown ? "?" : on ? "ON" : "OFF", x, y + d / 2 + 3 * k)
    g.restore()

    const over = ctx.pointerOver !== PointerOverMode.None && comp.parent.mode !== Mode.STATIC
    if (over && ctx.borderColor !== COLOR_COMPONENT_BORDER) {
        g.lineWidth = COMPONENT_OUTLINE_THICKNESS
        g.strokeStyle = ctx.borderColor
        roundRect(g, x - d / 2 - 3, y - d / 2 - 3, d + 6, d + 6, 7 * k)
        g.stroke()
    }

    if (comp.name !== undefined) {
        ctx.inNonTransformedFrame(ctx => drawComponentName(g, ctx, comp.name, toLogicValueRepr(v), comp, false))
    }
}
