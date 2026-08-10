import { $Font } from "bdfparser";
import getline from "readlineiter"
import * as fs from "fs";
import { FONT_VARIANTS } from "./common";
import { generateGridFontImage, generatePackImage } from "./util";

const default8 = fs.readFileSync("./src/default8.txt", "utf-8");

for (const variant of FONT_VARIANTS) {
    const font = await $Font(getline(`./bdf/${variant.name}.bdf`));

    if (variant.name == "Galmuri7") {
        fs.writeFileSync(
            "pack_icon.png",
            (generatePackImage(font)).toBuffer("image/png")
        )
    }

    fs.mkdirSync(`./subpacks/${variant.subpackFolderName}/font`, { recursive: true });

    fs.readdirSync(`./subpacks/${variant.subpackFolderName}/font`).forEach(file => {
        fs.rmSync(`./subpacks/${variant.subpackFolderName}/font/${file}`, { force: true });
    });
    
    console.log(`Generating default8.png for ${variant.name}...`);
    const canvas = generateGridFontImage(font, default8
        .split('\n')
        .map(line => line
            .split('')
            .map(c => c.charCodeAt(0)
        )
    ));
    if (!canvas) {
        console.error("Failed to generate default8.png, no characters found in the font.");
        process.exit(1);
    }
    fs.writeFileSync(
        `./subpacks/${variant.subpackFolderName}/font/default8.png`,
        canvas.toBuffer("image/png")
    );

    for (var pageNumber = 0; pageNumber < 16*16; pageNumber++) {
        const fileName = "glyph_" + pageNumber.toString(16).padStart(2, "0").toUpperCase();
        console.log(`Generating ${fileName}.png for ${variant.name}...`);

        const canvas = generateGridFontImage(font, [...Array(16)].map((_, y) => [...Array(16)].map((_, x) => pageNumber*16*16 + y*16 + x)));
        if (!canvas) {
            console.log(`No characters found for ${fileName}, skipping...`);
            continue;
        }
        fs.writeFileSync(
            `./subpacks/${variant.subpackFolderName}/font/${fileName}.png`,
            canvas.toBuffer("image/png")
        );
    }
}
