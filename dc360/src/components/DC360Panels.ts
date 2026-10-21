// DC360 additions to Logic (github.com/wbuk/logic-dc360): UK Traffic Lights, Crossing Lights (with the red and green
// man), a Door Entry panel (NO ENTRY / ENTER) and an Alarm Bell, for the Input/Output section. Each lamp has its own
// input, so students build the logic that switches them. Copied into simulator/src/components/ by dc360/patch.js.
import { COLOR_COMPONENT_BORDER, COLOR_HIGH_IMPEDANCE, COLOR_UNKNOWN, COMPONENT_OUTLINE_THICKNESS, DrawingRect, GRID_STEP, drawComponentName } from "../drawutils"
import { mods, tooltipContent } from "../htmlgen"
import { LogicValue, isHighImpedance, isUnknown } from "../utils"
import { ComponentBase, ComponentName, ComponentNameRepr, Repr, defineComponent } from "./Component"
import { DrawContext, DrawableParent, GraphicsRendering, MenuItems } from "./Drawable"

const OUTLINE = "#333333"
// Sizes drawn in pixels follow the size of a grid square, so the parts grow with it.
const K = GRID_STEP / 10

// A lamp's colour: lit, dark, or Logic's own colours for "not 0 or 1 yet".
function lamp(v: LogicValue, on: string, off: string): string {
    return isUnknown(v) ? COLOR_UNKNOWN : isHighImpedance(v) ? COLOR_HIGH_IMPEDANCE : v ? on : off
}

const RED: [string, string] = ["#ef2b2b", "#4a1717"]
const AMBER: [string, string] = ["#ffb000", "#4a3a12"]
const GREEN: [string, string] = ["#2fd36b", "#123d22"]

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

function circle(g: GraphicsRendering, x: number, y: number, r: number, fill: string) {
    g.beginPath()
    g.arc(x, y, r, 0, 2 * Math.PI)
    g.fillStyle = fill
    g.fill()
    g.stroke()
}

// The labels of the inputs, inside the left edge, level with each input.
function inputLabels(g: GraphicsRendering, b: DrawingRect, labels: [string, number][]) {
    g.fillStyle = "#4b5563"
    g.font = `bold ${Math.round(9 * K)}px sans-serif`
    g.textAlign = "left"
    g.textBaseline = "middle"
    for (const [text, y] of labels) {
        g.fillText(text, b.left + 2 * K, y)
    }
}

const NAME = { name: ComponentNameRepr }

export const DC360TrafficDef =
    defineComponent("traffic", true, true, {
        idPrefix: "traffic",
        button: { imgWidth: 32 },
        repr: NAME,
        valueDefaults: {},
        size: () => ({ gridWidth: 6, gridHeight: 10 }),
        makeNodes: () => ({ ins: { R: [-4, -3, "w"], A: [-4, 0, "w"], G: [-4, 3, "w"] } } as const),
        initialValue: () => [false, false, false] as LogicValue[],
    })

export const DC360CrossingDef =
    defineComponent("crossing", true, true, {
        idPrefix: "crossing",
        button: { imgWidth: 32 },
        repr: NAME,
        valueDefaults: {},
        size: () => ({ gridWidth: 12, gridHeight: 10 }),
        makeNodes: () => ({ ins: { R: [-7, -4, "w"], A: [-7, -2, "w"], G: [-7, 0, "w"], RM: [-7, 2, "w"], GM: [-7, 4, "w"] } } as const),
        initialValue: () => [false, false, false, false, false] as LogicValue[],
    })

export const DC360DoorDef =
    defineComponent("door", true, true, {
        idPrefix: "door",
        button: { imgWidth: 32 },
        repr: NAME,
        valueDefaults: {},
        size: () => ({ gridWidth: 10, gridHeight: 8 }),
        makeNodes: () => ({ ins: { NO: [-6, -2, "w"], IN: [-6, 2, "w"] } } as const),
        initialValue: () => [false, false] as LogicValue[],
    })

export const DC360BellDef =
    defineComponent("bell", true, true, {
        idPrefix: "bell",
        button: { imgWidth: 32 },
        repr: NAME,
        valueDefaults: {},
        size: () => ({ gridWidth: 4, gridHeight: 5 }),
        makeNodes: () => ({ ins: { I: [-3, 1, "w"] } } as const),
        initialValue: () => [false] as LogicValue[],
    })

type PanelRepr = Repr<typeof DC360TrafficDef>

abstract class DC360PanelBase extends ComponentBase<PanelRepr, LogicValue[], any, any, true, false> {

    protected _name: ComponentName

    protected constructor(parent: DrawableParent, def: any, saved?: PanelRepr) {
        super(parent, def, saved)
        this._name = saved?.name ?? undefined
    }

    public toJSON() {
        return {
            ...this.toJSONBase(),
            name: this._name,
        }
    }

    protected abstract get title(): string
    protected abstract get inputNames(): string[]

    public override makeTooltip() {
        const v = this.value
        const parts = this.inputNames.map((n, i) => n + ": " + (isUnknown(v[i]) || isHighImpedance(v[i]) ? "?" : v[i] ? "on" : "off"))
        return tooltipContent(this.title, mods(parts.join(", ")))
    }

    protected doRecalcValue(): LogicValue[] {
        return this.inputs._all.map(n => n.value)
    }

    protected abstract drawPanel(g: GraphicsRendering, b: DrawingRect, v: LogicValue[]): void

    // Each label level with its own input.
    protected labelsAt(names: string[]): [string, number][] {
        return names.map((n, i) => [n, this.inputs._all[i].posY] as [string, number])
    }

    protected override doDraw(g: GraphicsRendering, ctx: DrawContext) {
        const b = this.bounds()
        for (const node of this.allNodes()) {
            this.drawWireLineTo(g, node, b)
        }
        const v = this.parent.editor.options.hideOutputColors ? this.value.map(() => false) : this.value
        g.save()
        g.lineWidth = 2
        g.strokeStyle = OUTLINE
        this.drawPanel(g, b, v)
        g.restore()

        // No box round it, except while it is pointed at or picked (then Logic's highlight colour).
        if (ctx.borderColor !== COLOR_COMPONENT_BORDER) {
            g.lineWidth = COMPONENT_OUTLINE_THICKNESS
            g.strokeStyle = ctx.borderColor
            g.stroke(b.outline(g))
        }

        if (this._name !== undefined) {
            const name = this._name
            ctx.inNonTransformedFrame(ctx => drawComponentName(g, ctx, name, "", this, true))
        }
    }

    private doSetName(name: ComponentName) {
        this._name = name
        this.requestRedraw({ why: "name changed" })
    }

    protected override makeComponentSpecificContextMenuItems(): MenuItems {
        return [
            ["mid", this.makeSetNameContextMenuItem(this._name, this.doSetName.bind(this))],
        ]
    }

    public override keyDown(e: KeyboardEvent): void {
        if (e.key === "Enter" && !e.altKey) {
            this.runSetNameDialog(this._name, this.doSetName.bind(this))
        } else {
            super.keyDown(e)
        }
    }
}

/* UK traffic lights: red at the top, amber, green; a black head on a white-edged backboard. */
function drawTrafficHead(g: GraphicsRendering, x: number, y: number, w: number, h: number, r: boolean | LogicValue, a: LogicValue, gr: LogicValue) {
    g.fillStyle = "#111111"
    roundRect(g, x, y, w, h, 5)
    g.fill()
    g.lineWidth = 2.5
    g.strokeStyle = "#f8fafc"
    g.stroke()
    g.lineWidth = 1.5
    g.strokeStyle = "#000000"
    const lr = Math.min(w * 0.34, h / 7.2)
    const cx = x + w / 2
    circle(g, cx, y + h / 6, lr, lamp(r as LogicValue, RED[0], RED[1]))
    circle(g, cx, y + h / 2, lr, lamp(a, AMBER[0], AMBER[1]))
    circle(g, cx, y + h * 5 / 6, lr, lamp(gr, GREEN[0], GREEN[1]))
}

export class DC360Traffic extends DC360PanelBase {
    public constructor(parent: DrawableParent, saved?: PanelRepr) {
        super(parent, DC360TrafficDef.from(parent), saved)
    }
    protected get title() { return "UK Traffic Lights" }
    protected get inputNames() { return ["Red", "Amber", "Green"] }
    protected drawPanel(g: GraphicsRendering, b: DrawingRect, v: LogicValue[]) {
        inputLabels(g, b, this.labelsAt(["R", "A", "G"]))
        drawTrafficHead(g, b.left + 14 * K, b.top + 2 * K, b.right - b.left - 16 * K, b.bottom - b.top - 4 * K, v[0], v[1], v[2])
    }
}
DC360TrafficDef.impl = DC360Traffic

/* The red standing man and the green walking man of a UK crossing. */
function drawMan(g: GraphicsRendering, cx: number, cy: number, s: number, walking: boolean, colour: string) {
    g.save()
    g.fillStyle = colour
    g.strokeStyle = colour
    g.lineCap = "round"
    g.beginPath()
    g.arc(cx, cy - s * 0.62, s * 0.16, 0, 2 * Math.PI)
    g.fill()
    g.lineWidth = s * 0.2
    g.beginPath()
    if (walking) {
        g.moveTo(cx, cy - s * 0.4); g.lineTo(cx, cy + s * 0.08)
        g.moveTo(cx, cy + s * 0.08); g.lineTo(cx - s * 0.3, cy + s * 0.7)
        g.moveTo(cx, cy + s * 0.08); g.lineTo(cx + s * 0.32, cy + s * 0.68)
        g.moveTo(cx, cy - s * 0.3); g.lineTo(cx - s * 0.32, cy + s * 0.05)
        g.moveTo(cx, cy - s * 0.3); g.lineTo(cx + s * 0.3, cy - s * 0.02)
    } else {
        g.moveTo(cx, cy - s * 0.4); g.lineTo(cx, cy + s * 0.12)
        g.moveTo(cx - s * 0.08, cy + s * 0.12); g.lineTo(cx - s * 0.1, cy + s * 0.7)
        g.moveTo(cx + s * 0.08, cy + s * 0.12); g.lineTo(cx + s * 0.1, cy + s * 0.7)
        g.moveTo(cx - s * 0.12, cy - s * 0.32); g.lineTo(cx - s * 0.24, cy + s * 0.12)
        g.moveTo(cx + s * 0.12, cy - s * 0.32); g.lineTo(cx + s * 0.24, cy + s * 0.12)
    }
    g.stroke()
    g.restore()
}

export class DC360Crossing extends DC360PanelBase {
    public constructor(parent: DrawableParent, saved?: PanelRepr) {
        super(parent, DC360CrossingDef.from(parent), saved)
    }
    protected get title() { return "UK Crossing Lights" }
    protected get inputNames() { return ["Red", "Amber", "Green", "Red man", "Green man"] }
    protected drawPanel(g: GraphicsRendering, b: DrawingRect, v: LogicValue[]) {
        inputLabels(g, b, this.labelsAt(["R", "A", "G", "RM", "GM"]))
        const h = b.bottom - b.top - 4 * K
        drawTrafficHead(g, b.left + 22 * K, b.top + 2 * K, 36 * K, h, v[0], v[1], v[2])

        // the crossing box: red man above, green man below
        const x = b.left + 66 * K
        const w = b.right - x - 2 * K
        g.fillStyle = "#111111"
        roundRect(g, x, b.top + 2 * K, w, h, 5 * K)
        g.fill()
        g.lineWidth = 2.5
        g.strokeStyle = "#f8fafc"
        g.stroke()
        const s = Math.min(w, h / 2) * 0.62
        drawMan(g, x + w / 2, b.top + 2 * K + h / 4, s, false, lamp(v[3], RED[0], RED[1]))
        drawMan(g, x + w / 2, b.top + 2 * K + h * 3 / 4, s, true, lamp(v[4], GREEN[0], GREEN[1]))
    }
}
DC360CrossingDef.impl = DC360Crossing

export class DC360Door extends DC360PanelBase {
    public constructor(parent: DrawableParent, saved?: PanelRepr) {
        super(parent, DC360DoorDef.from(parent), saved)
    }
    protected get title() { return "Door Entry" }
    protected get inputNames() { return ["NO ENTRY", "ENTER"] }
    protected drawPanel(g: GraphicsRendering, b: DrawingRect, v: LogicValue[]) {
        inputLabels(g, b, this.labelsAt(["NO", "IN"]))
        const x = b.left + 20 * K
        const w = b.right - x - 2 * K
        const h = b.bottom - b.top - 4 * K
        g.fillStyle = "#374151"
        roundRect(g, x, b.top + 2 * K, w, h, 6 * K)
        g.fill()
        g.stroke()
        const sign = (y: number, text: string, value: LogicValue, colours: [string, string]) => {
            const on = value === true
            g.fillStyle = on ? colours[0] : "#1f2937"
            roundRect(g, x + 5 * K, y, w - 10 * K, h / 2 - 8 * K, 4 * K)
            g.fill()
            g.lineWidth = 1.5
            g.strokeStyle = "#000000"
            g.stroke()
            g.fillStyle = isUnknown(value) || isHighImpedance(value) ? COLOR_UNKNOWN : on ? "#ffffff" : colours[1]
            g.font = `bold ${Math.round(12 * K)}px sans-serif`
            g.textAlign = "center"
            g.textBaseline = "middle"
            g.fillText(text, x + w / 2, y + (h / 2 - 8 * K) / 2)
        }
        sign(b.top + 7 * K, "NO ENTRY", v[0], ["#e11d1d", "#7f1d1d"])
        sign(b.top + 2 * K + h / 2 + 3 * K, "ENTER", v[1], ["#16a34a", "#14532d"])
    }
}
DC360DoorDef.impl = DC360Door

/* An alarm bell: when its input is 1 it shakes, and keeps shaking until the input goes back to 0. */
export class DC360Bell extends DC360PanelBase {

    public constructor(parent: DrawableParent, saved?: PanelRepr) {
        super(parent, DC360BellDef.from(parent), saved)
    }
    protected get title() { return "Alarm Bell" }
    protected get inputNames() { return ["Bell"] }

    // Asking for another redraw while drawing keeps Logic's animation-frame loop going, so the bell keeps shaking.
    private ring() {
        this.requestRedraw({ why: "bell ringing" })
    }

    protected drawPanel(g: GraphicsRendering, b: DrawingRect, v: LogicValue[]) {
        const on = v[0] === true
        const cx = (b.left + b.right) / 2
        const w = b.right - b.left
        const top = b.top + 4 * K
        const bottom = b.bottom - 9 * K
        const angle = on ? Math.sin(Date.now() / 45) * 0.28 : 0

        g.save()
        g.translate(cx, top)
        g.rotate(angle)

        // the bell
        g.beginPath()
        g.moveTo(-w * 0.12, 4 * K)
        g.quadraticCurveTo(-w * 0.36, 8 * K, -w * 0.36, (bottom - top) * 0.6)
        g.lineTo(-w * 0.46, bottom - top)
        g.lineTo(w * 0.46, bottom - top)
        g.lineTo(w * 0.36, (bottom - top) * 0.6)
        g.quadraticCurveTo(w * 0.36, 8 * K, w * 0.12, 4 * K)
        g.closePath()
        g.fillStyle = lamp(v[0], "#facc15", "#d4a017")
        g.fill()
        g.stroke()
        // the top knob and the clapper
        circle(g, 0, 2 * K, 3 * K, "#9ca3af")
        circle(g, 0, bottom - top + 4 * K, 3.5 * K, "#6b7280")
        g.restore()

        // ringing lines either side
        if (on) {
            g.lineWidth = 2
            g.strokeStyle = "#ef4444"
            g.beginPath()
            for (const side of [-1, 1]) {
                const x = cx + side * w * 0.52
                g.moveTo(x, top + 10 * K); g.lineTo(x + side * 5 * K, top + 6 * K)
                g.moveTo(x, top + 18 * K); g.lineTo(x + side * 7 * K, top + 18 * K)
                g.moveTo(x, top + 26 * K); g.lineTo(x + side * 5 * K, top + 30 * K)
            }
            g.stroke()
            this.ring()
        }
    }
}
DC360BellDef.impl = DC360Bell
