import { Octokit } from "octokit";
import { unzip } from "unzipit";
import { FILE_NAMES } from "./common";
import * as fs from "fs";

const octkit = new Octokit();
const latestRelease = await octkit.rest.repos.getLatestRelease({
    "owner": "quiple",
    "repo": "galmuri"
});
const releaseTagName = latestRelease.data.tag_name;
const releaseUrl = latestRelease.data.assets[0].browser_download_url;

console.log(`Latest release tag: ${releaseTagName}`);

fs.writeFileSync("./bdf/version.txt", releaseTagName);

const { entries } = await unzip(releaseUrl);
const fileCheckList = new Map(FILE_NAMES.map(name => [name, false]));

for (const [name, entry] of Object.entries(entries)) {
    if (!fileCheckList.has(name)) continue;
    fileCheckList.set(name, true);
    const dstPath = `./bdf/${name}`;
    fs.writeFileSync(dstPath, new Uint8Array(await entry.arrayBuffer()));
}

for (const [name, found] of fileCheckList.entries()) {
    if (!found) {
        console.error(`Missing expected file: ${name}`);
        process.exit(1);
    }
}