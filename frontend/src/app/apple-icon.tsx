import { readFile } from "node:fs/promises";
import path from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const buffer = await readFile(path.join(process.cwd(), "src/app/icon.png"));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
    },
  });
}
