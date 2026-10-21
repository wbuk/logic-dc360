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
// Push Button is Logic's own IN, made a push button (see ComponentMenu and ComponentFactory below), so it has no Def.
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
const PUSH = ['DC360PushButton', 'Push button: an input that is 1 only while you hold it down', 'Push Button'];

const files = [...new Set(PARTS.map(p => p[1]))];
const imports = files.map(f => 'import { ' + [...new Set(PARTS.filter(p => p[1] === f).map(p => p[0]))].join(', ') + ' } from "./components/' + f + '"').join('\n');
const defs = [...new Set(PARTS.map(p => p[0]))];

edit('ComponentFactory.ts', 'register the DC360 parts and make the Push Button a push button', src => {
    src = afterLine(src, /^import \{ DisplayBar, DisplayBarDef \} from "\.\/components\/DisplayBar"\r?$/, imports);
    src = afterLine(src, /^\s+PixelDef,\r?$/, defs.map(d => d + ',').join('\n'));
    // A button marked data-dc360push gives an IN that is a push button.
    return afterLine(src, /^\s+const params = paramsStr === undefined \? undefined : JSON5\.parse\(paramsStr\) as Record<string, unknown>\r?$/,
        'if (elem.dataset.dc360push === "1") {\n    const pushComp = this.getMaker(compDataset.type)?.make(parent, params)\n    ;(pushComp as any)?.doSetIsPushButton?.(true)\n    return pushComp\n}');
});

edit('ComponentMenu.ts', 'add the DC360 parts to Input/Output', src => {
    src = afterLine(src, /^import \{ DisplayBarDef \} from "\.\/components\/DisplayBar"\r?$/, imports);
    src = afterLine(src, /^\s+InputDef\.button\(\{ bits: 1 \}, "Input1"\),\r?$/, 'InputDef.button({ bits: 1 }, "' + PUSH[0] + '"),');
    src = afterLine(src, /^\s+PixelDef\.button\(.*"Pixel".*\),\r?$/, PARTS.map(p => p[0] + '.button(' + (p[5] ? p[5] + ', ' : '') + '"' + p[2] + '"),').join('\n'));
    // The Push Button's button is marked, so the part made from it is a push button.
    return afterLine(src, /^\s+const isGate = item\.type\.startsWith\(GateTypePrefix\)\r?$/,
        'if (stringsKey === "' + PUSH[0] + '") { (compButton.dataset as any).dc360push = "1" }');
});

// The button names, in every language Logic has (its English and French lists both have the light bar).
edit('strings.ts', 'name the DC360 parts\' buttons', src => {
    const n = (src.match(/^\s+DisplayBar: \[".*"\],\r?$/gm) || []).length;
    const lines = [...PARTS.map(p => [p[2], p[3], p[4]]), PUSH].map(p => p[0] + ': ["' + p[1] + '", "' + p[2] + '"],').join('\n');
    return afterLine(src, /^\s+DisplayBar: \[".*"\],\r?$/, lines, n || 1);
});

edit('images.ts', 'add the DC360 parts\' pictures', src => {
    const names = [...PARTS.map(p => p[2]), PUSH[0]];
    src = afterLine(src, /^import DisplayBar from '\.\.\/img\/DisplayBar\.svg'; \/\/ @ts-ignore\r?$/,
        names.map(n => "import " + n + " from '../img/" + n + ".svg'; // @ts-ignore").join('\n'));
    return afterLine(src, /^\s+DisplayBar,\r?$/, names.map(n => n + ',').join('\n'));
});

console.log('DC360 parts added.');
