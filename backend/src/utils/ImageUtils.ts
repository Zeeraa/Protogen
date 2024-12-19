import { createCanvas, Image } from "canvas";
import sharp from "sharp";

export async function flipCanvasImage(image: Image) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const canvasBuffer = canvas.toBuffer('image/png');
  const flippedBuffer = await sharp(canvasBuffer)
    .flop()
    .png()
    .toBuffer();

  const flippedImage = new Image();
  flippedImage.src = flippedBuffer;

  return flippedImage;
}