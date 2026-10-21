// Adds DC360's own parts (dc360/src, dc360/img: see PARTS below) to Logic's source before it is built.
// Usage (from this repository's root): node dc360/patch.js <path to Logic's checkout>
// Every change must find its place exactly; if Logic's source has moved on and one does not, the build stops
// here rather than publishing a Logic without the DC360 parts.
const fs = require('fs');
const path = require('path');

const logic = path.resolve(process.argv[2] || 'logic');
const sim = path.join(logic, 'simulator');
const here = __dirname;

function copyDir(from, to) {
    for (const name of fs.readdirSync(from)) {
        const f = path.join(from, name);
        const t = path.join(to, name);
        if (fs.statSync(f).isDirectory()) {
            fs.mkdirSync(t, { recursive: true });
            copyDir(f, t);
        } else {
            fs.copyFileSync(f, t);
            console.log('copied ' + path.relative(logic, t));
        }
    }
}

function edit(file, label, fn) {
    const p = path.join(sim, 'src', file);
    const before = fs.readFileSync(p, 'utf8');
    const after = fn(before);
    if (after === before) {
        throw new Error(file + ': could not ' + label);
    }
    fs.writeFileSync(p, after);
    console.log(file + ': ' + label);
}

// Replaces text that must appear exactly once.
function once(src, find, repl) {
    const n = src.split(find).length - 1;
    if (n !== 1) {
        throw new Error('expected "' + find + '" once, found ' + n);
    }
    return src.replace(find, repl);
}

// Inserts text after the line matching re (exactly `times` matches, default 1), with that line's indent.
function afterLine(src, re, text, times) {
    const lines = src.split('\n');
    let n = 0;
    const out = [];
    for (const line of lines) {
        out.push(line);
        if (re.test(line)) {
            n++;
            const indent = line.match(/^\s*/)[0];
            text.split('\n').forEach(t => out.push(indent + t));
        }
    }
    if (n !== (times || 1)) {
        throw new Error('expected ' + (times || 1) + ' line(s) matching ' + re + ', found ' + n);
    }
    return out.join('\n');
}

copyDir(path.join(here, 'src'), path.join(sim, 'src'));
copyDir(path.join(here, 'img'), path.join(sim, 'img'));

// DC360's parts: [Def, file in components/, button / picture name, hover text, button caption, button params]. The
// Push Button and Light Switch are Logic's own IN with a DC360 look (LOOKS below), so they have no Def.
const PARTS = [
    ['DC360BulbDef', 'DC360Lights', 'DC360Bulb', 'Light bulb: lights up when its input is 1', 'Light Bulb'],
    ['DC360LampDef', 'DC360Lights', 'DC360Lamp', 'Table lamp: lights up when its input is 1', 'Table Lamp'],
    ['DC360LedDef', 'DC360Led', 'DC360Led', 'LED: on for 1, off for 0, in any colour (right-click)', 'LED', '{ bits: 1 }'],
    ['DC360LedDef', 'DC360Led', 'DC360Leds', 'LEDs for a binary number: 1, 2, 4 or 8 LEDs, any colour (right-click)', 'Binary LEDs', '{ bits: 4 }'],
    ['DC360BellDef', 'DC360Panels', 'DC360Bell', 'Alarm bell: shakes and rings while its input is 1', 'Alarm Bell'],
    ['DC360TrafficDef', 'DC360Panels', 'DC360Traffic', 'UK traffic lights: one input each for red, amber and green', 'Traffic Lights'],
    ['DC360CrossingDef', 'DC360Panels', 'DC360Crossing', 'UK crossing lights: red, amber, green, and the red and green man', 'Crossing'],
    ['DC360DoorDef', 'DC360Panels', 'DC360Door', 'Door entry panel: one input lights NO ENTRY (red), the other ENTER (green)', 'Door Entry'],
];
// Inputs that are Logic's own IN with a DC360 picture: [button / picture name, hover text, button caption, look].
// "push" is Logic's own push-button IN; "switch" is an IN with dc360look "switch" (saved with the circuit).
const LOOKS = [
    ['DC360PushButton', 'Push button: an input that is 1 only while you hold it down', 'Push Button', 'push'],
    ['DC360LightSwitch', 'Light switch: click it to switch it on (1) or off (0); it stays that way', 'Light Switch', 'switch'],
];

const files = [...new Set(PARTS.map(p => p[1]))];
const imports = files.map(f => 'import { ' + [...new Set(PARTS.filter(p => p[1] === f).map(p => p[0]))].join(', ') + ' } from "./components/' + f + '"').join('\n');
const defs = [...new Set(PARTS.map(p => p[0]))];

edit('ComponentFactory.ts', 'register the DC360 parts and give the Push Button and Light Switch their looks', src => {
    src = afterLine(src, /^import \{ DisplayBar, DisplayBarDef \} from "\.\/components\/DisplayBar"\r?$/, imports);
    src = afterLine(src, /^\s+PixelDef,\r?$/, defs.map(d => d + ',').join('\n'));
    // A button marked data-dc360look gives an IN with that look.
    return afterLine(src, /^\s+const params = paramsStr === undefined \? undefined : JSON5\.parse\(paramsStr\) as Record<string, unknown>\r?$/,
        'const dc360look = (elem.dataset as any).dc360look\n' +
        'if (dc360look !== undefined) {\n' +
        '    const lookComp: any = this.getMaker(compDataset.type)?.make(parent, params)\n' +
        '    if (dc360look === "push") { lookComp?.doSetIsPushButton?.(true) } else if (lookComp !== undefined) { lookComp._dc360look = dc360look }\n' +
        '    return lookComp\n' +
        '}');
});

edit('ComponentMenu.ts', 'add the DC360 parts to Input/Output', src => {
    src = afterLine(src, /^import \{ DisplayBarDef \} from "\.\/components\/DisplayBar"\r?$/, imports);
    src = afterLine(src, /^\s+InputDef\.button\(\{ bits: 1 \}, "Input1"\),\r?$/, LOOKS.map(l => 'InputDef.button({ bits: 1 }, "' + l[0] + '"),').join('\n'));
    src = afterLine(src, /^\s+PixelDef\.button\(.*"Pixel".*\),\r?$/, PARTS.map(p => p[0] + '.button(' + (p[5] ? p[5] + ', ' : '') + '"' + p[2] + '"),').join('\n'));
    // The Push Button's and Light Switch's buttons are marked, so the IN made from them gets that look.
    const marks = '{ ' + LOOKS.map(l => l[0] + ': "' + l[3] + '"').join(', ') + ' } as Record<string, string>';
    return afterLine(src, /^\s+const isGate = item\.type\.startsWith\(GateTypePrefix\)\r?$/,
        'if ((' + marks + ')[stringsKey] !== undefined) { (compButton.dataset as any).dc360look = (' + marks + ')[stringsKey] }');
});

// The button names, in every language Logic has (its English and French lists both have the light bar).
edit('strings.ts', 'name the DC360 parts\' buttons', src => {
    const n = (src.match(/^\s+DisplayBar: \[".*"\],\r?$/gm) || []).length;
    const lines = [...PARTS.map(p => [p[2], p[3], p[4]]), ...LOOKS].map(p => p[0] + ': ["' + p[1] + '", "' + p[2] + '"],').join('\n');
    return afterLine(src, /^\s+DisplayBar: \[".*"\],\r?$/, lines, n || 1);
});

edit('images.ts', 'add the DC360 parts\' pictures', src => {
    const names = [...PARTS.map(p => p[2]), ...LOOKS.map(l => l[0])];
    src = afterLine(src, /^import DisplayBar from '\.\.\/img\/DisplayBar\.svg'; \/\/ @ts-ignore\r?$/,
        names.map(n => "import " + n + " from '../img/" + n + ".svg'; // @ts-ignore").join('\n'));
    return afterLine(src, /^\s+DisplayBar,\r?$/, names.map(n => n + ',').join('\n'));
});

// An IN with a DC360 look is drawn with its picture (dc360/src/components/DC360InputLooks.ts), not as the IN circle:
// a push button as a button, a light switch as a switch. The light switch's look is saved with the circuit.
edit('components/Input.ts', 'draw push buttons and light switches with their pictures', src => {
    src = afterLine(src, /^import \{ Node, NodeIn, NodeOut \} from "\.\/Node"\r?$/, 'import { dc360DrawLightSwitch, dc360DrawPushButton } from "./DC360InputLooks"');
    src = once(src, '            this.doDrawSingle(g, ctx, this.outputs.Out[0])',
        '            if ((this as any)._dc360look === "switch") { dc360DrawLightSwitch(this, g, ctx, this.outputs.Out[0]); return }\n' +
        '            if ((this as any).isPushButton === true) { dc360DrawPushButton(this, g, ctx, this.outputs.Out[0]); return }\n' +
        '            this.doDrawSingle(g, ctx, this.outputs.Out[0])');
    src = afterLine(src, /^\s+isPushButton: typeOrUndefined\(t\.boolean\),\r?$/, 'dc360look: typeOrUndefined(t.string),');
    src = once(src, 'this._isPushButton = saved?.isPushButton ?? InputDef.aults.isPushButton',
        'this._isPushButton = saved?.isPushButton ?? InputDef.aults.isPushButton\n        ;(this as any)._dc360look = (saved as any)?.dc360look');
    return once(src, 'isPushButton: (this._isPushButton !== InputDef.aults.isPushButton) ? this._isPushButton : undefined,',
        'isPushButton: (this._isPushButton !== InputDef.aults.isPushButton) ? this._isPushButton : undefined,\n            dc360look: (this as any)._dc360look,');
});

// Bigger parts on the drawing, for younger students (zoom stays at 100%, for accessibility only):
// - every part is drawn on a bigger grid square (10 px -> 15 px), so gates and all other parts are 1.5 times bigger;
// - the 1-bit IN and OUT circles are 40 px (from 26 px) with bigger 0 / 1 text (18 px -> 26 px).
edit('drawutils.ts', 'make all parts bigger on the drawing', src => {
    src = once(src, 'export const GRID_STEP = 10', 'export const GRID_STEP = 15');
    src = once(src, 'export const INPUT_OUTPUT_DIAMETER = 26', 'export const INPUT_OUTPUT_DIAMETER = 40');
    // drawValueTextCentered is only used for the 1-bit IN and OUT: those get the big text
    src = once(src, 'drawValueText(g, value, comp.posX, comp.posY, opts)', 'drawValueText(g, value, comp.posX, comp.posY, { ...opts, big: true } as any)');
    src = once(src, 'const sizeStrBig = small ? "12" : "18"', 'const sizeStrBig = small ? "12" : (opts as any)?.big ? "26" : "18"');
    return once(src, 'const sizeStrSmall = small ? "10" : "16"', 'const sizeStrSmall = small ? "10" : (opts as any)?.big ? "22" : "16"');
});

console.log('DC360 parts added.');
