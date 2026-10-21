// Adds DC360's own parts (dc360/src, dc360/img) to Logic's source before it is built.
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

edit('ComponentFactory.ts', 'register the Light Bulb and Table Lamp', src => {
    src = afterLine(src, /^import \{ DisplayBar, DisplayBarDef \} from "\.\/components\/DisplayBar"\r?$/,
        'import { DC360BulbDef, DC360LampDef } from "./components/DC360Lights"');
    return afterLine(src, /^\s+PixelDef,\r?$/, 'DC360BulbDef,\nDC360LampDef,');
});

edit('ComponentMenu.ts', 'add the Light Bulb and Table Lamp to Input/Output', src => {
    src = afterLine(src, /^import \{ DisplayBarDef \} from "\.\/components\/DisplayBar"\r?$/,
        'import { DC360BulbDef, DC360LampDef } from "./components/DC360Lights"');
    return afterLine(src, /^\s+PixelDef\.button\(.*"Pixel".*\),\r?$/,
        'DC360BulbDef.button("DC360Bulb"),\nDC360LampDef.button("DC360Lamp"),');
});

// The button names, in every language Logic has (its English and French lists both have the light bar).
edit('strings.ts', 'name the Light Bulb and Table Lamp buttons', src => {
    const n = (src.match(/^\s+DisplayBar: \[".*"\],\r?$/gm) || []).length;
    return afterLine(src, /^\s+DisplayBar: \[".*"\],\r?$/,
        'DC360Bulb: ["Light bulb: lights up when its input is 1", "Light Bulb"],\nDC360Lamp: ["Table lamp: lights up when its input is 1", "Table Lamp"],', n || 1);
});

edit('images.ts', 'add the Light Bulb and Table Lamp pictures', src => {
    src = afterLine(src, /^import DisplayBar from '\.\.\/img\/DisplayBar\.svg'; \/\/ @ts-ignore\r?$/,
        "import DC360Bulb from '../img/DC360Bulb.svg'; // @ts-ignore\nimport DC360Lamp from '../img/DC360Lamp.svg'; // @ts-ignore");
    return afterLine(src, /^\s+DisplayBar,\r?$/, 'DC360Bulb,\nDC360Lamp,');
});

console.log('DC360 parts added.');
