import { createCanvas } from "@napi-rs/canvas";
import { Bitmap, Font } from "bdfparser/dist/types";

export type ColorPalette = Record<'0' | '1' | '2', string | null>;

export function cropBitmap(bitmap: Bitmap) {
    const non0_x_coords = bitmap
        .bindata
        .flatMap(row => [...row]
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

    return bitmap.crop(right - left, bottom - top, left, bitmap.height() - bottom);
}

export function generateGridFontImage(font: Font, charMatrix: number[][]) {
    const whiteColorPalette: ColorPalette = {
        '0': null,
        '1': "#fff",
        '2': "#fff"
    }

    const pointSize = font.headers?.pointsize ?? 0;

    const bbyMinLimit = font.headers ? font.headers.fbby + font.headers.fbbyoff*2 - font.headers.pointsize : 0;
    const bbyMaxLimit = font.headers ? bbyMinLimit + font.headers.pointsize : 0;

    const canvas = createCanvas(pointSize*16, pointSize*16);
    const context = canvas.getContext("2d");
    context.translate(font.headers?.fbbxoff ?? 0, font.headers?.fbbyoff ?? 0);
    context.save();

    let noCharRendered = true;

    for (const row of charMatrix) {
        for (const charCode of row) {
            const char = String.fromCodePoint(charCode);
            const glyph = font.glyphs.get(charCode) ? font.glyph(char) : null;
            // only render the character if it fits within the point size
            if (glyph && glyph.meta.bbw <= pointSize && glyph.meta.bbh <= pointSize) {
                context.save();
                const bbxoff = glyph.meta.bbxoff ?? 0;
                const bbyoff = glyph.meta.bbyoff;
                const bbh = glyph.meta.bbh;
                if (bbxoff < 0) {
                    // shift the character to the right if it has a negative x offset
                    context.translate(-bbxoff, 0);
                }
                if (bbyoff < bbyMinLimit) {
                    // shift the character up if it has a negative y offset
                    context.translate(0, bbyoff - bbyMinLimit);
                }
                if (bbyoff + bbh > bbyMaxLimit) {
                    // shift the character down if it has a positive y offset
                    context.translate(0, (bbyoff + bbh) - bbyMaxLimit);
                }
                glyph.draw().draw2canvas(context, whiteColorPalette);
                noCharRendered = false;
                context.restore();
            }
            context.translate(pointSize, 0);
        }
        context.restore();
        context.translate(0, pointSize);
        context.save();
    }

    return noCharRendered ? null : canvas;
}

export function generatePackImage(font: Font) {
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
    
    const bmp_galmuri = cropBitmap(font
        .draw("Galmuri")
        .glow(1)
        .enlarge(2, 2)
    );
    context.translate((imageSize-bmp_galmuri.width())/2, 0);
    bmp_galmuri.draw2canvas(context, shadowColorPalette);
    context.restore();

    const bmp_font = cropBitmap(font
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
