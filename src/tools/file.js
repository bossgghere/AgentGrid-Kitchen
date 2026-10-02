import fs from "fs";
import path from "path";

export function readFile(filePath) {
  return fs.readFileSync(filePath, "utf-8");
}

export function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
}

export function listDir(dirPath) {
  return fs.readdirSync(dirPath);
}

export function fileExists(filePath) {
  return fs.existsSync(filePath);
}
