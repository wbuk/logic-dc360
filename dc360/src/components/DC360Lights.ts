// DC360 additions to Logic (github.com/wbuk/logic-dc360): a Light Bulb and a Table Lamp for the Input/Output section.
// Each is an output with one input, like Logic's own light bar: it lights up when its input is 1. Copied into
// simulator/src/components/ by dc360/patch.js before Logic is built.
import { COLOR_COMPONENT_BORDER, COLOR_HIGH_IMPEDANCE, COLOR_UNKNOWN, COMPONENT_OUTLINE_THICKNESS, DrawingRect, drawComponentName } from "../drawutils"
import { mods, tooltipContent } from "../htmlgen"
import { InteractionResult, LogicValue, isHighImpedance, isUnknown, toLogicValueRepr } from "../utils"
import { ComponentBase, ComponentName, ComponentNameRepr, Repr, defineComponent } from "./Component"
import { DrawContext, DrawableParent, GraphicsRendering, MenuItems } from "./Drawable"

const LIGHT_ON = "#ffd23f"
const LIGHT_GLOW = "rgba(255, 210, 63, 0.35)"
const GLASS_OFF = "#eef1f5"
const OUTLINE = "#333333"

function lightFill(v: LogicValue): string {
    return isUnknown(v) ? COLOR_UNKNOWN : isHighImpedance(v) ? COLOR_HIGH_IMPEDANCE : v ? LIGHT_ON : GLASS_OFF
}

const lightNodes = () => ({ ins: { I: [-3, 1, "w"] } } as const)

export const DC360BulbDef =
    defineComponent("bulb", true, true, {
        idPrefix: "bulb",
        button: { imgWidth: 32 },
        repr: { name: ComponentNameRepr },
        valueDefaults: {},
        size: () => ({ gridWidth: 4, gridHeight: 6 }),
        makeNodes: lightNodes,
        initialValue: () => false as LogicValue,
    })

export const DC360LampDef =
    defineComponent("lamp", true, true, {
        idPrefix: "lamp",
        button: { imgWidth: 32 },
        repr: { name: ComponentNameRepr },
        valueDefaults: {},
        size: () => ({ gridWidth: 4, gridHeight: 6 }),
        makeNodes: lightNodes,
        initialValue: () => false as LogicValue,
    })

export type DC360BulbRepr = Repr<typeof DC360BulbDef>
export type DC360LampRepr = Repr<typeof DC360LampDef>

abstract class DC360LightBase<TRepr extends DC360BulbRepr | DC360LampRepr> extends ComponentBase<TRepr, LogicValue, any, any, true, false> {

    protected _name: ComponentName

    protected constructor(parent: DrawableParent, def: any, saved?: TRepr) {
        super(parent, def, saved)
        this._name = saved?.name ?? undefined
    }

    public toJSON() {
        return {
            ...this.toJSONBase(),
            name: this._name,
        }
    }

    protected abstract get lightTitle(): string

    public override makeTooltip() {
        const v = this.value
        const state = isUnknown(v) || isHighImpedance(v) ? "Its input is not 0 or 1 yet." : v ? "It is on: its input is 1." : "It is off: its input is 0."
        return tooltipContent(this.lightTitle, mods(state))
    }

    protected doRecalcValue(): LogicValue {
        return (this.inputs as any).I.value
    }

    protected abstract drawLight(g: GraphicsRendering, b: DrawingRect, v: LogicValue): void

    protected override doDraw(g: GraphicsRendering, ctx: DrawContext) {
        const b = this.bounds()
        for (const node of this.allNodes()) {
            this.drawWireLineTo(g, node, b)
        }
        const v = this.parent.editor.options.hideOutputColors ? false : this.value
        g.save()
        g.lineWidth = 2
        g.strokeStyle = OUTLINE
        this.drawLight(g, b, v)
        g.restore()

        // No box round the light, except while it is pointed at or picked (then Logic's highlight colour).
        if (ctx.borderColor !== COLOR_COMPONENT_BORDER) {
            g.lineWidth = COMPONENT_OUTLINE_THICKNESS
            g.strokeStyle = ctx.borderColor
            g.stroke(b.outline(g))
        }

        if (this._name !== undefined) {
            const name = this._name
            ctx.inNonTransformedFrame(ctx => drawComponentName(g, ctx, name, toLogicValueRepr(v), this, true))
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

    public override pointerDoubleClicked(e: PointerEvent) {
        const superChange = super.pointerDoubleClicked(e)
        return superChange.isChange ? superChange : InteractionResult.NoChange
    }
}

export class DC360Bulb extends DC360LightBase<DC360BulbRepr> {

    public constructor(parent: DrawableParent, saved?: DC360BulbRepr) {
        super(parent, DC360BulbDef.from(parent), saved)
    }

    protected get lightTitle() { return "Light Bulb" }

    protected drawLight(g: GraphicsRendering, b: DrawingRect, v: LogicValue) {
        const cx = (b.left + b.right) / 2
        const w = b.right - b.left
        const r = w * 0.42
        const cy = b.top + r + 2
        const neckY = cy + r * 0.78
        const baseTop = b.bottom - w * 0.42
        const on = v === true

        // glow
        if (on) {
            g.fillStyle = LIGHT_GLOW
            g.beginPath()
            g.arc(cx, cy, r * 1.55, 0, 2 * Math.PI)
            g.fill()
        }

        // glass: a round top that narrows to the neck
        g.beginPath()
        g.arc(cx, cy, r, Math.PI * 0.78, Math.PI * 2.22)
        g.lineTo(cx + r * 0.42, baseTop)
        g.lineTo(cx - r * 0.42, baseTop)
        g.closePath()
        g.fillStyle = lightFill(v)
        g.fill()
        g.stroke()

        // filament
        g.beginPath()
        g.moveTo(cx - r * 0.3, neckY)
        g.lineTo(cx - r * 0.3, cy)
        g.lineTo(cx - r * 0.1, cy - r * 0.25)
        g.lineTo(cx + r * 0.1, cy)
        g.lineTo(cx + r * 0.3, cy - r * 0.25)
        g.lineTo(cx + r * 0.3, neckY)
        g.strokeStyle = on ? "#c2410c" : "#6b7280"
        g.lineWidth = 1.5
        g.stroke()

        // screw base
        g.lineWidth = 2
        g.strokeStyle = OUTLINE
        const bw = r * 0.95
        g.fillStyle = "#9ca3af"
        g.beginPath()
        g.rect(cx - bw / 2, baseTop, bw, b.bottom - baseTop - 3)
        g.fill()
        g.stroke()
        g.beginPath()
        for (let i = 1; i <= 2; i++) {
            const y = baseTop + i * (b.bottom - baseTop - 3) / 3
            g.moveTo(cx - bw / 2, y)
            g.lineTo(cx + bw / 2, y)
        }
        g.stroke()
        g.fillStyle = OUTLINE
        g.beginPath()
        g.rect(cx - bw / 4, b.bottom - 3, bw / 2, 3)
        g.fill()
    }
}
DC360BulbDef.impl = DC360Bulb

export class DC360Lamp extends DC360LightBase<DC360LampRepr> {

    public constructor(parent: DrawableParent, saved?: DC360LampRepr) {
        super(parent, DC360LampDef.from(parent), saved)
    }

    protected get lightTitle() { return "Table Lamp" }

    protected drawLight(g: GraphicsRendering, b: DrawingRect, v: LogicValue) {
        const cx = (b.left + b.right) / 2
        const w = b.right - b.left
        const h = b.bottom - b.top
        const shadeTop = b.top + 2
        const shadeBottom = b.top + h * 0.42
        const on = v === true

        // light shining down from the shade
        if (on) {
            g.fillStyle = LIGHT_GLOW
            g.beginPath()
            g.moveTo(cx - w * 0.32, shadeBottom)
            g.lineTo(cx + w * 0.32, shadeBottom)
            g.lineTo(cx + w * 0.5, b.bottom - 4)
            g.lineTo(cx - w * 0.5, b.bottom - 4)
            g.closePath()
            g.fill()
        }

        // stem and base
        g.fillStyle = "#9ca3af"
        g.beginPath()
        g.rect(cx - 2, shadeBottom, 4, b.bottom - shadeBottom - 5)
        g.fill()
        g.stroke()
        g.beginPath()
        g.rect(cx - w * 0.3, b.bottom - 6, w * 0.6, 5)
        g.fill()
        g.stroke()

        // bulb under the shade
        g.beginPath()
        g.arc(cx, shadeBottom, w * 0.1, 0, Math.PI)
        g.fillStyle = lightFill(v)
        g.fill()
        g.stroke()

        // shade
        g.beginPath()
        g.moveTo(cx - w * 0.2, shadeTop)
        g.lineTo(cx + w * 0.2, shadeTop)
        g.lineTo(cx + w * 0.44, shadeBottom)
        g.lineTo(cx - w * 0.44, shadeBottom)
        g.closePath()
        g.fillStyle = on ? LIGHT_ON : "#e7dcc4"
        g.fill()
        g.stroke()
    }
}
DC360LampDef.impl = DC360Lamp
