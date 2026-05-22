import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { italyTravelCompanionData as trip } from '../src/data/italyTravelCompanionData.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const placeMap = new Map(trip.places.map(place => [place.id, place]))
const ticketMap = new Map(trip.tickets.map(ticket => [ticket.id, ticket]))
const transportMap = new Map(trip.transportLegs.map(leg => [leg.id, leg]))

const outputArg = process.argv[2]
const outputPath = path.resolve(projectRoot, outputArg || 'exports/italy-travel-plan.xlsx')

const TYPE_LABELS = {
  hotel: '酒店',
  attraction: '景点',
  station: '车站',
  restaurant: '餐厅',
  airport: '机场',
  train: '火车',
  transport: '交通'
}

const BORDER_COLOR = 'FFD9E2DA'

function compact(value) {
  return value == null ? '' : String(value)
}

function sanitizeText(value) {
  return compact(value).replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD]/g, '')
}

function escapeXml(value) {
  return sanitizeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toTypeLabel(type) {
  return TYPE_LABELS[type] || compact(type)
}

function joinLines(values) {
  return values
    .map(value => compact(value).trim())
    .filter(Boolean)
    .join('\n')
}

function joinInline(values, separator = ' · ') {
  return values
    .map(value => compact(value).trim())
    .filter(Boolean)
    .join(separator)
}

function getPlaceName(placeId) {
  return placeMap.get(placeId)?.name || compact(placeId)
}

function summarizeRoute(placeIds) {
  return (placeIds || [])
    .map(placeId => getPlaceName(placeId))
    .filter(Boolean)
    .join(' → ')
}

function summarizeTransports(day) {
  return joinLines(
    (day.transportIds || []).map(id => {
      const leg = transportMap.get(id)
      if (!leg) return ''
      return joinInline([
        leg.departureTime && leg.arrivalTime ? `${leg.departureTime}-${leg.arrivalTime}` : '',
        leg.title,
        leg.operator
      ])
    })
  )
}

function summarizeTickets(day) {
  return joinLines(
    (day.ticketIds || []).map(id => {
      const ticket = ticketMap.get(id)
      if (!ticket) return ''
      return joinInline([
        ticket.time,
        ticket.title,
        ticket.orderRef
      ])
    })
  )
}

function summarizePlanning(day) {
  return joinLines(
    (day.planningCards || []).map(card => {
      const heading = joinInline([card.label, card.title], '｜')
      return joinLines([heading, card.body])
    })
  )
}

function mapTimelineEntry(day, item) {
  const baseEntry = {
    date: day.date,
    dayLabel: day.label,
    city: day.city,
    time: '',
    kind: item.type,
    kindLabel: toTypeLabel(item.type),
    title: '',
    subtitle: '',
    note: '',
    tags: '',
    navigationPlace: ''
  }

  if (item.type === 'hotel' || item.type === 'place') {
    const place = placeMap.get(item.refId)
    if (!place) return baseEntry
    return {
      ...baseEntry,
      time: place.timeSort || place.plannedTime || '',
      title: place.name,
      subtitle: item.type === 'hotel' ? place.address : toTypeLabel(place.type),
      note: place.note || '',
      tags: joinInline(place.riskTags || []),
      navigationPlace: place.name
    }
  }

  if (item.type === 'ticket') {
    const ticket = ticketMap.get(item.refId)
    if (!ticket) return baseEntry
    return {
      ...baseEntry,
      time: ticket.time || ticket.timeSort || '',
      title: ticket.title,
      subtitle: joinInline([toTypeLabel(ticket.type), ticket.operator]),
      note: joinLines(ticket.notes || []),
      tags: joinInline(ticket.warnings || []),
      navigationPlace: getPlaceName(ticket.placeId)
    }
  }

  if (item.type === 'transport') {
    const leg = transportMap.get(item.refId)
    if (!leg) return baseEntry
    return {
      ...baseEntry,
      time: leg.departureTime || '',
      title: leg.title,
      subtitle: joinInline([leg.operator, leg.serviceNo]),
      note: leg.ticketRules || '',
      tags: joinInline([
        leg.needsActivation ? '需要激活' : '',
        leg.fallbackPlan ? `备用：${leg.fallbackPlan}` : ''
      ]),
      navigationPlace: getPlaceName(leg.toPlaceId)
    }
  }

  return baseEntry
}

function summarizeTimeline(day) {
  return joinLines(
    (day.timeline || []).map(item => {
      const entry = mapTimelineEntry(day, item)
      return joinInline([entry.time, entry.title, entry.subtitle])
    })
  )
}

function makeCell(value, style = 5) {
  return { value: compact(value), style }
}

function makeMergedRow(text, style, columnCount) {
  return Array.from({ length: columnCount }, (_, index) => (
    index === 0 ? makeCell(text, style) : makeCell('', style)
  ))
}

function buildOverviewRows() {
  const headers = [
    '日期',
    '城市',
    '当天主题',
    '住宿',
    '关键交通',
    '关键票据',
    '主要路线',
    '时间线摘要',
    '核心提醒',
    '规划摘要'
  ]

  const rows = [
    makeMergedRow(trip.tripMeta.title, 1, headers.length),
    makeMergedRow(trip.tripMeta.subtitle, 6, headers.length),
    [makeCell('旅行日期', 2), makeCell(trip.dateRange, 3)],
    [makeCell('默认查看日', 2), makeCell(trip.days.find(day => day.id === trip.tripMeta.defaultDayId)?.label || '', 3)],
    [makeCell('旅行备注', 2), makeCell(trip.tripMeta.travelerNote, 3)],
    [],
    headers.map(header => makeCell(header, 4)),
  ]

  for (const day of trip.days) {
    const hotel = placeMap.get(day.hotelPlaceId)
    rows.push([
      makeCell(joinLines([day.date, day.label]), 3),
      makeCell(day.city, 5),
      makeCell(day.title, 3),
      makeCell(joinLines([
        hotel?.name || '',
        hotel?.orderRef || '',
        hotel?.address || ''
      ]), 3),
      makeCell(summarizeTransports(day), 3),
      makeCell(summarizeTickets(day), 3),
      makeCell(summarizeRoute(day.routePlaceIds), 3),
      makeCell(summarizeTimeline(day), 3),
      makeCell(day.topReminder || '', 3),
      makeCell(summarizePlanning(day), 3),
    ])
  }

  return rows
}

function buildTimelineRows() {
  const rows = [[
    makeCell('日期', 4),
    makeCell('天数标签', 4),
    makeCell('城市', 4),
    makeCell('时间', 4),
    makeCell('类型', 4),
    makeCell('标题', 4),
    makeCell('副标题', 4),
    makeCell('备注', 4),
    makeCell('风险 / 备用', 4),
    makeCell('导航地点', 4),
  ]]

  for (const day of trip.days) {
    for (const item of day.timeline || []) {
      const entry = mapTimelineEntry(day, item)
      rows.push([
        makeCell(entry.date, 5),
        makeCell(entry.dayLabel, 5),
        makeCell(entry.city, 5),
        makeCell(entry.time, 5),
        makeCell(entry.kindLabel, 5),
        makeCell(entry.title, 3),
        makeCell(entry.subtitle, 3),
        makeCell(entry.note, 3),
        makeCell(entry.tags, 3),
        makeCell(entry.navigationPlace, 3),
      ])
    }
  }

  return rows
}

function buildTransportRows() {
  const rows = [[
    makeCell('日期', 4),
    makeCell('城市', 4),
    makeCell('标题', 4),
    makeCell('运营方', 4),
    makeCell('班次 / 类型', 4),
    makeCell('出发时间', 4),
    makeCell('到达时间', 4),
    makeCell('路线', 4),
    makeCell('票务规则', 4),
    makeCell('备用方案', 4),
    makeCell('站点信息', 4),
    makeCell('官网链接', 4),
  ]]

  for (const leg of trip.transportLegs) {
    rows.push([
      makeCell(leg.date, 5),
      makeCell(leg.city, 5),
      makeCell(leg.title, 3),
      makeCell(leg.operator, 5),
      makeCell(leg.serviceNo, 5),
      makeCell(leg.departureTime, 5),
      makeCell(leg.arrivalTime, 5),
      makeCell(`${getPlaceName(leg.fromPlaceId)} → ${getPlaceName(leg.toPlaceId)}`, 3),
      makeCell(leg.ticketRules, 3),
      makeCell(leg.fallbackPlan, 3),
      makeCell(joinLines([
        leg.stationInfo,
        leg.needsActivation ? '需要激活' : ''
      ]), 3),
      makeCell(leg.officialLink, 3),
    ])
  }

  return rows
}

function buildTicketRows() {
  const rows = [[
    makeCell('日期', 4),
    makeCell('时间', 4),
    makeCell('城市', 4),
    makeCell('标题', 4),
    makeCell('类型', 4),
    makeCell('关联地点', 4),
    makeCell('运营方', 4),
    makeCell('订单号', 4),
    makeCell('说明', 4),
    makeCell('警告', 4),
    makeCell('放票提醒', 4),
    makeCell('官网链接', 4),
  ]]

  for (const ticket of trip.tickets) {
    rows.push([
      makeCell(ticket.date, 5),
      makeCell(ticket.time || ticket.timeSort, 5),
      makeCell(ticket.city, 5),
      makeCell(ticket.title, 3),
      makeCell(toTypeLabel(ticket.type), 5),
      makeCell(joinLines([
        getPlaceName(ticket.placeId),
        ticket.relatedPlaceId ? `关联：${getPlaceName(ticket.relatedPlaceId)}` : ''
      ]), 3),
      makeCell(ticket.operator, 5),
      makeCell(ticket.orderRef, 5),
      makeCell(joinLines(ticket.notes || []), 3),
      makeCell(joinLines(ticket.warnings || []), 3),
      makeCell(ticket.releaseReminder, 3),
      makeCell(ticket.officialLink, 3),
    ])
  }

  return rows
}

function buildPlaceRows() {
  const rows = [[
    makeCell('城市', 4),
    makeCell('日期', 4),
    makeCell('时间', 4),
    makeCell('名称', 4),
    makeCell('类型', 4),
    makeCell('地址', 4),
    makeCell('备注', 4),
    makeCell('导航备注', 4),
    makeCell('风险标签', 4),
    makeCell('联系人 / 预订', 4),
    makeCell('订单号', 4),
    makeCell('官网链接', 4),
  ]]

  for (const place of trip.places) {
    rows.push([
      makeCell(place.city, 5),
      makeCell(place.date, 5),
      makeCell(place.plannedTime || place.timeSort, 5),
      makeCell(place.name, 3),
      makeCell(toTypeLabel(place.type), 5),
      makeCell(place.address, 3),
      makeCell(place.note, 3),
      makeCell(place.navigationNote, 3),
      makeCell(joinLines(place.riskTags || []), 3),
      makeCell(place.contact, 3),
      makeCell(place.orderRef, 5),
      makeCell(place.officialLink, 3),
    ])
  }

  return rows
}

function buildRuleRows() {
  const rows = [[
    makeCell('来源', 4),
    makeCell('标题', 4),
    makeCell('内容', 4),
  ]]

  for (const alert of trip.ticketAlerts || []) {
    rows.push([
      makeCell('票务提醒', 5),
      makeCell(alert.title, 5),
      makeCell(alert.body, 3),
    ])
  }

  for (const rule of trip.transportRules || []) {
    rows.push([
      makeCell('交通规则', 5),
      makeCell(rule.title, 5),
      makeCell(rule.body, 3),
    ])
  }

  return rows
}

function buildResourceRows() {
  const rows = [[
    makeCell('标题', 4),
    makeCell('说明', 4),
    makeCell('链接', 4),
  ]]

  for (const resource of trip.transportResources || []) {
    rows.push([
      makeCell(resource.title, 5),
      makeCell(resource.description, 3),
      makeCell(resource.url, 3),
    ])
  }

  return rows
}

function columnName(columnNumber) {
  let column = ''
  let current = columnNumber
  while (current > 0) {
    const remainder = (current - 1) % 26
    column = String.fromCharCode(65 + remainder) + column
    current = Math.floor((current - 1) / 26)
  }
  return column
}

function buildCellXml(cell, rowIndex, columnIndex) {
  const reference = `${columnName(columnIndex)}${rowIndex}`
  const value = cell?.value ?? ''
  const style = cell?.style ?? 5
  if (value === '') {
    return `<c r="${reference}" s="${style}"/>`
  }
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

function buildSheetXml({ rows, widths, merges = [], freeze = null, autoFilter = null }) {
  const normalizedRows = rows.map(row => (Array.isArray(row) ? { cells: row } : row))
  const maxColumns = Math.max(...normalizedRows.map(row => row.cells.length), 1)
  const lastCell = `${columnName(maxColumns)}${normalizedRows.length}`
  const rowXml = normalizedRows.map((row, rowIndex) => {
    const cellsXml = row.cells.map((cell, columnIndex) => buildCellXml(cell, rowIndex + 1, columnIndex + 1)).join('')
    return `<row r="${rowIndex + 1}">${cellsXml}</row>`
  }).join('')

  const colsXml = widths.length
    ? `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>`
    : ''

  const sheetViewsXml = freeze
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freeze.ySplit}" topLeftCell="${freeze.topLeftCell}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="${freeze.topLeftCell}" sqref="${freeze.topLeftCell}"/></sheetView></sheetViews>`
    : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'

  const mergeXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map(ref => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`
    : ''

  const autoFilterXml = autoFilter ? `<autoFilter ref="${autoFilter}"/>` : ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCell}"/>
  ${sheetViewsXml}
  <sheetFormatPr defaultRowHeight="18"/>
  ${colsXml}
  <sheetData>${rowXml}</sheetData>
  ${autoFilterXml}
  ${mergeXml}
</worksheet>`
}

function createWorkbookXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <fileVersion appName="xl"/>
  <workbookPr defaultThemeVersion="166925"/>
  <bookViews>
    <workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="14000"/>
  </bookViews>
  <sheets>
    ${sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}
  </sheets>
</workbook>`
}

function createWorkbookRelsXml(sheets) {
  const worksheetRels = sheets.map((sheet, index) => (
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  )).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${worksheetRels}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
}

function createContentTypesXml(sheets) {
  const sheetOverrides = sheets.map((sheet, index) => (
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  )).join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${sheetOverrides}
</Types>`
}

function createRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
}

function createStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <font>
      <b/>
      <sz val="16"/>
      <color rgb="FFFFFFFF"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <color rgb="FFFFFFFF"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <name val="Calibri"/>
      <family val="2"/>
    </font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF35624D"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF3EC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF7FBF8"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border>
      <left/><right/><top/><bottom/><diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="${BORDER_COLOR}"/></left>
      <right style="thin"><color rgb="${BORDER_COLOR}"/></right>
      <top style="thin"><color rgb="${BORDER_COLOR}"/></top>
      <bottom style="thin"><color rgb="${BORDER_COLOR}"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="7">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="top" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`
}

function createAppXml(sheets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Codex</Application>
  <HeadingPairs>
    <vt:vector size="2" baseType="variant">
      <vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${sheets.length}" baseType="lpstr">
      ${sheets.map(sheet => `<vt:lpstr>${escapeXml(sheet.name)}</vt:lpstr>`).join('')}
    </vt:vector>
  </TitlesOfParts>
  <Company>OpenAI</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>1.0</AppVersion>
</Properties>`
}

function createCoreXml() {
  const timestamp = new Date().toISOString()
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>意大利行程规划导出</dc:title>
  <dc:subject>italyTravelCompanionData</dc:subject>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>
</cp:coreProperties>`
}

function createCrc32Table() {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let current = index
    for (let bit = 0; bit < 8; bit += 1) {
      current = (current & 1) ? (0xEDB88320 ^ (current >>> 1)) : (current >>> 1)
    }
    table[index] = current >>> 0
  }
  return table
}

const CRC32_TABLE = createCrc32Table()

function crc32(buffer) {
  let current = 0xFFFFFFFF
  for (const byte of buffer) {
    current = CRC32_TABLE[(current ^ byte) & 0xFF] ^ (current >>> 8)
  }
  return (current ^ 0xFFFFFFFF) >>> 0
}

function toDosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980)
  const dosTime = ((date.getHours() & 0x1F) << 11)
    | ((date.getMinutes() & 0x3F) << 5)
    | Math.floor(date.getSeconds() / 2)
  const dosDate = (((year - 1980) & 0x7F) << 9)
    | (((date.getMonth() + 1) & 0x0F) << 5)
    | (date.getDate() & 0x1F)
  return { dosTime, dosDate }
}

function buildZip(entries) {
  const localParts = []
  const centralParts = []
  let offset = 0
  const now = new Date()
  const { dosTime, dosDate } = toDosDateTime(now)

  for (const entry of entries) {
    const fileName = Buffer.from(entry.name.replace(/\\/g, '/'))
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8')
    const checksum = crc32(data)

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(checksum, 14)
    localHeader.writeUInt32LE(data.length, 18)
    localHeader.writeUInt32LE(data.length, 22)
    localHeader.writeUInt16LE(fileName.length, 26)
    localHeader.writeUInt16LE(0, 28)

    localParts.push(localHeader, fileName, data)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt16LE(dosTime, 12)
    centralHeader.writeUInt16LE(dosDate, 14)
    centralHeader.writeUInt32LE(checksum, 16)
    centralHeader.writeUInt32LE(data.length, 20)
    centralHeader.writeUInt32LE(data.length, 24)
    centralHeader.writeUInt16LE(fileName.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(offset, 42)

    centralParts.push(centralHeader, fileName)
    offset += localHeader.length + fileName.length + data.length
  }

  const centralDirectory = Buffer.concat(centralParts)
  const endHeader = Buffer.alloc(22)
  endHeader.writeUInt32LE(0x06054b50, 0)
  endHeader.writeUInt16LE(0, 4)
  endHeader.writeUInt16LE(0, 6)
  endHeader.writeUInt16LE(entries.length, 8)
  endHeader.writeUInt16LE(entries.length, 10)
  endHeader.writeUInt32LE(centralDirectory.length, 12)
  endHeader.writeUInt32LE(offset, 16)
  endHeader.writeUInt16LE(0, 20)

  return Buffer.concat([...localParts, centralDirectory, endHeader])
}

const overviewRows = buildOverviewRows()
const timelineRows = buildTimelineRows()
const transportRows = buildTransportRows()
const ticketRows = buildTicketRows()
const placeRows = buildPlaceRows()
const ruleRows = buildRuleRows()
const resourceRows = buildResourceRows()

const sheets = [
  {
    name: '总览',
    xml: buildSheetXml({
      rows: overviewRows,
      widths: [14, 12, 22, 26, 28, 28, 36, 36, 34, 42],
      merges: ['A1:J1', 'A2:J2'],
      freeze: { ySplit: 6, topLeftCell: 'A7' },
      autoFilter: `A7:J${overviewRows.length}`
    })
  },
  {
    name: '每日时间线',
    xml: buildSheetXml({
      rows: timelineRows,
      widths: [12, 14, 10, 10, 10, 24, 28, 42, 32, 20],
      freeze: { ySplit: 1, topLeftCell: 'A2' },
      autoFilter: `A1:J${timelineRows.length}`
    })
  },
  {
    name: '交通',
    xml: buildSheetXml({
      rows: transportRows,
      widths: [12, 10, 24, 18, 16, 10, 10, 28, 42, 36, 32, 28],
      freeze: { ySplit: 1, topLeftCell: 'A2' },
      autoFilter: `A1:L${transportRows.length}`
    })
  },
  {
    name: '票据',
    xml: buildSheetXml({
      rows: ticketRows,
      widths: [12, 10, 10, 24, 10, 22, 18, 16, 34, 28, 34, 28],
      freeze: { ySplit: 1, topLeftCell: 'A2' },
      autoFilter: `A1:L${ticketRows.length}`
    })
  },
  {
    name: '地点',
    xml: buildSheetXml({
      rows: placeRows,
      widths: [10, 12, 10, 24, 10, 32, 42, 32, 24, 24, 16, 28],
      freeze: { ySplit: 1, topLeftCell: 'A2' },
      autoFilter: `A1:L${placeRows.length}`
    })
  },
  {
    name: '提醒规则',
    xml: buildSheetXml({
      rows: ruleRows,
      widths: [12, 24, 72],
      freeze: { ySplit: 1, topLeftCell: 'A2' },
      autoFilter: `A1:C${ruleRows.length}`
    })
  },
  {
    name: '资源链接',
    xml: buildSheetXml({
      rows: resourceRows,
      widths: [24, 42, 48],
      freeze: { ySplit: 1, topLeftCell: 'A2' },
      autoFilter: `A1:C${resourceRows.length}`
    })
  }
]

const zipEntries = [
  { name: '[Content_Types].xml', data: createContentTypesXml(sheets) },
  { name: '_rels/.rels', data: createRootRelsXml() },
  { name: 'docProps/app.xml', data: createAppXml(sheets) },
  { name: 'docProps/core.xml', data: createCoreXml() },
  { name: 'xl/workbook.xml', data: createWorkbookXml(sheets) },
  { name: 'xl/_rels/workbook.xml.rels', data: createWorkbookRelsXml(sheets) },
  { name: 'xl/styles.xml', data: createStylesXml() },
  ...sheets.map((sheet, index) => ({
    name: `xl/worksheets/sheet${index + 1}.xml`,
    data: sheet.xml
  }))
]

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, buildZip(zipEntries))

console.log(`Excel 导出完成: ${outputPath}`)
console.log(`工作表: ${sheets.map(sheet => sheet.name).join(', ')}`)
