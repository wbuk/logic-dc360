// DC360 addition to Logic (github.com/wbuk/logic-dc360): LEDs for binary numbers. 1, 2, 4 or 8 LEDs in a row, one
// input each (from above; bit 0 on the right, like a written binary number), each showing 1 or 0 under it, in any
// colour (right-click > LED colour). Copied into simulator/src/components/ by dc360/patch.js.
import * as t from "io-ts"
import { COLOR_COMPONENT_BORDER, COLOR_HIGH_IMPEDANCE, COLOR_UNKNOWN, COMPONENT_OUTLINE_THICKNESS, drawComponentName } from "../drawutils"
import { mods, span, style, title, tooltipContent } from "../htmlgen"
import { template } from "../strings"
import { ArrayFillWith, InteractionResult, LogicValue, isHighImpedance, isUnknown, typeOrUndefined } from "../utils"
import { ComponentName, ComponentNameRepr, ParametrizedComponentBase, Repr, ResolvedParams, defineParametrizedComponent, groupHorizontal, param } from "./Component"
import { DrawContext, DrawableParent, GraphicsRendering, MenuData, MenuItems } from "./Drawable"

const LED_SPACING = 3 // grid steps between LEDs
const DEFAULT_COLOUR = "#ff2a2a"
const QUICK_COLOURS: [string, string][] = [
    ["Red", "#ff2a2a"], ["Orange", "#ff8a00"], ["Yellow", "#ffd400"], ["Green", "#22d35a"],
    ["Blue", "#2f7bff"], ["Purple", "#a855f7"], ["Pink", "#ff4fb8"], ["White", "#f5f7ff"],
]

export const DC360LedDef =
    defineParametrizedComponent("led", true, true, {
        variantName: ({ bits }) => `led-${bits}`,
        idPrefix: "led",
        button: { imgWidth: 32 },
        repr: {
            bits: typeOrUndefined(t.number),
            color: typeOrUndefined(t.string),
            name: ComponentNameRepr,
        },
        valueDefaults: {
            color: DEFAULT_COLOUR,
        },
        params: {
            bits: param(4, [1, 2, 4, 8]),
        },
        validateParams: ({ bits }) => ({
            numBits: bits,
        }),
        size: ({ numBits }) => ({
            gridWidth: LED_SPACING * numBits,
            gridHeight: 4,
        }),
        makeNodes: ({ numBits }) => ({
            ins: {
                In: groupHorizontal("n", 0, -3, numBits, LED_SPACING),
            },
        }),
        initialValue: (saved, { numBits }) => ArrayFillWith<LogicValue>(false, numBits),
    })

export type DC360LedRepr = Repr<typeof DC360LedDef>
export type DC360LedParams = ResolvedParams<typeof DC360LedDef>

// "#rrggbb" mixed towards dark grey: the colour of an LED that is off.
function dimmed(hex: string): string {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
    if (m === null) {
        return "#3a3a3a"
    }
    const mix = (c: string) => Math.round(parseInt(c, 16) * 0.28 + 0x30 * 0.72)
    return `rgb(${mix(m[1])}, ${mix(m[2])}, ${mix(m[3])})`
}

function safeColour(c: string | undefined): string {
    return c !== undefined && /^#[0-9a-f]{6}$/i.test(c) ? c : DEFAULT_COLOUR
}

export class DC360Led extends ParametrizedComponentBase<DC360LedRepr> {

    public readonly numBits: number
    private _color: string
    private _name: ComponentName

    public constructor(parent: DrawableParent, params: DC360LedParams, saved?: DC360LedRepr) {
        super(parent, DC360LedDef.with(params), saved)
        this.numBits = params.numBits
        this._color = safeColour(saved?.color)
        this._name = saved?.name ?? undefined
    }

    public toJSON() {
        return {
            ...this.toJSONBase(),
            bits: this.numBits === DC360LedDef.aults.bits ? undefined : this.numBits,
            color: this._color === DEFAULT_COLOUR ? undefined : this._color,
            name: this._name,
        }
    }

    public override makeTooltip() {
        const v = this.value
        const known = v.every(b => b === true || b === false)
        // bit 0 is on the right, so the binary number reads left to right as shown
        const bits = [...v].reverse().map(b => isUnknown(b) || isHighImpedance(b) ? "?" : b ? "1" : "0").join("")
        const denary = known ? v.reduce((n: number, b, i) => n + (b === true ? 1 << i : 0), 0) : undefined
        return tooltipContent(this.numBits === 1 ? "LED" : this.numBits + " LEDs",
            mods("Binary " + bits + (denary !== undefined && this.numBits > 1 ? " = " + denary + " in denary" : "")))
    }

    protected doRecalcValue(): LogicValue[] {
        return this.inputValues(this.inputs.In)
    }

    protected override doDraw(g: GraphicsRendering, ctx: DrawContext) {
        const b = this.bounds()
        for (const node of this.allNodes()) {
            this.drawWireLineTo(g, node, b)
        }
        const values = this.parent.editor.options.hideOutputColors ? ArrayFillWith<LogicValue>(false, this.numBits) : this.value
        const on = this._color
        const off = dimmed(on)
        const r = 9
        const cy = b.top + 14
        g.save()
        for (let i = 0; i < this.numBits; i++) {
            const node = this.inputs.In[i]
            const x = node.posX
            const v = values[i]
            const lit = v === true
            // glow
            if (lit) {
                g.fillStyle = on
                g.globalAlpha = 0.3
                g.beginPath()
                g.arc(x, cy, r + 5, 0, 2 * Math.PI)
                g.fill()
                g.globalAlpha = 1
            }
            // the LED
            g.beginPath()
            g.arc(x, cy, r, 0, 2 * Math.PI)
            g.fillStyle = isUnknown(v) ? COLOR_UNKNOWN : isHighImpedance(v) ? COLOR_HIGH_IMPEDANCE : lit ? on : off
            g.fill()
            g.lineWidth = 2
            g.strokeStyle = "#333333"
            g.stroke()
            // a little shine
            g.beginPath()
            g.arc(x - 3, cy - 3, 2.5, 0, 2 * Math.PI)
            g.fillStyle = "rgba(255,255,255,0.55)"
            g.fill()
            // 1 or 0 under it
            g.fillStyle = "#374151"
            g.font = "bold 11px sans-serif"
            g.textAlign = "center"
            g.textBaseline = "middle"
            g.fillText(isUnknown(v) || isHighImpedance(v) ? "?" : lit ? "1" : "0", x, b.bottom - 7)
        }
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

    private doSetColor(color: string) {
        this._color = safeColour(color)
        this.requestRedraw({ why: "color changed" })
    }

    // Any colour, with the browser's own colour picker.
    private pickColour() {
        const input = document.createElement("input")
        input.type = "color"
        input.value = this._color
        input.style.cssText = "position:fixed;left:-100px;top:-100px;width:1px;height:1px;opacity:0"
        document.body.appendChild(input)
        const done = () => {
            if (safeColour(input.value) !== this._color) {
                this.doSetColor(input.value)
                this.parent.ifEditing?.undoMgr.takeSnapshot(InteractionResult.SimpleChange)
                this.parent.editor.recalcPropagateAndDrawIfNeeded()
            }
        }
        input.addEventListener("input", done)
        input.addEventListener("change", () => { done(); input.remove() })
        input.click()
    }

    protected override makeComponentSpecificContextMenuItems(): MenuItems {
        const quick = QUICK_COLOURS.map(([name, colour]) => {
            const isCurrent = this._color.toLowerCase() === colour
            return MenuData.item(isCurrent ? "check" : "none",
                span(title(name), style(`display: inline-block; width: 120px; height: 16px; background-color: ${colour}; border: 1px solid #999`)),
                () => this.doSetColor(colour))
        })
        return [
            ["mid", MenuData.submenu("palette", "LED colour", [
                ...quick,
                MenuData.sep(),
                MenuData.item("palette", "Any colour…", () => this.pickColour()),
            ])],
            ["mid", this.makeSetNameContextMenuItem(this._name, this.doSetName.bind(this))],
            ["mid", MenuData.sep()],
            this.makeChangeParamsContextMenuItem("inputs", ["Number of LEDs", template("${val} LED$s{val}")], this.numBits, "bits"),
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
DC360LedDef.impl = DC360Led
