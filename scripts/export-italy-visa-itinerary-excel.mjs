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

const BORDER_COLOR = 'FFD9E2DA'
const SOURCE_CHECKED_AT = '2026-04-28'
const DEFAULT_SUBMISSION_CITY = '长沙 / Changsha'
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const OFFICIAL_SOURCES = [
  {
    topic: '旅游签行程单 / Travel itinerary',
    requirement: '官方材料清单要求行程相关材料能清晰显示城市和日期；可用行程单、交通预订单等作为支持材料。',
    source: '意大利驻华使馆 Tourism Checklist 2025',
    link: 'https://ambpechino.esteri.it/wp-content/uploads/2025/05/Checklist-Tourism-individual-2025.pdf'
  },
  {
    topic: '往返机票预订单 / Round-trip reservation',
    requirement: '统一材料清单要求提供往返机票预订单；若为开口票，也应能清楚覆盖入境和离境航段，并显示申请人姓名。',
    source: '统一材料清单 Harmonized List',
    link: 'https://ambpechino.esteri.it/wp-content/uploads/2024/10/lista-armonizzata_inglese.pdf'
  },
  {
    topic: '住宿证明 / Proof of accommodation',
    requirement: '统一材料清单要求覆盖整个计划停留期的住宿证明；占位酒店或未锁定酒店不适合作为正式提交材料。',
    source: '统一材料清单 Harmonized List',
    link: 'https://ambpechino.esteri.it/wp-content/uploads/2024/10/lista-armonizzata_inglese.pdf'
  },
  {
    topic: '长沙申请归属 / Changsha jurisdiction',
    requirement: '湖南省申请人属于意大利驻广州总领馆领区。长沙递交时，材料口径仍以该领区的官方签证要求为准。',
    source: '意大利驻华使领馆领区说明',
    link: 'https://ambpechino.esteri.it/zh/chi-siamo/la-rete-consolare/'
  }
]

const args = parseArgs(process.argv.slice(2))
const outputPath = path.resolve(projectRoot, args.outputPath || 'exports/italy-visa-itinerary-changsha.xlsx')

function parseArgs(argv) {
  const options = {
    outputPath: '',
    traveler: '',
    passport: '',
    submissionCity: DEFAULT_SUBMISSION_CITY
  }

  const positionals = []

  for (const arg of argv) {
    if (arg.startsWith('--traveler=')) {
      options.traveler = arg.slice('--traveler='.length)
      continue
    }
    if (arg.startsWith('--applicant=')) {
      options.traveler = arg.slice('--applicant='.length)
      continue
    }
    if (arg.startsWith('--passport=')) {
      options.passport = arg.slice('--passport='.length)
      continue
    }
    if (arg.startsWith('--submission-city=')) {
      options.submissionCity = arg.slice('--submission-city='.length)
      continue
    }
    positionals.push(arg)
  }

  if (positionals[0]) {
    options.outputPath = positionals[0]
  }

  return options
}

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

function getPlace(placeId) {
  return placeMap.get(placeId) || null
}

function getPlaceName(placeId) {
  return getPlace(placeId)?.name || compact(placeId)
}

function getPlaceAddress(placeId) {
  return getPlace(placeId)?.address || ''
}

function weekdayLabel(dateValue) {
  const date = new Date(`${dateValue}T00:00:00Z`)
  return WEEKDAY_LABELS[date.getUTCDay()] || ''
}

function cityRouteSummary() {
  const cities = []
  for (const day of trip.days) {
    if (!cities.includes(day.city)) {
      cities.push(day.city)
    }
  }
  return cities.join(' -> ')
}

function summarizeRoute(placeIds, limit = 6) {
  const names = (placeIds || [])
    .map(placeId => getPlaceName(placeId))
    .filter(Boolean)

  if (names.length <= limit) {
    return names.join(' -> ')
  }

  return `${names.slice(0, limit).join(' -> ')} -> ...`
}

function isPendingReference(value) {
  const normalized = compact(value).trim()
  if (!normalized) return true
  return /待预订|待购买|待定|pending|to be booked|当天购买/i.test(normalized)
}

function isConfirmedReference(value) {
  return /已预订|已订|confirmed|booked/i.test(compact(value))
}

function hasPlaceholderHotelName(name) {
  return /待定/.test(compact(name))
}

function isPartialAccommodationReference(reference, nights) {
  const normalized = compact(reference)
  if (!isConfirmedReference(normalized)) return false
  if (isPendingReference(normalized)) return true
  if (nights > 1 && /\d{1,2}\/\d{1,2}\s*-\s*\d{1,2}\/\d{1,2}/.test(normalized)) return true
  return false
}

function describeAccommodationStatus(hotel, nights) {
  if (!hotel) {
    return {
      label: '缺少住宿信息 / Missing hotel data',
      pending: true
    }
  }

  if (hasPlaceholderHotelName(hotel.name)) {
    return {
      label: `占位酒店，需替换为真实可提交预订 / Placeholder only (${compact(hotel.orderRef) || 'no ref'})`,
      pending: true
    }
  }

  const reference = compact(hotel.orderRef).trim()

  if (!reference) {
    return {
      label: '无预订号 / No booking reference',
      pending: true
    }
  }

  if (isPartialAccommodationReference(reference, nights)) {
    return {
      label: `部分已锁定 / Partial: ${reference}`,
      pending: true
    }
  }

  if (isConfirmedReference(reference)) {
    return {
      label: `已预订 / Booked: ${reference}`,
      pending: false
    }
  }

  if (isPendingReference(reference)) {
    return {
      label: `待锁定 / Pending: ${reference}`,
      pending: true
    }
  }

  return {
    label: reference,
    pending: false
  }
}

function makeCell(value, style = 5) {
  return { value: compact(value), style }
}

function makeMergedRow(text, style, columnCount) {
  return Array.from({ length: columnCount }, (_, index) => (
    index === 0 ? makeCell(text, style) : makeCell('', style)
  ))
}

function buildOvernightGroups() {
  const groups = []
  const overnightDays = trip.days.slice(0, -1)

  for (let index = 0; index < overnightDays.length; index += 1) {
    const day = overnightDays[index]
    const nextDate = trip.days[index + 1]?.date || ''
    const currentGroup = groups[groups.length - 1]

    if (!currentGroup || currentGroup.hotelPlaceId !== day.hotelPlaceId) {
      groups.push({
        hotelPlaceId: day.hotelPlaceId,
        startDate: day.date,
        checkOutDate: nextDate,
        nights: 1,
        cities: [day.city]
      })
      continue
    }

    currentGroup.nights += 1
    currentGroup.checkOutDate = nextDate
    if (!currentGroup.cities.includes(day.city)) {
      currentGroup.cities.push(day.city)
    }
  }

  return groups.map(group => {
    const hotel = getPlace(group.hotelPlaceId)
    return {
      ...group,
      hotel,
      status: describeAccommodationStatus(hotel, group.nights)
    }
  })
}

function isVisaTransportLeg(leg) {
  const fromPlace = getPlace(leg.fromPlaceId)
  const toPlace = getPlace(leg.toPlaceId)
  const text = joinInline([leg.title, leg.operator, leg.serviceNo], ' ')

  if (fromPlace?.type === 'airport' || toPlace?.type === 'airport') {
    return true
  }

  if (fromPlace?.city && toPlace?.city && fromPlace.city !== toPlace.city) {
    return true
  }

  return /Travelmar|ferry|High-speed|train|Trenitalia|Italo/i.test(text)
}

function findSupportingTickets(leg) {
  const matched = []

  for (const ticket of trip.tickets) {
    if (ticket.date !== leg.date) continue

    const endpointMatch = ticket.placeId === leg.fromPlaceId
      || ticket.placeId === leg.toPlaceId
      || ticket.relatedPlaceId === leg.fromPlaceId
      || ticket.relatedPlaceId === leg.toPlaceId

    const operatorMatch = compact(ticket.operator) && compact(ticket.operator) === compact(leg.operator)

    if (endpointMatch || operatorMatch) {
      matched.push(ticket)
    }
  }

  return matched
}

function canBuyTransportOnTheDay(leg, tickets) {
  if (tickets.length > 0) return false
  const fromPlace = getPlace(leg.fromPlaceId)
  const toPlace = getPlace(leg.toPlaceId)
  if (fromPlace?.type === 'airport' || toPlace?.type === 'airport') return true
  return /步行|Metro|出租车|taxi|shuttle/i.test(joinInline([leg.title, leg.operator], ' '))
}

function describeTransportStatus(leg, tickets) {
  if (tickets.length === 0) {
    if (canBuyTransportOnTheDay(leg, tickets)) {
      return {
        label: '当天购买即可 / Buy on the day',
        pending: false,
        recommended: false
      }
    }
    return {
      label: '仅有计划，无独立预订记录 / Planned only',
      pending: true,
      recommended: true
    }
  }

  const confirmed = tickets.some(ticket => isConfirmedReference(ticket.orderRef))
  const pending = tickets.some(ticket => isPendingReference(ticket.orderRef))

  if (confirmed && pending) {
    return {
      label: '部分已锁定 / Partly booked',
      pending: true,
      recommended: true
    }
  }

  if (confirmed) {
    return {
      label: '已预订 / Booked',
      pending: false,
      recommended: true
    }
  }

  return {
    label: '待锁定 / Pending booking',
    pending: true,
    recommended: true
  }
}

function buildFlightEntries() {
  const arrivalAirport = getPlace('fco-airport')
  const departureAirport = getPlace('malpensa-airport')

  return [
    {
      kind: 'flight',
      date: trip.days[0]?.date || '',
      segment: '国际去程机票 / Outbound open-jaw flight',
      from: '长沙 / Changsha, China',
      to: arrivalAirport?.name || 'Rome FCO',
      transport: 'Flight',
      plannedTime: arrivalAirport?.plannedTime ? `抵达罗马 / Arrive ${arrivalAirport.plannedTime}` : '',
      bookingReference: compact(arrivalAirport?.orderRef),
      status: '必须单独附往返/开口票预订单，且显示申请人姓名 / Separate reservation required',
      notes: '当前数据仅记录“长沙出发，罗马进米兰出”的计划，未保存正式航司预订单。',
      pending: true,
      priority: '必须 / Required'
    },
    {
      kind: 'flight',
      date: trip.days[trip.days.length - 1]?.date || '',
      segment: '国际返程机票 / Return open-jaw flight',
      from: departureAirport?.name || 'Milan MXP',
      to: '长沙 / Changsha, China',
      transport: 'Flight',
      plannedTime: '2026-10-04 12:15 出发 / depart 12:15',
      bookingReference: compact(departureAirport?.orderRef),
      status: '必须单独附往返/开口票预订单，且显示申请人姓名 / Separate reservation required',
      notes: '当前数据保存了返程时间，但不是可直接递交的正式机票预订确认。',
      pending: true,
      priority: '必须 / Required'
    }
  ]
}

function buildVisaTransportEntries() {
  const entries = [...buildFlightEntries()]

  for (const leg of trip.transportLegs.filter(isVisaTransportLeg)) {
    const fromPlace = getPlace(leg.fromPlaceId)
    const toPlace = getPlace(leg.toPlaceId)
    const tickets = findSupportingTickets(leg)
    const bookingReference = tickets.length
      ? joinLines(tickets.map(ticket => joinInline([ticket.title, ticket.orderRef], ' | ')))
      : '无单独票号 / no separate reservation stored'
    const status = describeTransportStatus(leg, tickets)

    entries.push({
      kind: 'transport',
      date: leg.date,
      segment: leg.title,
      from: fromPlace?.name || leg.fromPlaceId,
      to: toPlace?.name || leg.toPlaceId,
      transport: joinInline([leg.operator, leg.serviceNo], ' | '),
      plannedTime: joinInline([
        leg.departureTime && leg.arrivalTime ? `${leg.departureTime}-${leg.arrivalTime}` : '',
        fromPlace?.city && toPlace?.city && fromPlace.city !== toPlace.city
          ? `${fromPlace.city} -> ${toPlace.city}`
          : ''
      ], ' / '),
      bookingReference,
      status: status.label,
      notes: leg.ticketRules,
      pending: status.pending,
      priority: status.recommended ? '建议 / Recommended' : '说明 / Info'
    })
  }

  return entries
}

function summarizeVisaTransportForDay(day) {
  return joinLines(
    (day.transportIds || [])
      .map(id => transportMap.get(id))
      .filter(Boolean)
      .filter(isVisaTransportLeg)
      .map(leg => joinInline([
        leg.departureTime && leg.arrivalTime ? `${leg.departureTime}-${leg.arrivalTime}` : '',
        leg.title,
        leg.operator
      ], ' | '))
  )
}

function describeDailyAccommodation(day, index) {
  const hotel = getPlace(day.hotelPlaceId)

  if (index === trip.days.length - 1) {
    return {
      overnight: '离境日 / departure day',
      label: hotel ? `退房：${hotel.name}` : '离境日',
      status: '无新增过夜 / no overnight stay'
    }
  }

  const status = accommodationStatusByHotel.get(day.hotelPlaceId) || describeAccommodationStatus(hotel, 1)

  return {
    overnight: hotel?.city || day.city,
    label: hotel ? `${hotel.name}\n${hotel.address}` : '',
    status: status.label
  }
}

function buildOverviewRows(pendingItems) {
  const rows = [
    makeMergedRow('意大利旅游签证旅行计划 / Italy Schengen Visa Travel Itinerary', 1, 6),
    makeMergedRow(`按${args.submissionCity || DEFAULT_SUBMISSION_CITY}递交场景整理，材料口径采用官方意大利旅游签证清单（最后核对日期：${SOURCE_CHECKED_AT}）`, 6, 6),
    [
      makeCell('申请中心 / Submission city', 2),
      makeCell(args.submissionCity || DEFAULT_SUBMISSION_CITY, 3),
      makeCell('领区 / Jurisdiction', 2),
      makeCell('湖南省 -> 广州总领馆', 3),
      makeCell('旅行目的 / Purpose', 2),
      makeCell('旅游 / Tourism', 3)
    ],
    [
      makeCell('旅行日期 / Travel dates', 2),
      makeCell(trip.dateRange, 3),
      makeCell('时长 / Duration', 2),
      makeCell(`${trip.days.length} days / ${Math.max(trip.days.length - 1, 0)} nights`, 3),
      makeCell('主目的地 / Main destination', 2),
      makeCell('意大利 / Italy', 3)
    ],
    [
      makeCell('申请人 / Applicant(s)', 2),
      makeCell(args.traveler || '请补充 / fill before submission', 3),
      makeCell('护照号 / Passport No.', 2),
      makeCell(args.passport || '请补充 / fill before submission', 3),
      makeCell('路线 / Route', 2),
      makeCell(cityRouteSummary(), 3)
    ],
    [
      makeCell('国际航线 / Open-jaw flights', 2),
      makeCell('长沙 -> 罗马 FCO；米兰 MXP -> 长沙', 3),
      makeCell('当前待补 / Current gaps', 2),
      makeCell(`${pendingItems.length} 项待确认`, 3),
      makeCell('数据来源 / Source data', 2),
      makeCell('italyTravelCompanionData.js', 3)
    ],
    makeMergedRow('提醒：签证行程单本身不能替代往返机票预订单和全程住宿证明。当前工作簿会把未锁定的航班、酒店和关键城际交通单独列在“待补材料”中。', 3, 6)
  ]

  return rows
}

function buildItineraryRows() {
  const rows = [[
    makeCell('Date', 4),
    makeCell('Day', 4),
    makeCell('City / Area', 4),
    makeCell('Daily plan / 当日安排', 4),
    makeCell('Key stops / 关键节点', 4),
    makeCell('Key transport / 关键交通', 4),
    makeCell('Overnight / 过夜地', 4),
    makeCell('Accommodation / 住宿', 4),
    makeCell('Booking status / 预订状态', 4),
  ]]

  for (let index = 0; index < trip.days.length; index += 1) {
    const day = trip.days[index]
    const accommodation = describeDailyAccommodation(day, index)

    rows.push([
      makeCell(day.date, 5),
      makeCell(weekdayLabel(day.date), 5),
      makeCell(day.city, 5),
      makeCell(day.title, 3),
      makeCell(summarizeRoute(day.routePlaceIds), 3),
      makeCell(summarizeVisaTransportForDay(day), 3),
      makeCell(accommodation.overnight, 5),
      makeCell(accommodation.label, 3),
      makeCell(accommodation.status, 3),
    ])
  }

  return rows
}

function buildAccommodationRows(groups) {
  const rows = [[
    makeCell('Check-in', 4),
    makeCell('Check-out', 4),
    makeCell('Nights', 4),
    makeCell('City / Area', 4),
    makeCell('Hotel / Accommodation', 4),
    makeCell('Address', 4),
    makeCell('Booking ref', 4),
    makeCell('Status', 4),
  ]]

  for (const group of groups) {
    rows.push([
      makeCell(group.startDate, 5),
      makeCell(group.checkOutDate, 5),
      makeCell(String(group.nights), 5),
      makeCell(group.cities.join(' / '), 5),
      makeCell(group.hotel?.name || '', 3),
      makeCell(group.hotel?.address || '', 3),
      makeCell(group.hotel?.orderRef || '', 3),
      makeCell(group.status.label, 3),
    ])
  }

  return rows
}

function buildTransportRows(entries) {
  const rows = [[
    makeCell('Date', 4),
    makeCell('Priority', 4),
    makeCell('Segment', 4),
    makeCell('From', 4),
    makeCell('To', 4),
    makeCell('Mode / Operator', 4),
    makeCell('Planned time', 4),
    makeCell('Booking ref / current record', 4),
    makeCell('Status', 4),
    makeCell('Notes', 4),
  ]]

  for (const entry of entries) {
    rows.push([
      makeCell(entry.date, 5),
      makeCell(entry.priority, 5),
      makeCell(entry.segment, 3),
      makeCell(entry.from, 3),
      makeCell(entry.to, 3),
      makeCell(entry.transport, 3),
      makeCell(entry.plannedTime, 5),
      makeCell(entry.bookingReference, 3),
      makeCell(entry.status, 3),
      makeCell(entry.notes, 3),
    ])
  }

  return rows
}

function buildPendingItems(groups, transportEntries) {
  const items = [
    {
      priority: '必须 / Required',
      category: '往返机票 / International flights',
      coverage: `${trip.days[0]?.date || ''} - ${trip.days[trip.days.length - 1]?.date || ''}`,
      item: '开口票：长沙 -> 罗马；米兰 -> 长沙',
      currentStatus: '当前数据只有计划入境/离境信息，没有正式机票预订单号。',
      action: '提交前补齐显示申请人姓名的正式往返或开口票预订单。'
    }
  ]

  for (const group of groups) {
    if (!group.status.pending) continue

    items.push({
      priority: '必须 / Required',
      category: '住宿证明 / Accommodation',
      coverage: `${group.startDate} - ${group.checkOutDate}`,
      item: group.hotel?.name || group.hotelPlaceId,
      currentStatus: group.status.label,
      action: '提交前补齐覆盖该时段的真实酒店预订确认；酒店名称、地址与入住离店日期需要明确。'
    })
  }

  for (const entry of transportEntries) {
    if (entry.kind !== 'transport' || !entry.pending) continue

    items.push({
      priority: '建议 / Recommended',
      category: '城际交通 / Intercity transport',
      coverage: entry.date,
      item: `${entry.from} -> ${entry.to}`,
      currentStatus: entry.status,
      action: '若最终锁定该段交通，建议附上与行程单一致的火车/船票预订记录。'
    })
  }

  return items
}

function buildPendingRows(items) {
  const rows = [[
    makeCell('Priority', 4),
    makeCell('Category', 4),
    makeCell('Coverage', 4),
    makeCell('Item', 4),
    makeCell('Current status in source data', 4),
    makeCell('Action before filing', 4),
  ]]

  for (const item of items) {
    rows.push([
      makeCell(item.priority, 5),
      makeCell(item.category, 5),
      makeCell(item.coverage, 5),
      makeCell(item.item, 3),
      makeCell(item.currentStatus, 3),
      makeCell(item.action, 3),
    ])
  }

  return rows
}

function buildSourceRows() {
  const rows = [[
    makeCell('Topic', 4),
    makeCell('Official note / 使用口径', 4),
    makeCell('Source', 4),
    makeCell('Link', 4),
  ]]

  for (const source of OFFICIAL_SOURCES) {
    rows.push([
      makeCell(source.topic, 5),
      makeCell(source.requirement, 3),
      makeCell(source.source, 5),
      makeCell(source.link, 3),
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
      <alignment horizontal="center" vertical="center" wrapText="1"/>
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
  <dc:title>意大利签证行程单导出</dc:title>
  <dc:subject>italyTravelCompanionData visa itinerary</dc:subject>
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

const accommodationGroups = buildOvernightGroups()
const accommodationStatusByHotel = new Map(accommodationGroups.map(group => [group.hotelPlaceId, group.status]))
const transportEntries = buildVisaTransportEntries()
const pendingItems = buildPendingItems(accommodationGroups, transportEntries)

const overviewRows = buildOverviewRows(pendingItems)
const itineraryRows = buildItineraryRows()
const accommodationRows = buildAccommodationRows(accommodationGroups)
const transportRows = buildTransportRows(transportEntries)
const pendingRows = buildPendingRows(pendingItems)
const sourceRows = buildSourceRows()

const sheets = [
  {
    name: '签证概览',
    xml: buildSheetXml({
      rows: overviewRows,
      widths: [22, 30, 18, 34, 18, 28],
      merges: ['A1:F1', 'A2:F2', 'A7:F7']
    })
  },
  {
    name: '行程单',
    xml: buildSheetXml({
      rows: itineraryRows,
      widths: [12, 9, 14, 24, 40, 34, 16, 34, 28],
      freeze: { ySplit: 1, topLeftCell: 'A2' },
      autoFilter: `A1:I${itineraryRows.length}`
    })
  },
  {
    name: '住宿汇总',
    xml: buildSheetXml({
      rows: accommodationRows,
      widths: [12, 12, 9, 16, 28, 34, 24, 28],
      freeze: { ySplit: 1, topLeftCell: 'A2' },
      autoFilter: `A1:H${accommodationRows.length}`
    })
  },
  {
    name: '交通汇总',
    xml: buildSheetXml({
      rows: transportRows,
      widths: [12, 14, 28, 24, 24, 28, 24, 30, 24, 42],
      freeze: { ySplit: 1, topLeftCell: 'A2' },
      autoFilter: `A1:J${transportRows.length}`
    })
  },
  {
    name: '待补材料',
    xml: buildSheetXml({
      rows: pendingRows,
      widths: [14, 20, 16, 28, 34, 40],
      freeze: { ySplit: 1, topLeftCell: 'A2' },
      autoFilter: `A1:F${pendingRows.length}`
    })
  },
  {
    name: '官方依据',
    xml: buildSheetXml({
      rows: sourceRows,
      widths: [24, 52, 28, 48],
      freeze: { ySplit: 1, topLeftCell: 'A2' },
      autoFilter: `A1:D${sourceRows.length}`
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

console.log(`Visa itinerary Excel exported: ${outputPath}`)
console.log(`Sheets: ${sheets.map(sheet => sheet.name).join(', ')}`)
