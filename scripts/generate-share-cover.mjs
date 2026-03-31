import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const outputDir = resolve(rootDir, 'public')
const outputPath = resolve(outputDir, 'social-share-cover.png')

const width = 1200
const height = 630
const pixels = Buffer.alloc(width * height * 4, 0)

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function lerp(start, end, t) {
  return start + (end - start) * t
}

function blendPixel(x, y, red, green, blue, alpha = 255) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return
  }

  const index = (y * width + x) * 4
  const sourceAlpha = clamp(alpha / 255, 0, 1)
  const destAlpha = pixels[index + 3] / 255
  const outAlpha = sourceAlpha + destAlpha * (1 - sourceAlpha)

  if (outAlpha <= 0) {
    return
  }

  pixels[index] = Math.round((red * sourceAlpha + pixels[index] * destAlpha * (1 - sourceAlpha)) / outAlpha)
  pixels[index + 1] = Math.round((green * sourceAlpha + pixels[index + 1] * destAlpha * (1 - sourceAlpha)) / outAlpha)
  pixels[index + 2] = Math.round((blue * sourceAlpha + pixels[index + 2] * destAlpha * (1 - sourceAlpha)) / outAlpha)
  pixels[index + 3] = Math.round(outAlpha * 255)
}

function fillBackground() {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const xRatio = x / (width - 1)
      const yRatio = y / (height - 1)
      const mix = clamp(0.6 * xRatio + 0.4 * yRatio, 0, 1)
      const red = Math.round(lerp(8, 23, mix))
      const green = Math.round(lerp(29, 92, mix))
      const blue = Math.round(lerp(44, 77, mix))
      blendPixel(x, y, red, green, blue, 255)
    }
  }
}

function fillCircle(centerX, centerY, radius, color) {
  const startX = Math.floor(centerX - radius)
  const endX = Math.ceil(centerX + radius)
  const startY = Math.floor(centerY - radius)
  const endY = Math.ceil(centerY + radius)
  const radiusSquared = radius * radius

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const dx = x - centerX
      const dy = y - centerY
      if (dx * dx + dy * dy <= radiusSquared) {
        blendPixel(x, y, color.red, color.green, color.blue, color.alpha)
      }
    }
  }
}

function insideRoundedRect(x, y, rect) {
  const relativeX = x - rect.x
  const relativeY = y - rect.y
  const innerWidth = rect.width - rect.radius * 2
  const innerHeight = rect.height - rect.radius * 2

  if (relativeX >= rect.radius && relativeX < rect.radius + innerWidth) {
    return relativeY >= 0 && relativeY < rect.height
  }

  if (relativeY >= rect.radius && relativeY < rect.radius + innerHeight) {
    return relativeX >= 0 && relativeX < rect.width
  }

  const cornerX = relativeX < rect.radius ? rect.radius : rect.width - rect.radius
  const cornerY = relativeY < rect.radius ? rect.radius : rect.height - rect.radius
  const dx = relativeX - cornerX
  const dy = relativeY - cornerY

  return dx * dx + dy * dy <= rect.radius * rect.radius
}

function fillRoundedRect(rect, colorAt) {
  const startX = rect.x
  const endX = rect.x + rect.width - 1
  const startY = rect.y
  const endY = rect.y + rect.height - 1

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      if (!insideRoundedRect(x, y, rect)) {
        continue
      }

      const color = colorAt(x, y)
      blendPixel(x, y, color.red, color.green, color.blue, color.alpha ?? 255)
    }
  }
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const lengthBuffer = Buffer.alloc(4)
  lengthBuffer.writeUInt32BE(data.length, 0)

  const crcBuffer = Buffer.alloc(4)
  const crc = crc32(Buffer.concat([typeBuffer, data]))
  crcBuffer.writeUInt32BE(crc >>> 0, 0)

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer])
}

function crc32(buffer) {
  let crc = 0xffffffff

  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index]
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1)
      crc = (crc >>> 1) ^ (0xedb88320 & mask)
    }
  }

  return ~crc
}

function encodePng() {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)

  for (let y = 0; y < height; y += 1) {
    const rawIndex = y * (stride + 1)
    raw[rawIndex] = 0
    pixels.copy(raw, rawIndex + 1, y * stride, (y + 1) * stride)
  }

  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', idat),
    createChunk('IEND', Buffer.alloc(0)),
  ])
}

fillBackground()
fillCircle(1032, 128, 136, { red: 140, green: 245, blue: 211, alpha: 32 })
fillCircle(126, 570, 182, { red: 247, green: 222, blue: 140, alpha: 22 })

fillRoundedRect(
  { x: 84, y: 86, width: 168, height: 168, radius: 36 },
  (x, y) => {
    const xRatio = (x - 84) / 168
    const yRatio = (y - 86) / 168
    const mix = clamp(0.72 * xRatio + 0.28 * yRatio, 0, 1)
    return {
      red: Math.round(lerp(140, 247, mix)),
      green: Math.round(lerp(245, 222, mix)),
      blue: Math.round(lerp(211, 140, mix)),
      alpha: 245,
    }
  },
)

fillRoundedRect(
  { x: 278, y: 154, width: 252, height: 12, radius: 6 },
  () => ({ red: 140, green: 245, blue: 211, alpha: 255 }),
)

fillRoundedRect(
  { x: 278, y: 191, width: 345, height: 12, radius: 6 },
  () => ({ red: 244, green: 233, blue: 178, alpha: 230 }),
)

fillRoundedRect(
  { x: 84, y: 340, width: 470, height: 88, radius: 22 },
  (x, y) => {
    const mix = clamp(((x - 84) / 470) * 0.8 + ((y - 340) / 88) * 0.2, 0, 1)
    return {
      red: Math.round(lerp(247, 230, mix)),
      green: Math.round(lerp(250, 245, mix)),
      blue: Math.round(lerp(252, 236, mix)),
      alpha: 28,
    }
  },
)

fillRoundedRect(
  { x: 84, y: 446, width: 320, height: 30, radius: 14 },
  () => ({ red: 200, green: 244, blue: 231, alpha: 70 }),
)

fillRoundedRect(
  { x: 84, y: 495, width: 584, height: 22, radius: 11 },
  () => ({ red: 233, green: 240, blue: 245, alpha: 58 }),
)

fillRoundedRect(
  { x: 84, y: 544, width: 280, height: 18, radius: 9 },
  () => ({ red: 194, green: 215, blue: 227, alpha: 48 }),
)

mkdirSync(outputDir, { recursive: true })
writeFileSync(outputPath, encodePng())

console.log(`Wrote ${outputPath}`)
