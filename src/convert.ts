import { $Font, Font, Bitmap } from "bdfparser";
import getline from "readlineiter"
import { Canvas, createCanvas } from "@napi-rs/canvas";
import * as fs from "fs";
import { FONT_VARIANTS } from "./common";

type ColorPalette = Record<'0' | '1' | '2', string | null>;

const whiteColorPalette: ColorPalette = {
    '0': null,
    '1': "#fff",
    '2': "#fff"
}
const default8 = fs.readFileSync("./src/default8.txt", "utf-8");

function clipBitmap(bitmap: Bitmap) {
    const non0_x_coords = bitmap
        .bindata
        .flatMap(row => 
            [...row]
                .map((char, x) => char !== '0' ? x : -1)
                .filter(x => x !== -1)
        );
    const non0_y_coords = bitmap
        .bindata
        .map((row, y) => row.includes('1') || row.includes('2') ? y : -1)
        .filter(y => y !== -1);
    
    const left = Math.min(...non0_x_coords);
    const right = Math.max(...non0_x_coords) + 1;
    const top = Math.min(...non0_y_coords);
    const bottom = Math.max(...non0_y_coords) + 1;

    return bitmap.crop(right - left, bottom -top, left, bitmap.height() - bottom);
}

async function generatePackImage(font: Font) {
    const shadowColorPalette: ColorPalette = {
        '0': null,
        '1': "#ffffff",
        '2': "#6373EB"
    };
    const imageSize = 64;

    const canvas = createCanvas(imageSize, imageSize);
    const context = canvas.getContext("2d");
    context.fillStyle = "#27272B";
    context.fillRect(0, 0, imageSize, imageSize);

    context.translate(0, 10);
    context.save();
    
    const bmp_galmuri = clipBitmap(font
        .draw("Galmuri")
        .glow(1)
        .enlarge(2, 2)
    );
    context.translate((imageSize-bmp_galmuri.width())/2, 0);
    bmp_galmuri.draw2canvas(context, shadowColorPalette);
    context.restore();

    const bmp_font = clipBitmap(font
        .draw("Font")
        .glow(1)
        .enlarge(2, 2)
    );
    context.translate(0, 24);
    context.translate((imageSize-bmp_font.width())/2, 0);
    bmp_font.draw2canvas(context, shadowColorPalette);
    context.restore();

    return canvas;
}

function generateDefault8Image(font: Font): Canvas {
    const pointSize = font.headers?.pointsize ?? 0;

    const canvas = createCanvas(pointSize*16, pointSize*16);
    const context = canvas.getContext("2d");
    context.translate(-4, -3);
    context.save();

    for (const char of default8) {
        if (char === '\n') {
            context.restore();
            context.translate(0, pointSize);
            context.save();
            continue;
        }
        font.draw(char).draw2canvas(context, whiteColorPalette);
        context.translate(pointSize, 0);
    }

    return canvas;
}

function generateUnicodeGridImage(font: Font, sprite: number) {
    const pointSize = font.headers?.pointsize ?? 0;

    const canvas = createCanvas(pointSize*16, pointSize*16);
    const context = canvas.getContext("2d");
    context.translate(-4, -3);
    context.save();

    let noChar = true;

    for (let i = 0; i < 16*16; i++) {
        if (i % 16 === 0 && i !== 0) {
            context.restore();
            context.translate(0, pointSize);
            context.save();
        }
        const charCode = sprite*16*16 + i;
        const char = String.fromCharCode(charCode);
        if (font.glyphs.get(charCode)) {
            noChar = false;
            font.draw(char).draw2canvas(context, whiteColorPalette);
        }
        context.translate(pointSize, 0);
    }

    return noChar ? null : canvas;
}

for (const variant of FONT_VARIANTS) {
    const font = await $Font(getline(`./bdf/${variant.name}.bdf`));

    if (variant.name == "Galmuri7") {
        fs.writeFileSync(
            "pack_icon.png",
            (await generatePackImage(font)).toBuffer("image/png")
        )
    }

    fs.mkdirSync(`./subpacks/${variant.subpackFolderName}/font`, { recursive: true });

    fs.readdirSync(`./subpacks/${variant.subpackFolderName}/font`).forEach(file => {
        fs.rmSync(`./subpacks/${variant.subpackFolderName}/font/${file}`, { force: true });
    });
    
    console.log(`Generating default8.png for ${variant.name}...`);
    fs.writeFileSync(
        `./subpacks/${variant.subpackFolderName}/font/default8.png`,
        generateDefault8Image(font).toBuffer("image/png")
    );

    for (var sprite = 0; sprite < 16*16; sprite++) {
        const fileName = "glyph_" + sprite.toString(16).padStart(2, "0").toUpperCase();
        console.log(`Generating ${fileName}.png for ${variant.name}...`);

        const canvas = generateUnicodeGridImage(font, sprite);
        if (!canvas) {
            console.log(`No characters found for sprite ${sprite}, skipping...`);
            continue;
        }
        fs.writeFileSync(
            `./subpacks/${variant.subpackFolderName}/font/${fileName}.png`,
            canvas.toBuffer("image/png")
        );
    }
}
