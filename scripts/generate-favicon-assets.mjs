import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const outputDir = resolve(rootDir, 'public')

const OUTPUT_SPECS = [
  { size: 16, filename: 'favicon-16x16.png' },
  { size: 32, filename: 'favicon-32x32.png' },
  { size: 180, filename: 'apple-touch-icon.png' },
]

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function lerp(start, end, t) {
  return start + (end - start) * t
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

function fillRoundedRect(pixels, width, height, rect, colorAt) {
  const startX = Math.max(0, Math.floor(rect.x))
  const endX = Math.min(width - 1, Math.ceil(rect.x + rect.width - 1))
  const startY = Math.max(0, Math.floor(rect.y))
  const endY = Math.min(height - 1, Math.ceil(rect.y + rect.height - 1))

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      if (!insideRoundedRect(x, y, rect)) {
        continue
      }

      const index = (y * width + x) * 4
      const color = colorAt(x, y)
      pixels[index] = color.red
      pixels[index + 1] = color.green
      pixels[index + 2] = color.blue
      pixels[index + 3] = color.alpha ?? 255
    }
  }
}

function fillCircle(pixels, width, height, centerX, centerY, radius, color) {
  const startX = Math.max(0, Math.floor(centerX - radius))
  const endX = Math.min(width - 1, Math.ceil(centerX + radius))
  const startY = Math.max(0, Math.floor(centerY - radius))
  const endY = Math.min(height - 1, Math.ceil(centerY + radius))
  const radiusSquared = radius * radius

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const dx = x - centerX
      const dy = y - centerY
      if (dx * dx + dy * dy > radiusSquared) {
        continue
      }

      const index = (y * width + x) * 4
      pixels[index] = color.red
      pixels[index + 1] = color.green
      pixels[index + 2] = color.blue
      pixels[index + 3] = color.alpha ?? 255
    }
  }
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

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii')
  const lengthBuffer = Buffer.alloc(4)
  lengthBuffer.writeUInt32BE(data.length, 0)

  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])) >>> 0, 0)

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer])
}

function encodePng(width, height, pixels) {
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

  const compressed = deflateSync(raw, { level: 9 })

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0)),
  ])
}

function scale(unit, drawSize) {
  return (unit / 64) * drawSize
}

function renderFavicon(size) {
  const scaleFactor = 4
  const drawSize = size * scaleFactor
  const pixels = Buffer.alloc(drawSize * drawSize * 4, 0)

  fillRoundedRect(
    pixels,
    drawSize,
    drawSize,
    {
      x: scale(4, drawSize),
      y: scale(4, drawSize),
      width: scale(56, drawSize),
      height: scale(56, drawSize),
      radius: scale(16, drawSize),
    },
    (x, y) => {
      const xRatio = clamp(x / (drawSize - 1), 0, 1)
      const yRatio = clamp(y / (drawSize - 1), 0, 1)
      const mix = clamp(0.62 * xRatio + 0.38 * yRatio, 0, 1)

      return {
        red: Math.round(lerp(8, 22, mix)),
        green: Math.round(lerp(33, 96, mix)),
        blue: Math.round(lerp(48, 79, mix)),
        alpha: 255,
      }
    },
  )

  fillCircle(
    pixels,
    drawSize,
    drawSize,
    scale(50, drawSize),
    scale(16, drawSize),
    scale(9, drawSize),
    { red: 140, green: 245, blue: 211, alpha: 52 },
  )

  fillCircle(
    pixels,
    drawSize,
    drawSize,
    scale(15, drawSize),
    scale(49, drawSize),
    scale(6, drawSize),
    { red: 246, green: 227, blue: 155, alpha: 40 },
  )

  const gold = () => ({ red: 246, green: 227, blue: 155, alpha: 255 })
  const mint = () => ({ red: 140, green: 245, blue: 211, alpha: 255 })

  fillRoundedRect(pixels, drawSize, drawSize, {
    x: scale(12, drawSize),
    y: scale(14, drawSize),
    width: scale(18, drawSize),
    height: scale(8, drawSize),
    radius: scale(4, drawSize),
  }, gold)

  fillRoundedRect(pixels, drawSize, drawSize, {
    x: scale(22, drawSize),
    y: scale(14, drawSize),
    width: scale(8, drawSize),
    height: scale(24, drawSize),
    radius: scale(4, drawSize),
  }, gold)

  fillRoundedRect(pixels, drawSize, drawSize, {
    x: scale(14, drawSize),
    y: scale(34, drawSize),
    width: scale(8, drawSize),
    height: scale(14, drawSize),
    radius: scale(4, drawSize),
  }, gold)

  fillRoundedRect(pixels, drawSize, drawSize, {
    x: scale(14, drawSize),
    y: scale(40, drawSize),
    width: scale(16, drawSize),
    height: scale(8, drawSize),
    radius: scale(4, drawSize),
  }, gold)

  fillRoundedRect(pixels, drawSize, drawSize, {
    x: scale(36, drawSize),
    y: scale(16, drawSize),
    width: scale(8, drawSize),
    height: scale(32, drawSize),
    radius: scale(4, drawSize),
  }, mint)

  fillRoundedRect(pixels, drawSize, drawSize, {
    x: scale(48, drawSize),
    y: scale(16, drawSize),
    width: scale(8, drawSize),
    height: scale(32, drawSize),
    radius: scale(4, drawSize),
  }, mint)

  fillRoundedRect(pixels, drawSize, drawSize, {
    x: scale(36, drawSize),
    y: scale(28, drawSize),
    width: scale(20, drawSize),
    height: scale(8, drawSize),
    radius: scale(4, drawSize),
  }, mint)

  const result = Buffer.alloc(size * size * 4)
  const samplesPerPixel = scaleFactor * scaleFactor

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let red = 0
      let green = 0
      let blue = 0
      let alpha = 0

      for (let sy = 0; sy < scaleFactor; sy += 1) {
        for (let sx = 0; sx < scaleFactor; sx += 1) {
          const sourceIndex = (((y * scaleFactor + sy) * drawSize) + (x * scaleFactor + sx)) * 4
          red += pixels[sourceIndex]
          green += pixels[sourceIndex + 1]
          blue += pixels[sourceIndex + 2]
          alpha += pixels[sourceIndex + 3]
        }
      }

      const targetIndex = (y * size + x) * 4
      result[targetIndex] = Math.round(red / samplesPerPixel)
      result[targetIndex + 1] = Math.round(green / samplesPerPixel)
      result[targetIndex + 2] = Math.round(blue / samplesPerPixel)
      result[targetIndex + 3] = Math.round(alpha / samplesPerPixel)
    }
  }

  return encodePng(size, size, result)
}

mkdirSync(outputDir, { recursive: true })

for (const spec of OUTPUT_SPECS) {
  const outputPath = resolve(outputDir, spec.filename)
  writeFileSync(outputPath, renderFavicon(spec.size))
  console.log(`Wrote ${outputPath}`)
}
