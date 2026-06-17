<script setup>
import { computed, ref, watch, watchEffect, onMounted } from 'vue'
import { italyTravelCompanionData as sourceTrip } from '@/data/italyTravelCompanionData'

const LOCALE_STORAGE_KEY = 'italy-3-locale'
const supportedLocales = ['zh', 'en']

const uiMessages = {
  zh: {
    languageLabel: '语言',
    zh: '中文',
    en: 'English',
    tabs: {
      today: '今日',
      todayCaption: '今日时间线',
      map: '地图',
      mapCaption: '当天地图',
      tickets: '票据',
      ticketsCaption: '票据',
      transport: '交通',
      transportCaption: '交通',
      trip: '旅程',
      tripCaption: '旅程总览',
    },
    quickCards: {
      hotel: '酒店',
      nextRide: '下一段交通',
      nextTicket: '下一张票',
      reminder: '提醒',
      reminderHeadline: '重要提醒',
    },
    actions: {
      switchToMap: '切到地图',
      viewMap: '查看地图',
      startNavigation: '开始导航',
      officialEntry: '官网入口',
      official: '官网',
      stationMap: '站点地图',
      arrivalNavigation: '到达导航',
      officialLink: '官网链接',
    },
    sections: {
      todayRoute: '今日行程',
      tickets: '票据管理',
      todayTickets: '今天要用的票',
      allTickets: '全部票据',
      transport: '交通',
      tripOverview: '旅程总览',
    },
    empty: {
      timeline: '今天暂无行程',
      tickets: '今天没有票据',
      transport: '今天没有交通段',
    },
    map: {
      today: '今天',
      all: '全部',
      todayLabel: '今天',
      cityOverview: '城市总览',
      allLabel: '全部',
      placesUnit: '个地点',
      loading: '加载中...',
      loadFailed: '地图加载失败，请检查 AMAP Key',
      idle: '点击"地图"标签加载地图',
      footnote: '点击标记查看地点详情 · 导航使用 Google/Apple Maps',
      plannedTime: '计划时间',
      navigationNote: '导航备注',
      contact: '联系人',
      orderRef: '订单号',
    },
    navModes: {
      walk: '步行',
      transit: '公交',
      drive: '打车',
    },
    detail: {
      ticketRules: '票务规则',
      needsActivation: '需要激活',
      activationNote: '需要在车站打卡激活车票',
      stationInfo: '站点信息',
      fallbackPlan: '备用方案',
    },
    badges: {
      citySwitch: '城市切换',
      starts: '起',
    },
    types: {
      hotel: '酒店',
      attraction: '景点',
      station: '车站',
      restaurant: '餐厅',
      airport: '机场',
      ticket: '票据',
      transport: '交通',
      place: '地点',
    },
    ticketTypes: {
      train: '火车',
      attraction: '景点票',
    },
  },
  en: {
    languageLabel: 'Language',
    zh: '中文',
    en: 'English',
    tabs: {
      today: 'Today',
      todayCaption: 'Timeline',
      map: 'Map',
      mapCaption: 'Day Map',
      tickets: 'Tickets',
      ticketsCaption: 'Passes',
      transport: 'Transport',
      transportCaption: 'Routes',
      trip: 'Trip',
      tripCaption: 'Overview',
    },
    quickCards: {
      hotel: 'Hotel',
      nextRide: 'Next Ride',
      nextTicket: 'Next Ticket',
      reminder: 'Reminder',
      reminderHeadline: 'Important Reminder',
    },
    actions: {
      switchToMap: 'Open Map',
      viewMap: 'View Map',
      startNavigation: 'Navigate',
      officialEntry: 'Official Site',
      official: 'Official',
      stationMap: 'Station Map',
      arrivalNavigation: 'Arrival Nav',
      officialLink: 'Official Link',
    },
    sections: {
      todayRoute: "Today's Plan",
      tickets: 'Ticket Manager',
      todayTickets: "Today's Tickets",
      allTickets: 'All Tickets',
      transport: 'Transport',
      tripOverview: 'Trip Overview',
    },
    empty: {
      timeline: 'No itinerary for today',
      tickets: 'No tickets today',
      transport: 'No transport legs today',
    },
    map: {
      today: 'Today',
      all: 'All',
      todayLabel: 'Today',
      cityOverview: 'City Overview',
      allLabel: 'All',
      placesUnit: 'places',
      loading: 'Loading...',
      loadFailed: 'Map failed to load. Check the AMAP key.',
      idle: 'Select the Map tab to load the map',
      footnote: 'Tap a marker for place details · Navigation opens Google/Apple Maps',
      plannedTime: 'Planned Time',
      navigationNote: 'Navigation Note',
      contact: 'Contact',
      orderRef: 'Order Ref',
    },
    navModes: {
      walk: 'Walk',
      transit: 'Transit',
      drive: 'Taxi',
    },
    detail: {
      ticketRules: 'Ticket Rules',
      needsActivation: 'Activation',
      activationNote: 'Validate the ticket at the station before boarding',
      stationInfo: 'Station Info',
      fallbackPlan: 'Fallback Plan',
    },
    badges: {
      citySwitch: 'City Switch',
      starts: 'starts',
    },
    types: {
      hotel: 'Hotel',
      attraction: 'Attraction',
      station: 'Station',
      restaurant: 'Food Area',
      airport: 'Airport',
      ticket: 'Ticket',
      transport: 'Transport',
      place: 'Place',
    },
    ticketTypes: {
      train: 'Train',
      attraction: 'Attraction Ticket',
    },
  },
}

const cityTranslations = {
  en: {
    '罗马': 'Rome',
    '佛罗伦萨': 'Florence',
    '多洛米蒂': 'Dolomites',
    '米兰': 'Milan',
  },
}

const dataTranslations = {
  en: {
    tripMeta: {
      title: 'Italy Honeymoon Travel Companion',
      subtitle: 'From Changsha, enter through Rome and depart from Milan, replacing the extra coastal leg with more time in Rome, Florence, and the Dolomites.',
      travelerNote: 'Booked stays: Sep 22-25 B&B HOTEL Roma Italia Viminale, Sep 25-26 FLOREST Guest House, Sep 26-28 Art Hotel Villa Agape, Sep 28-30 Ruby, Sep 30-Oct 3 Proihof, Oct 3-4 Palazzo Loreto Hotel Milano.',
    },
    days: {
      'day-rome-arrival': {
        title: 'Arrival And Recovery Night',
        weatherLabel: 'Early autumn 19-27°C · use the nearest 7-day forecast',
        topReminder: 'The only goal today is getting into the city smoothly and resting. If the wedding-photo luggage is heavy, take an official white taxi instead of forcing the train transfer.',
      },
      'day-rome-classic': {
        title: 'Classic Ancient Rome Route',
        weatherLabel: 'Early autumn 20-28°C · sunny to cloudy',
        topReminder: 'The Colosseum is the fixed-time ticket today. Wear comfortable shoes, and save passport photo pages plus QR codes in a phone album favorite.',
      },
      'day-rome-extra': {
        title: 'Slow Extra Day In Rome',
        weatherLabel: 'Early autumn 20-28°C · sunny to cloudy',
        topReminder: 'This day returns the former cross-city travel day to Rome. Keep only one hard reservation, then leave the rest to the Vatican area, the old town, and a slow dinner.',
        planningCards: [
          {
            label: 'Stay',
            title: 'Third Night In Rome',
            body: 'No luggage drag south and no ferry chase tomorrow. Stay around Termini / Monti, then go directly to the station for the high-speed train to Florence on Sep 25.',
          },
          {
            label: 'Pace',
            title: 'Only One Fixed Reservation',
            body: 'Put the Vatican Museums in the morning. Let St. Peter’s and the Piazza Navona / Pantheon area flex with energy, instead of turning the day into a museum marathon.',
          },
        ],
      },
      'day-rome-florence': {
        title: 'High-Speed Train From Rome To Florence',
        weatherLabel: 'Early autumn 18-27°C · sunny to cloudy',
        topReminder: 'Only one city transfer today: Rome to Florence in the morning, check in near San Marco - Santissima Annunziata in the afternoon, then keep the evening close to the hotel.',
        planningCards: [
          {
            label: 'Transport',
            title: 'Roma Termini → Firenze S. M. Novella',
            body: 'Prioritize a direct morning high-speed train and arrive around midday. That leaves the afternoon for food, supplies, and confirming the Sep 26 transfer from Via San Gallo to Villa Agape.',
          },
          {
            label: 'Stay',
            title: 'FLOREST Guest House Booked',
            body: 'Check in Sep 25 and check out Sep 26. Address: Via San Gallo 39 (NERO) Piano terzo, San Marco - Santissima Annunziata, 50129 Florence.',
          },
        ],
      },
      'day-florence-villa': {
        title: 'Easy Recovery And Villa Agape Check-In',
        weatherLabel: 'Early autumn 18-27°C · sunny',
        topReminder: 'Rome-to-Florence transfer is already done, so no major museum today. Focus on recovering energy and checking into Villa Agape calmly before the Sep 27 shoot.',
      },
      'day-photo': {
        title: 'Wedding Photo Flex Day',
        weatherLabel: 'Early autumn 18-26°C · follow the photographer’s schedule',
        topReminder: 'Today belongs fully to the photo shoot, with no extra booked museums, intercity moves, or strict restaurant reservations.',
      },
      'day-florence-duomo': {
        title: 'Dome And Cathedral Complex',
        weatherLabel: 'Early autumn 17-26°C · cloudy',
        topReminder: 'Check out from Villa Agape and move to the booked Ruby at Via della Scala, 50/2 in Santa Maria Novella. Store luggage before going to the Duomo.',
        planningCards: [
          {
            label: 'Stay',
            title: 'Ruby Booked',
            body: 'Sep 28 check-in, Sep 30 check-out, booked through Booking.com. Address: Via della Scala, 50/2, Santa Maria Novella, 50123 Florence.',
          },
          {
            label: 'Transport',
            title: 'Sep 30 To SMN Is Close, But Do Not Cut It Fine',
            body: 'Ruby is within an easy walk of SMN, but leave 10-15 minutes with luggage. If it rains or bags are heavy, ask reception for a short taxi.',
          },
        ],
      },
      'day-florence-extra': {
        title: 'Extra Florence Day',
        weatherLabel: 'Early autumn 18-26°C · sunny to cloudy',
        topReminder: 'Stay at Ruby again tonight. It is in the Santa Maria Novella area, so Uffizi is easy by foot or short taxi. Repack luggage tonight for the Sep 30 mountain transfer.',
        planningCards: [
          {
            label: 'Why',
            title: 'Keep The Extra Florence Day, Move To Ruby',
            body: 'Villa Agape still supports the wedding-photo rhythm on Sep 26-27; Ruby puts Sep 28-29 back near SMN, which makes the Sep 30 train north much easier.',
          },
          {
            label: 'Route',
            title: 'Ruby → Uffizi → Oltrarno → Santo Spirito',
            body: 'Walk light from Ruby to Uffizi in the morning, cross the river for Oltrarno and Santo Spirito in the afternoon, then return to pack for the Dolomites.',
          },
          {
            label: 'Reminder',
            title: 'Prepare Sep 30 Check-Out Early',
            body: 'Ruby is close to SMN, but do not stack check-out, breakfast, and station entry together. Organize luggage and train QR codes ahead of time.',
          },
        ],
      },
      'day-florence-dolomites': {
        title: 'Florence To Val Di Funes / Proihof',
        weatherLabel: 'Mountain 7-18°C · big morning and evening temperature swings',
        topReminder: 'Go from Florence to Proihof today. It sits in Val di Funes / Santa Maddalena, not central Ortisei, so arrange a taxi or hotel transfer from Bolzano if possible.',
        planningCards: [
          {
            label: 'Transport',
            title: 'SMN → Bolzano → Proihof',
            body: 'Take the train to Bolzano first, then continue into Val di Funes. Public transport works, but transfers are fragmented; with large luggage, favor taxi / private transfer.',
          },
          {
            label: 'Stay',
            title: 'Dolomites Stay At Proihof',
            body: 'Proihof gives quiet Val di Funes scenery rather than Ortisei cable-car convenience. The next two days need a clear tradeoff between local views and farther Seceda.',
          },
        ],
      },
      'day-dolomites-scenic': {
        title: 'Seceda And Alpe Di Siusi',
        weatherLabel: 'Mountain 6-17°C · wind can make it feel colder',
        topReminder: 'Since Proihof is not in Ortisei, Seceda / Alpe di Siusi means longer transfers. If weather or energy is mediocre, switch to local Val di Funes scenery.',
        planningCards: [
          {
            label: 'Route',
            title: 'Seceda Early + Alpe Di Siusi Later',
            body: 'If going to Seceda, leave early and pre-arrange transport. Do not rush lunch; Alpe di Siusi in the afternoon is a bonus, not a requirement.',
          },
          {
            label: 'Transport',
            title: 'The No-Car Version Still Works',
            body: 'After choosing Proihof, this is no longer the version where you walk to Ortisei cable cars. The key is booking transfers or trimming to local scenery decisively.',
          },
          {
            label: 'Clothing',
            title: 'Bring A Windproof Jacket',
            body: 'Early October is already cold in the mountains. Even if the valley feels mild, Seceda wind can be much harsher. Shoes should handle gravel and grass.',
          },
        ],
      },
      'day-dolomites-buffer': {
        title: 'Dolomites Flexible Buffer Day',
        weatherLabel: 'Mountain 6-17°C · prioritize wind conditions',
        topReminder: 'This day is best used as a weather buffer around Proihof and Val di Funes. From Santa Maddalena, local Odle / Geisler views are easier than going back to Ortisei.',
        planningCards: [
          {
            label: 'Strategy',
            title: 'A Buffer Day, Not A Place-Stuffing Day',
            body: 'The new version means Oct 2 no longer rushes to Milan. If mountain weather is poor earlier, move the key view here; if weather is already good, lower intensity today.',
          },
          {
            label: 'Pace',
            title: 'Slow Val Di Funes Beats Cross-Valley Backtracking',
            body: 'Use today for Santa Maddalena, the San Giovanni chapel viewpoint, walks around Proihof, and lunch. It makes Oct 3 a simple return connection to Milan.',
          },
        ],
      },
      'day-dolomites-milan': {
        title: 'Down To Milan, Keeping Only Return-City Functions',
        weatherLabel: 'Early autumn 15-23°C · cloudy',
        topReminder: 'Descend from Proihof to Milan today and stay at the booked Palazzo Loreto Hotel Milano. The hotel is around Loreto / Viale Monza, not next to Centrale.',
      },
      'day-milan-departure': {
        title: 'Departure Day',
        weatherLabel: 'Early autumn 14-22°C · follow airport updates',
        topReminder: 'Planned backward from the Oct 4, 2026 12:15 MXP flight. Leave Palazzo Loreto around 07:00, connect to Centrale by M2 or taxi, then take Malpensa Express.',
      },
    },
    places: {
      'fco-airport': {
        name: 'Rome Fiumicino Airport FCO',
        orderRef: 'Outbound flight pending',
        note: 'Current plan lands here at 18:30 on Sep 22. After landing, confirm checked luggage and SIM/eSIM first, then decide between train and taxi into the city.',
        navigationNote: 'After landing, follow Train / Taxi signs directly; do not go to the departures level first.',
        riskTags: ['International arrival queues can vary', 'Taxi first if wedding-photo luggage is heavy', 'Avoid unofficial taxi touts'],
        contact: 'Recommended flight shape: one open-jaw ticket, Changsha → Rome and Milan → Changsha.',
      },
      'rome-termini': {
        orderRef: 'Leonardo Express / high-speed rail node',
        note: 'When staying around Monti, this is the steadiest station for entering and leaving Rome; the Sep 25 train to Florence also departs from here.',
        navigationNote: 'Check the station board one last time for platform updates; do not rely only on app screenshots.',
        riskTags: ['High pickpocket risk', 'Platforms may be announced late', 'Taxi queues can be slow at peak times'],
        contact: 'Use both the Trenitalia app and the station boards.',
      },
      'hotel-rome': {
        orderRef: 'B&B HOTEL booked: Sep 22 check-in, Sep 25 check-out, 3 nights',
        note: 'The first three nights in Rome are booked through B&B HOTEL. The location between Viminale and Monti works well for walking plus metro, and is convenient for the Sep 25 train from Termini.',
        navigationNote: 'Save the confirmation email, check-in name, payment status, and city tax rules offline in advance.',
        riskTags: ['3 nights booked', 'About 10-12 minutes on foot to Termini', 'Check out Sep 25 for the station'],
        contact: 'Booking channel: B&B HOTEL.',
      },
      'monti-evening': {
        name: 'Monti Dinner Walk Area',
        address: 'Around Via Urbana / Via dei Serpenti, 00184 Rome',
        note: 'Keep this to 60-90 minutes: a relaxed dinner, then straight back to the hotel to recover from jet lag.',
        navigationNote: 'Do not wander too far; a 10-15 minute walking radius around the hotel is enough.',
        riskTags: ['First-night energy is uncertain', 'Popular restaurants may have queues'],
        contact: 'No need to book a fancy restaurant; rest matters more tonight.',
      },
      'colosseum': {
        name: 'Colosseum',
        orderRef: 'To be booked',
        note: 'Plan about 90 minutes here. Afterward, walk directly to the Roman Forum instead of doubling back.',
        navigationNote: 'Follow the entrance shown on the ticket and security signs; ignore outside tour touts.',
        riskTags: ['Named ticket', 'Arrive 15 minutes early', 'Carry passport'],
        contact: 'Buy official tickets only; pricey third-party skip-the-line packages are usually unnecessary.',
      },
      'roman-forum': {
        name: 'Roman Forum And Palatine Hill',
        orderRef: 'Included with Colosseum ticket',
        note: 'Plan 2-2.5 hours. It is exposed, so bring water and hats.',
        navigationNote: 'Do not exit the wrong way; walking back to Monti for lunch is the smoothest route.',
        riskTags: ['Uneven ground', 'Strong sun exposure', 'Many steps'],
        contact: 'If tired, cut the deeper Palatine section.',
      },
      'monti-lunch': {
        name: 'Monti Lunch Area',
        address: 'Around Via dei Serpenti, 00184 Rome',
        note: 'Keep lunch around 60 minutes, then leave the afternoon for the old town rather than adding another museum.',
        navigationNote: 'Walk straight back to Monti from the Forum; do not detour to the hotel first.',
        riskTags: ['Midday heat', 'Popular restaurants may queue'],
        contact: 'For a honeymoon-style restaurant, book by phone 1-2 days ahead.',
      },
      'trevi': {
        name: 'Trevi Fountain',
        note: 'Stay 20-30 minutes. Good for a quick photo stop, not for lingering in the crowd.',
        navigationNote: 'After photos, move on to the Spanish Steps instead of standing in the packed center.',
        riskTags: ['Very dense crowds', 'Watch phones closely', 'Later hours are more comfortable'],
        contact: 'No reservation needed.',
      },
      'spanish-steps': {
        name: 'Spanish Steps',
        note: 'Plan 30-40 minutes. This is enough for today; have dinner back near the hotel.',
        navigationNote: 'For easy couple photos, the light is usually softer here than at midday.',
        riskTags: ['Many steps', 'Crowded at popular hours'],
        contact: 'No extra reservation required.',
      },
      'vatican-museums': {
        name: 'Vatican Museums',
        orderRef: 'To be booked',
        note: 'Make this the single fixed reservation on the extra Rome day. Focus on the main route and Sistine Chapel; do not try to exhaust every gallery.',
        navigationNote: 'From the hotel, take Metro A to Ottaviano / Cipro and walk to the entrance. Confirm the ticket entrance and IDs before entry.',
        riskTags: ['Named ticket', 'Security queue', 'Physically tiring museum'],
        contact: 'Buy only from Vatican official ticketing or trusted channels; avoid overpriced walk-up group sellers.',
      },
      'st-peters': {
        name: 'St. Peter’s Basilica',
        note: 'After the Vatican Museums, decide based on energy whether to enter. If the queue is too long, enjoy the square and facade, and save energy for the afternoon.',
        navigationNote: 'Cover shoulders and knees. Pickpockets are also common around the square.',
        riskTags: ['Security queue', 'Dress code', 'Midday sun exposure'],
        contact: 'The basilica itself usually has no standard entry ticket; the dome is separate.',
      },
      'navona-pantheon': {
        name: 'Piazza Navona / Pantheon Area',
        note: 'Make the afternoon a slow old-town walk: Piazza Navona, Pantheon, coffee, and gelato as energy allows.',
        navigationNote: 'From the Vatican, take a taxi or bus to the edge of the old town, saving steps for the pre-dinner walk.',
        riskTags: ['Tourist crowds', 'Popular restaurants may queue', 'Watch phones closely'],
        contact: 'If entering the Pantheon, recheck ticketing and opening hours for that day.',
      },
      'trastevere-dinner': {
        name: 'Trastevere Dinner Walk Area',
        note: 'Put the final Rome evening in Trastevere for more local atmosphere. Pick a saved trattoria, then take a taxi back to the hotel.',
        navigationNote: 'After dinner, do not force the walk back just to save money, especially with cameras and passports.',
        riskTags: ['Popular spots queue', 'Watch belongings in small lanes at night', 'Taxi waits may happen'],
        contact: 'Book popular restaurants 1-2 days ahead if you care about a specific place.',
      },
      'florence-smn': {
        orderRef: 'High-speed rail node',
        note: 'After removing the southern coast detour, Sep 25 goes directly from Rome into Florence, making this an easy city-transfer node.',
        navigationNote: 'After arrival, store luggage or check in first; avoid dragging suitcases through old-town stone streets.',
        riskTags: ['Platform changes', 'Dense station-front crowds', 'Uneven pavement with luggage'],
        contact: 'Both Trenitalia and Italo use this station.',
      },
      'hotel-florence-florest': {
        orderRef: 'Booked: Sep 25 check-in, Sep 26 check-out, 1 night',
        note: 'After arriving from Rome, stay one night at FLOREST Guest House, then move to Villa Agape during the next day. This separates the city transfer from the uphill hotel move.',
        navigationNote: 'From SMN, walk 12-15 minutes or take a short taxi. Confirm doorbell, access code, and check-in instructions before deciding whether to store luggage first.',
        riskTags: ['1 night booked', 'Third floor: confirm elevator', 'Save door code / self check-in instructions'],
        contact: 'Save confirmation email, check-in name, access instructions, and accommodation phone number.',
      },
      'san-marco-evening': {
        name: 'San Marco / Santissima Annunziata Dinner Area',
        note: 'On the first Florence evening, keep to supplies, a short walk, and dinner near the hotel. Save energy for Villa Agape on Sep 26 and the photo shoot on Sep 27.',
        navigationNote: 'Stay within a 10-15 minute walk of the hotel; do not double back to SMN or cross the river.',
        riskTags: ['Restaurant queues at popular hours', 'Drop luggage in the room first'],
        contact: 'Save a few easy restaurants around Via San Gallo, Piazza San Marco, and Santissima Annunziata.',
      },
      'ponte-vecchio': {
        name: 'Ponte Vecchio',
        note: 'After returning to Florence, keep this as the first stop on a light recovery route.',
        navigationNote: 'If the bridge is too crowded, shoot from either end instead of waiting in the thick of it.',
        riskTags: ['Harsh midday light', 'Dense tourists'],
        contact: 'Good area for gelato and a short pause.',
      },
      'oltrarno': {
        name: 'Oltrarno Slow Walk Area',
        address: 'Around Santo Spirito / San Frediano, 50125 Florence',
        note: 'Lunch and a slow walk fit best here. In this route, Oltrarno helps the body downshift after the Rome-to-Florence move.',
        navigationNote: 'Leave space here; do not add another museum spontaneously.',
        riskTags: ['Afternoon sleepiness', 'Restaurant lunch breaks vary'],
        contact: 'Good for street photos and aperitivo.',
      },
      'piazzale-michelangelo': {
        name: 'Piazzale Michelangelo',
        note: 'A good Sep 26 sunset finish, and a chance to get familiar with the city mood before the next day’s shoot.',
        navigationNote: 'Taxi uphill if needed; decide whether to walk downhill based on energy.',
        riskTags: ['Crowded around sunset', 'Uphill walk can be tiring'],
        contact: 'Good place for a quick relaxed couple-photo set.',
      },
      'hotel-villa-agape': {
        orderRef: 'Simplebooking booked: Sep 26 check-in, Sep 28 check-out, 2 nights',
        note: 'Art Hotel Villa Agape is booked for two nights through Simplebooking, covering Sep 26-28 and supporting the Sep 27 wedding shoot.',
        navigationNote: 'Ask the hotel in advance about shuttle / taxi options. After Sep 28 check-out, move with luggage to Ruby.',
        riskTags: ['2 nights booked', 'Hill location favors taxi', 'Move to city hotel on Sep 28'],
        contact: 'Booking channel: Simplebooking. Save confirmation email and screenshots offline.',
      },
      'hotel-florence-ruby': {
        orderRef: 'Booking.com booked: Sep 28 check-in, Sep 30 check-out, 2 nights',
        note: 'Ruby is booked for two nights through Booking.com. The Via della Scala, 50/2 address is in the Santa Maria Novella area and works well for the Sep 30 SMN departure.',
        navigationNote: 'After checking out from Villa Agape, take a taxi here to store luggage. On Sep 30, still leave 10-15 minutes for walking to SMN with bags.',
        riskTags: ['2 nights booked', 'SMN walk-friendly', 'Booking.com order'],
        contact: 'Booking channel: Booking.com. Save order number, check-in name, and city tax notes.',
      },
      'brunelleschi-dome': {
        name: 'Brunelleschi Dome',
        orderRef: 'To be booked',
        note: 'Plan 75-90 minutes. The dome is the most worthwhile part of the Brunelleschi Pass.',
        navigationNote: 'The dome has timed entry; follow the ticket time strictly today.',
        riskTags: ['Many steps', 'Bad for rushing', 'Late arrival is risky'],
        contact: 'Prioritize the Brunelleschi Pass.',
      },
      'baptistery': {
        name: 'Baptistery Of San Giovanni',
        orderRef: 'Included with Brunelleschi Pass',
        note: 'Plan 25-35 minutes. It is most efficient right after descending from the dome.',
        navigationNote: 'Do not leave this too late; the afternoon crowd gets messier.',
        riskTags: ['Linked to Duomo pass', 'Queue time varies'],
        contact: 'Complete it within the same pass.',
      },
      'duomo-museum': {
        name: 'Opera Del Duomo Museum',
        orderRef: 'Included with Brunelleschi Pass',
        note: 'Plan 60-75 minutes. This part is often more rewarding than expected.',
        navigationNote: 'If tired in the morning, prioritize this museum and cut the later free-walk section.',
        riskTags: ['Information-heavy museum', 'Crowds build near noon'],
        contact: 'Use the same pass.',
      },
      'santa-croce': {
        name: 'Santa Croce Area',
        note: 'Plan 60-90 minutes as an easy finish. Return to the SMN-area hotel early in the evening.',
        navigationNote: 'If energy is low, skip this and rest at Ruby.',
        riskTags: ['Afternoon fatigue', 'Taxi back to the hotel is recommended'],
        contact: 'Good area for an early quiet dinner.',
      },
      'uffizi': {
        name: 'Uffizi Gallery',
        orderRef: 'To be booked',
        note: 'After removing Tuscany, Sep 29 naturally returns to Florence. A Tuesday morning Uffizi slot avoids the Sep 27 shoot and the Sep 28 Duomo pass.',
        navigationNote: 'Prepare ID for named tickets. Morning entry saves energy and makes this a full Florence art day.',
        riskTags: ['Named ticket', 'Long museum visit', 'Book ahead'],
        contact: 'The official Uffizi ticket page updates prices and purchase links; book from the official page before departure.',
      },
      'santo-spirito-evening': {
        name: 'Santo Spirito Slow Dinner Area',
        note: 'This is the newly gained Florence breathing room. Dinner and a slow walk in Santo Spirito feel more honeymoon-like than forcing another sight.',
        navigationNote: 'If Uffizi runs long, shift this later, but do not add another major museum.',
        riskTags: ['Evening restaurant queues', 'Slowing down matters more than checklists'],
        contact: 'Pick an atmospheric trattoria as the ending of the extra Florence day.',
      },
      'villa-agape-dinner': {
        name: 'La Duchessa Dinner',
        note: 'After returning to Villa Agape, dinner at La Duchessa is the easiest option. It serves as a fallback dinner for the extra Florence day or an early hotel-night finish.',
        navigationNote: 'If you already ate in Santo Spirito, use this only as a rest point; if you do not want to go back into town, dine at the hotel.',
        riskTags: ['Best reserved the day before', 'Eat early and sleep early', 'Do not add another night-view route'],
        contact: 'Reservation phone: +39 055 220044',
      },
      'bolzano-station': {
        name: 'Bolzano / Bozen',
        orderRef: 'Rail and mountain-transfer node',
        note: 'Bolzano is the smoothest rail entry for going from Florence into the Dolomites, then continuing by bus or taxi toward Val di Funes / Proihof.',
        navigationNote: 'With large luggage, confirm the Val di Funes bus / taxi plan after arrival instead of dragging bags around.',
        riskTags: ['Leave margin for transfers', 'Mountain buses can crowd at peak times'],
        contact: 'South Tyrol Mobility bus and rail info connects from here. Ask Proihof about transfer suggestions in advance.',
      },
      'hotel-proihof': {
        orderRef: 'Booking.com booked: Sep 30 check-in, Oct 3 check-out, 3 nights',
        note: 'Proihof is booked for three nights through Booking.com. It sits in Val di Funes / Santa Maddalena, with quiet Odle / Geisler views rather than Ortisei cable-car convenience.',
        navigationNote: 'Confirm bus transfers, taxi, or lodging pickup from Bolzano in advance. Do not estimate transport as if staying in central Ortisei.',
        riskTags: ['3 nights booked', 'Val di Funes location', 'Transfers need planning'],
        contact: 'Booking channel: Booking.com. Contact the lodging before departure to confirm arrival time and transfer advice.',
      },
      'funes-evening': {
        name: 'Santa Maddalena Evening Walk And Dinner',
        note: 'Do not chase distant viewpoints on the first mountain evening. Eat, walk, and enjoy the mountain view around Proihof and Santa Maddalena.',
        navigationNote: 'Temperatures drop quickly after dark; return to the hotel after dinner.',
        riskTags: ['Colder mountain nights', 'Restaurants may require reservations'],
        contact: 'Keep this evening to a simple dinner and early sleep.',
      },
      'st-cristina-viewpoint': {
        name: 'Santa Cristina / St. Christina Valley View',
        note: 'Now that Oct 2 no longer rushes downhill, this is a gentle valley view and town walk. It works as a low-pressure weather-buffer alternative.',
        navigationNote: 'If Oct 1 weather was poor, prioritize the main view today. Only use this as a slow bonus if the key scenery is already covered.',
        riskTags: ['Do not overload the buffer day', 'Decide based on weather'],
        contact: 'Val Gardena’s official site is a useful area information entry.',
      },
      seceda: {
        orderRef: 'Cableway ticket pending',
        note: 'Seceda is the main Dolomites view worth preserving. Keep it to relaxed sightseeing, not hard hiking.',
        navigationNote: 'Going up in the morning is best; if windy, limit the stay to 60-90 minutes.',
        riskTags: ['Recheck cableway season', 'Wind affects comfort', 'Large temperature difference at the top'],
        contact: 'Seceda usually publishes seasonal operations ahead of time; recheck 2026 dates.',
      },
      'funes-lunch': {
        name: 'Val Di Funes Lunch Recovery Stop',
        note: 'Returning near the Val di Funes lodging for lunch is the steadiest choice and helps recover from morning wind and walking fatigue.',
        navigationNote: 'If the morning already felt tiring, keeping only Santa Maddalena / San Giovanni viewpoints in the afternoon is perfectly fine.',
        riskTags: ['Afternoon sleepiness', 'Avoid heavy alcohol'],
        contact: 'Prioritize warm food and hydration.',
      },
      'alpe-di-siusi': {
        name: 'Alpe Di Siusi',
        orderRef: 'Cableway / mountain ticket pending',
        note: 'If Seceda already satisfies the mountain-view goal, make this an easy meadow walk and photo route. It is gentler and more honeymoon-like than a sharp ridge.',
        navigationNote: 'This is about meadow views and open space, not counting sights.',
        riskTags: ['Recheck cableway season', 'Do not return too late', 'Keep warm if windy'],
        contact: 'Seiser Alm updates cableway and mountain-area info; recheck 30-60 days before departure.',
      },
      'milano-centrale': {
        name: 'Milano Centrale',
        orderRef: 'High-speed rail and airport-line node',
        note: 'In this version, Milan only serves the return-city role, with key actions centered on Centrale.',
        navigationNote: 'On Oct 3, casually locate the Malpensa Express area so Oct 4 morning is calmer.',
        riskTags: ['Large busy station', 'Platforms may change late', 'Heavy traffic outside'],
        contact: 'On departure day, arrive at the station at least 15-20 minutes early.',
      },
      'hotel-milan': {
        orderRef: 'Simplebooking booked: Oct 3 check-in, Oct 4 check-out, 1 night',
        note: 'Palazzo Loreto Hotel Milano is booked through Simplebooking. It is in the Loreto / Viale Monza area, not beside Centrale, but connects by M1 / M2 or taxi.',
        navigationNote: 'On Oct 4, go from the hotel to Milano Centrale first, then take Malpensa Express. With heavy luggage, taxi to Centrale is steadier.',
        riskTags: ['1 night booked', 'Loreto / Viale Monza', 'Airport line requires Centrale connection'],
        contact: 'Booking channel: Simplebooking. Save confirmation email, check-in name, and city tax rules.',
      },
      'porta-nuova-evening': {
        name: 'Porta Nuova Dinner Buffer Area',
        note: 'Keep only one easy dinner area today. It is not far from Centrale; after dinner, return to pack and sleep early.',
        navigationNote: 'Do not turn this evening into another night sightseeing route; return-day buffering matters more.',
        riskTags: ['Friday evening may be busy', 'Good for a short stop, not a long march'],
        contact: 'If too tired, dinner around Centrale is completely fine.',
      },
      'malpensa-airport': {
        name: 'Milan Malpensa Airport MXP',
        orderRef: 'Oct 4, 2026 12:15 MXP departure',
        note: 'Currently planned around a 12:15 flight from MXP on Oct 4, 2026. If the final airport changes to LIN / BGY, update the last hotel and airport transfer.',
        navigationNote: 'Check the airline desk and tax refund queues first, then decide whether to browse shops.',
        riskTags: ['International security can be slow', 'Tax refund queues vary', 'Do not cut departure day fine'],
        contact: 'Book return flight together with the outbound as an open-jaw ticket if possible.',
      },
    },
    tickets: {
      'ticket-colosseum': {
        title: 'Colosseum Full Experience Arena',
        orderRef: 'To be booked',
        qrLabel: 'Save QR after booking',
        notes: ['Official site: ticketing.colosseo.it', 'Prefer Full Experience Arena', 'If unavailable, step down to standard 24h ticket'],
        warnings: ['Named ticket', 'Carry passport', 'Arrive 15 minutes early'],
        releaseReminder: 'Official tickets are often released around 30 days before travel; start watching around Aug 23, 2026.',
      },
      'ticket-vatican': {
        title: 'Vatican Museums Morning Slot',
        orderRef: 'To be booked',
        qrLabel: 'Save QR after booking',
        notes: ['Only hard reservation on the Sep 24 extra Rome day', 'Morning slot preferred', 'Do not miss the Sistine Chapel'],
        warnings: ['Named ticket', 'Security queue', 'Physically tiring museum'],
        releaseReminder: 'Vatican official ticketing releases rolling availability; start watching morning slots around July 2026.',
      },
      'ticket-rome-florence': {
        title: 'Roma Termini → Firenze S. M. Novella',
        orderRef: 'To be booked',
        qrLabel: 'E-ticket QR',
        notes: ['Direct morning train preferred', 'Arriving around midday is most comfortable', 'Prefer flexible tickets'],
        warnings: ['Use station board for platform', 'Leave 20 minutes for station entry'],
        releaseReminder: 'Usually best 30-60 days ahead; prioritize direct morning trains.',
      },
      'ticket-uffizi': {
        title: 'Uffizi Gallery Morning Slot',
        orderRef: 'To be booked',
        qrLabel: 'Save QR after booking',
        notes: ['Official entry: uffizi.it / tickets.uffizi.it', 'Morning is easiest', 'Sep 29 Tuesday restores a full Florence art day'],
        warnings: ['Named ticket', 'Arrive 15 minutes early', 'Physically tiring museum'],
        releaseReminder: 'The Uffizi official ticket page updates ticket types and prices; lock a morning slot around July 2026.',
      },
      'ticket-duomo-firenze': {
        title: 'Brunelleschi Pass',
        orderRef: 'To be booked',
        qrLabel: 'Save QR after booking',
        notes: ['Brunelleschi Pass remains the best fit', 'Includes the dome and has the best value', 'Giotto / Ghiberti Pass can be fallback options'],
        warnings: ['Timed dome entry', 'Many steps', 'Late arrival is troublesome'],
        releaseReminder: 'Book around July 2026 if possible; this remains the Florence ticket most worth locking.',
      },
      'ticket-florence-bolzano': {
        title: 'Firenze S. M. Novella → Bolzano / Bozen',
        orderRef: 'To be booked',
        qrLabel: 'E-ticket QR',
        notes: ['Direct preferred; if unavailable, choose one transfer via Verona', 'Arriving around midday in Bolzano is most comfortable'],
        warnings: ['Do not book too late on a mountain-transfer day', 'Leave margin for bus connection'],
        releaseReminder: 'Usually best 30-60 days ahead; prioritize trains arriving late morning to midday.',
      },
      'ticket-seceda': {
        title: 'Seceda Cableway Ticket',
        orderRef: 'Buy same day / to be confirmed',
        qrLabel: 'Cableway ticket',
        notes: ['Recheck official operating season', 'Morning ascent preferred', 'Buying on site is also common'],
        warnings: ['Wind affects experience', 'Confirm it is still operating before departure'],
        releaseReminder: 'Seceda seasonal operations are usually published before the season; recheck whether early Oct 2026 is operating.',
      },
      'ticket-alpedisiusi': {
        title: 'Alpe Di Siusi Cableway / Mountain Ticket',
        orderRef: 'Buy same day / to be confirmed',
        qrLabel: 'Cableway ticket',
        notes: ['Easy afternoon meadow route', 'Cut it if the morning already feels tiring', 'Recheck operating season before departure'],
        warnings: ['Season and wind need checking', 'Do not return too late'],
        releaseReminder: 'Alpe di Siusi cableway information updates on the official site; recheck 2026 operations.',
      },
      'ticket-bolzano-milan': {
        title: 'Bolzano / Bozen → Milano Centrale',
        orderRef: 'To be booked',
        qrLabel: 'E-ticket QR',
        notes: ['Descend and go directly to Milan on Oct 3', 'Prefer around midday trains', 'Do not stack another attraction ticket'],
        warnings: ['Leave margin if mountain bus is slow', 'Use station board for platform'],
        releaseReminder: 'Usually best 30-60 days ahead; prioritize flexible options.',
      },
    },
    transportLegs: {
      'leg-fco-rome': {
        title: 'FCO Into Rome And Hotel',
        operator: 'Leonardo Express / official taxi',
        ticketRules: 'With light luggage, take Leonardo Express to Roma Termini. If checked luggage is heavy or the flight is delayed, take an official white taxi directly.',
        fallbackPlan: 'If the train queue is too long or you feel exhausted, take a regular taxi and do not spend the first night on transfers.',
        stationInfo: 'Leonardo Express takes about 32 minutes to Termini officially; for Monti stays, it is the steadiest overall option.',
      },
      'leg-rome-colosseum': {
        title: 'Hotel To Colosseum',
        operator: 'Walk / Metro B',
        ticketRules: 'From Viminale / Monti, walking is easiest. Take Metro B only if you want to save energy.',
        fallbackPlan: 'If it rains or you wake late, taxi straight to the Colosseum perimeter and protect the timed ticket.',
        stationInfo: 'About 20 minutes on foot; by metro, use Colosseo station.',
      },
      'leg-rome-vatican': {
        title: 'Hotel To Vatican Museums',
        operator: 'Metro A / Taxi',
        ticketRules: 'Take Metro A to Ottaviano or Cipro and walk. If late or carrying a heavy camera bag, taxi directly near the entrance.',
        fallbackPlan: 'If Vatican tickets are unavailable, switch the morning to Castel Sant’Angelo exterior + slow old-town coffee.',
        stationInfo: 'The Vatican Museums entrance is not on the front of St. Peter’s Square; navigate directly to Musei Vaticani.',
      },
      'leg-rome-florence': {
        title: 'Rome To Florence',
        ticketRules: 'Prefer a direct morning train and arrive around midday. Do not buy too early a train; leave margin for checkout, breakfast, and luggage.',
        fallbackPlan: 'If morning prices are too high, move to a direct train around midday; the rest of today is a low-intensity Florence adjustment.',
        stationInfo: 'Roma Termini and Firenze SMN are both core stations; use live station boards for platforms.',
      },
      'leg-florence-center-villa': {
        title: 'City Center To Villa Agape',
        ticketRules: 'Villa Agape is uphill, so do not drag luggage on foot. Take a taxi or ask the hotel about shuttle options.',
        fallbackPlan: 'If energy is still low, taxi directly from Ponte Vecchio or Oltrarno to the hotel and cut the sunset stop.',
        stationInfo: 'The uphill section makes taxi comfort noticeably better.',
      },
      'leg-villa-ruby-switch': {
        title: 'Check Out Villa Agape And Move To Ruby',
        ticketRules: 'Finish the hotel move and luggage storage first, then go to the Duomo. Villa Agape is uphill, so avoid bus or walking with suitcases.',
        fallbackPlan: 'If checkout or taxi is slow, have one person handle storage while the other watches the Duomo entry time; do not queue for the dome with luggage.',
        stationInfo: 'Ruby is at Via della Scala, 50/2 near Santa Maria Novella, useful for the Sep 30 SMN departure.',
      },
      'leg-ruby-duomo': {
        title: 'Ruby To Duomo',
        operator: 'Walk / Taxi',
        ticketRules: 'After storing luggage, walking to the Duomo is usually smooth. If the hotel move runs late, taxi to the Duomo perimeter.',
        fallbackPlan: 'If the 09:00 dome slot feels too tight, book the dome for 09:30-10:00 to leave luggage-storage buffer.',
        stationInfo: 'SMN to Duomo is not far, but stone streets are rough with suitcases, so store luggage first.',
      },
      'leg-ruby-uffizi-day': {
        title: 'Ruby To Uffizi',
        operator: 'Walk / Taxi',
        ticketRules: 'Walking from the SMN area to Uffizi is fine, but do not cut a morning ticket too close. If late or rainy, taxi to the river-side edge.',
        fallbackPlan: 'If Uffizi moves to a later slot, do a slow old-town walk in the morning and enter after lunch.',
        stationInfo: 'A city hotel reduces transport pressure today compared with the hillside hotel.',
      },
      'leg-ruby-smn-departure': {
        title: 'Ruby To SMN For Train',
        operator: 'Walk / Taxi',
        ticketRules: 'The hotel is close to SMN, so walking is normally fine. In heavy rain or with heavy bags, ask reception for a short taxi.',
        fallbackPlan: 'If breakfast delays you, check out and go to the station; handle coffee and breakfast inside the station.',
        stationInfo: 'Staying near SMN is meant to reduce transfer risk today; aim to enter the station around 08:35.',
      },
      'leg-florence-bolzano': {
        title: 'Florence To Bolzano',
        ticketRules: 'Direct is preferred. If no direct train exists, one transfer is acceptable, but avoid very tight connections.',
        fallbackPlan: 'If national rail has disruptions, just protect arrival in Bolzano that day; Proihof can be reached later.',
        stationInfo: 'Bolzano is one of the steadiest rail gateways into the Dolomites.',
      },
      'leg-bolzano-proihof': {
        title: 'Bolzano Up To Proihof',
        operator: 'South Tyrol Mobility bus / taxi / private transfer',
        ticketRules: 'No-car version goes to Bolzano first, then connects toward Val di Funes by bus, taxi, or lodging advice. With large luggage, taxi feels much better.',
        fallbackPlan: 'If the train is badly delayed, taxi directly to Proihof instead of gambling on mountain connections.',
        stationInfo: 'Use South Tyrol Mobility for Bolzano - Val di Funes route planning and recheck the 2026 seasonal timetable before departure.',
      },
      'leg-proihof-seceda': {
        title: 'Proihof To Seceda',
        ticketRules: 'From Proihof, first transfer to Ortisei, then take the Ortisei-Furnes-Seceda cableway. Do this only in good weather and with enough energy.',
        fallbackPlan: 'If wind, low cloud, off-season cableway status, or transfer cost is bad, cancel and switch to local Val di Funes scenery.',
        stationInfo: 'After choosing Proihof, cross-valley transfer is the core risk; recheck both operating season and travel time.',
      },
      'leg-proihof-alpedisiusi': {
        title: 'Proihof To Alpe Di Siusi',
        operator: 'Taxi / Bus + Seiser Alm cableway',
        ticketRules: 'This is a bonus, not essential. From Proihof the cross-valley cost is higher; if the morning is tiring, stay in Val di Funes.',
        fallbackPlan: 'If cableways stop, weather worsens, or transfers are messy, return to the hotel and keep the Dolomites to one high-quality main view.',
        stationInfo: 'Seiser Alm / Alpe di Siusi official pages update cableway and mountain transport info; recheck season.',
      },
      'leg-proihof-bolzano': {
        title: 'Proihof Down To Bolzano',
        operator: 'South Tyrol Mobility bus / taxi',
        ticketRules: 'Aim for steadiness, not the lowest possible budget. With large luggage, taking a taxi downhill is reasonable.',
        fallbackPlan: 'If weather or luggage makes buses unattractive, book a car downhill and do not gamble against the Bolzano-Milan train.',
        stationInfo: 'Leave enough margin for mountain-to-plain transfers; avoid connections under 30 minutes.',
      },
      'leg-bolzano-milan': {
        title: 'Bolzano To Milan',
        ticketRules: 'After descending on Oct 3, go directly to Milan. Do not add attractions or outlets; Milan is only the return wrap-up city now.',
        fallbackPlan: 'If the mountain transfer is slow, move to the next high-speed train and go directly to the hotel in Milan.',
        stationInfo: 'After arriving at Milano Centrale, use M2 or taxi to Palazzo Loreto; the Oct 4 airport line still connects from Centrale.',
      },
      'leg-milan-airport': {
        title: 'Palazzo Loreto To Malpensa',
        operator: 'M2 / Taxi + Malpensa Express',
        ticketRules: 'Planned backward from the Oct 4, 2026 12:15 flight. Go from Palazzo Loreto to Milano Centrale, then take Malpensa Express; final airport-line timing depends on the booked timetable.',
        fallbackPlan: 'If M2, taxi, or airport rail has any issue, take a taxi / ride-hailing car to MXP. Do not gamble on departure day.',
        stationInfo: 'The hotel is not beside Centrale, so allow at least 20-30 minutes to Centrale. If doing tax refund, leave another 30 minutes earlier.',
      },
    },
    ticketAlerts: [
      {
        title: 'Hotels Are Locked; Tickets Come Next',
        body: 'Main stays are locked: Sep 22-25 Rome B&B, Sep 25-26 FLOREST Guest House, Sep 26-28 Villa Agape, Sep 28-30 Ruby, Sep 30-Oct 3 Proihof, Oct 3-4 Palazzo Loreto.',
      },
      {
        title: 'Start Watching Dolomites Cableway Season Around June',
        body: 'Seceda and Alpe di Siusi cableway seasons need confirmation on the 2026 official pages. Do not reuse old guide dates blindly.',
      },
      {
        title: 'In July, Lock Three Types Of Hard Nodes',
        body: 'Colosseum, Vatican Museums, Uffizi, Brunelleschi Pass, plus key trains Roma Termini → Firenze SMN, Firenze → Bolzano, and Bolzano → Milano should ideally be booked around July 2026.',
      },
      {
        title: 'Do Not Refill The Extra Rome Day',
        body: 'The southern coast detour was removed to reduce luggage moves, ferry pressure, and north-south backtracking. Keep only Vatican as the hard Sep 24 reservation and walk the old town by energy.',
      },
      {
        title: 'Recheck 7 Days And 48 Hours Before Departure',
        body: 'Recheck ticket times, passport names, hotel emails, rail strikes, Dolomites cableway operations, and MXP airport rail. Put same-day QR codes in one phone album.',
      },
    ],
    transportRules: [
      {
        title: 'For Rail Strikes, Check Guaranteed Trains First',
        body: 'Trenitalia explains that strike days retain guaranteed services. Check the official “in case of strike” page before deciding whether to change trains or compress the day.',
      },
      {
        title: 'One More Day In Rome Reduces Switching',
        body: 'Staying in Rome on Sep 24 avoids one hotel move and one high-risk transport day versus going south and back north. The saved energy directly helps Sep 26 Villa Agape and the Sep 27 shoot.',
      },
      {
        title: 'Do Not Drive Into Historic Centers',
        body: 'ZTL fines are easy to trigger in Rome and Florence. Even by taxi, aim for legal hotel access or a main-road drop-off.',
      },
      {
        title: 'Florence Stays Are FLOREST + Villa Agape + Ruby',
        body: 'Sep 25-26 FLOREST handles the transition night, Sep 26-28 Villa Agape supports wedding photos and the hillside stay, and Sep 28-30 Ruby returns to Santa Maria Novella for city time and the Sep 30 train.',
      },
      {
        title: 'Do Not Force The Whole Walk Between Vatican And Old Town',
        body: 'The Vatican Museums are leg-heavy. For Piazza Navona / Pantheon or Trastevere in the afternoon, choose taxi or bus based on energy rather than route purity.',
      },
      {
        title: 'This Dolomites Version Works Without A Car',
        body: 'Proihof is in Val di Funes, not central Ortisei. No-car still works, but Seceda / Alpe di Siusi needs pre-arranged transfers. In mediocre weather, prioritize local Odle / Geisler views.',
      },
    ],
    transportResources: {
      'Trenitalia 罢工页': {
        title: 'Trenitalia Strike Page',
        description: 'Check official guaranteed trains, temporary notices, and refund guidance.',
      },
      'Italo Support': {
        description: 'Check ticket changes, self-service handling, and support contact points.',
      },
      ViaggiaTreno: {
        description: 'Track Trenitalia train status and delays in real time.',
      },
      'Vatican Museums Tickets': {
        description: 'Check Vatican Museums official tickets, open days, and entry slots.',
      },
      'Villa Agape Services': {
        description: 'Review the hotel free shuttle, NCC, and car rental service notes.',
      },
      'Uffizi Tickets': {
        description: 'Check Uffizi official tickets, ticket types, and purchase entry.',
      },
      'South Tyrol Mobility': {
        description: 'Official journey planning and bus timetables for Bolzano, Val di Funes, and Val Gardena.',
      },
      Seceda: {
        description: 'Check Seceda official cableway and seasonal operation information.',
      },
      'Seiser Alm / Alpe di Siusi': {
        description: 'Check Alpe di Siusi official cableway and high-mountain operations.',
      },
      'Malpensa Airport By Train': {
        description: 'Official MXP information for the Milano Centrale airport rail connection.',
      },
      'ENAC Passengers': {
        description: 'Italian civil aviation passenger rights, delay/cancellation, and strike information.',
      },
    },
  },
}

function getMessage(path) {
  const table = uiMessages[locale.value] || uiMessages.zh
  return path.split('.').reduce((current, part) => current?.[part], table) || path
}

function getBrowserLocale() {
  if (typeof navigator === 'undefined') return 'zh'
  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language]
  const primary = browserLanguages.find(Boolean)?.toLowerCase() || ''
  return primary.startsWith('zh') ? 'zh' : 'en'
}

function getInitialLocale() {
  if (typeof window === 'undefined') return 'zh'
  const savedLocale = window.localStorage?.getItem(LOCALE_STORAGE_KEY)
  if (supportedLocales.includes(savedLocale)) return savedLocale
  return getBrowserLocale()
}

const locale = ref(getInitialLocale())
const trip = computed(() => buildLocalizedTrip(sourceTrip, locale.value))

function setLocale(nextLocale) {
  if (supportedLocales.includes(nextLocale)) {
    locale.value = nextLocale
  }
}

function translateCity(city, targetLocale) {
  if (targetLocale === 'zh') return city
  return cityTranslations[targetLocale]?.[city] || city
}

function formatDayLabel(day, targetLocale) {
  if (targetLocale === 'zh') return day.label
  const date = new Date(`${day.date}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

function mergeNestedCards(sourceCards = [], translatedCards = []) {
  return sourceCards.map((card, index) => ({ ...card, ...(translatedCards[index] || {}) }))
}

function mergeRecord(source, translated = {}, targetLocale) {
  const localized = { ...source, ...translated }
  if (source.city) localized.city = translated.city || translateCity(source.city, targetLocale)
  if (source.planningCards) localized.planningCards = mergeNestedCards(source.planningCards, translated.planningCards)
  return localized
}

function buildLocalizedTrip(originalTrip, targetLocale) {
  if (targetLocale === 'zh') return originalTrip
  const translated = dataTranslations[targetLocale] || {}
  return {
    ...originalTrip,
    tripMeta: { ...originalTrip.tripMeta, ...(translated.tripMeta || {}) },
    days: originalTrip.days.map(day => {
      const dayText = translated.days?.[day.id] || {}
      return {
        ...mergeRecord(day, dayText, targetLocale),
        label: dayText.label || formatDayLabel(day, targetLocale),
      }
    }),
    places: originalTrip.places.map(place => mergeRecord(place, translated.places?.[place.id], targetLocale)),
    tickets: originalTrip.tickets.map(ticket => mergeRecord(ticket, translated.tickets?.[ticket.id], targetLocale)),
    transportLegs: originalTrip.transportLegs.map(leg => mergeRecord(leg, translated.transportLegs?.[leg.id], targetLocale)),
    ticketAlerts: originalTrip.ticketAlerts.map((alert, index) => ({ ...alert, ...(translated.ticketAlerts?.[index] || {}) })),
    transportRules: originalTrip.transportRules.map((rule, index) => ({ ...rule, ...(translated.transportRules?.[index] || {}) })),
    transportResources: originalTrip.transportResources.map(resource => ({
      ...resource,
      ...(translated.transportResources?.[resource.title] || {}),
    })),
  }
}

// --- Lookup Maps ---
const dayMap = computed(() => new Map(trip.value.days.map(d => [d.id, d])))
const placeMap = computed(() => new Map(trip.value.places.map(p => [p.id, p])))
const ticketMap = computed(() => new Map(trip.value.tickets.map(t => [t.id, t])))
const transportMap = computed(() => new Map(trip.value.transportLegs.map(l => [l.id, l])))

// --- State ---
const tabs = computed(() => [
  { id: 'today', label: getMessage('tabs.today'), caption: getMessage('tabs.todayCaption') },
  { id: 'map', label: getMessage('tabs.map'), caption: getMessage('tabs.mapCaption') },
  { id: 'tickets', label: getMessage('tabs.tickets'), caption: getMessage('tabs.ticketsCaption') },
  { id: 'transport', label: getMessage('tabs.transport'), caption: getMessage('tabs.transportCaption') },
  { id: 'trip', label: getMessage('tabs.trip'), caption: getMessage('tabs.tripCaption') }
])
const activeTab = ref('today')
const selectedDayId = ref(sourceTrip.tripMeta.defaultDayId)
const mapScope = ref('today')
const mapCity = ref(translateCity(sourceTrip.days.find(d => d.id === sourceTrip.tripMeta.defaultDayId)?.city || '', locale.value))
const activePlaceId = ref(null)
const navMode = ref('transit')

// --- AMAP State ---
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || ''
const mapContainer = ref(null)
let amapInstance = null
let mapMarkers = []
let mapPolylineObj = null
let activeInfoWindow = null
const mapReady = ref(false)
const mapLoading = ref(false)
const mapLoadError = ref(false)
let scriptLoaded = false

// --- Computed ---
const selectedDay = computed(() => dayMap.value.get(selectedDayId.value) || trip.value.days[0])

const cityOptions = computed(() => [...new Set(trip.value.days.map(d => d.city))])

const selectedHotel = computed(() => {
  if (!selectedDay.value?.hotelPlaceId) return null
  return placeMap.value.get(selectedDay.value.hotelPlaceId) || null
})

const selectedDayTickets = computed(() => {
  return (selectedDay.value?.ticketIds || [])
    .map(id => ticketMap.value.get(id))
    .filter(Boolean)
    .sort((a, b) => (a.timeSort || '').localeCompare(b.timeSort || ''))
})

const selectedDayLegs = computed(() => {
  return (selectedDay.value?.transportIds || [])
    .map(id => transportMap.value.get(id))
    .filter(Boolean)
    .sort((a, b) => (a.departureTime || '').localeCompare(b.departureTime || ''))
})

const nextTicket = computed(() => selectedDayTickets.value[0] || null)
const nextTransport = computed(() => selectedDayLegs.value[0] || null)

const quickCards = computed(() => {
  const cards = []
  const hotel = selectedHotel.value
  if (hotel) {
    cards.push({
      title: getMessage('quickCards.hotel'), headline: hotel.name,
      meta: hotel.address, text: hotel.note || hotel.contact || '',
      placeId: hotel.id
    })
  }
  const transport = nextTransport.value
  if (transport) {
    cards.push({
      title: getMessage('quickCards.nextRide'), headline: transport.title,
      meta: `${transport.departureTime} → ${transport.arrivalTime} · ${transport.operator}`,
      text: transport.serviceNo, placeId: transport.toPlaceId
    })
  }
  const ticket = nextTicket.value
  if (ticket) {
    cards.push({
      title: getMessage('quickCards.nextTicket'), headline: ticket.title,
      meta: `${ticket.time} · ${ticket.orderRef || ''}`,
      text: ticket.notes?.[0] || '', placeId: ticket.placeId || ''
    })
  }
  if (selectedDay.value?.topReminder) {
    cards.push({
      title: getMessage('quickCards.reminder'), headline: getMessage('quickCards.reminderHeadline'),
      meta: selectedDay.value.topReminder, text: '', placeId: ''
    })
  }
  return cards
})

const selectedDayPlanningCards = computed(() => selectedDay.value?.planningCards || [])

const timelineEntries = computed(() => {
  if (!selectedDay.value?.timeline) return []
  return selectedDay.value.timeline.map(item => {
    let entry = { id: item.refId, time: '', title: '', subtitle: '', note: '', tags: [], placeId: '', navigationPlaceId: '', kind: item.type }
    if (item.type === 'hotel') {
      const p = placeMap.value.get(item.refId)
      if (p) { entry = { ...entry, time: p.timeSort, title: p.name, subtitle: p.address, note: p.note, tags: p.riskTags || [], placeId: p.id, navigationPlaceId: p.id } }
    } else if (item.type === 'place') {
      const p = placeMap.value.get(item.refId)
      if (p) { entry = { ...entry, time: p.timeSort, title: p.name, subtitle: typeLabel(p.type), note: p.note, tags: p.riskTags || [], placeId: p.id, navigationPlaceId: p.id } }
    } else if (item.type === 'ticket') {
      const t = ticketMap.value.get(item.refId)
      if (t) {
        entry = { ...entry, time: t.time, title: t.title, subtitle: `${ticketTypeLabel(t.type)} · ${t.operator || ''}`, note: t.notes?.join(locale.value === 'zh' ? '；' : '; ') || '', tags: t.warnings || [], placeId: t.placeId || '', navigationPlaceId: t.placeId || '' }
      }
    } else if (item.type === 'transport') {
      const leg = transportMap.value.get(item.refId)
      if (leg) {
        entry = { ...entry, time: leg.departureTime, title: leg.title, subtitle: `${leg.operator} · ${leg.serviceNo}`, note: leg.ticketRules || '', tags: [], placeId: leg.toPlaceId, navigationPlaceId: leg.toPlaceId }
      }
    }
    return entry
  })
})

const allTickets = computed(() => {
  return [...trip.value.tickets].sort((a, b) => `${a.date}${a.timeSort}`.localeCompare(`${b.date}${b.timeSort}`))
})

const groupedTripDays = computed(() => {
  const groups = []
  let currentCity = null
  for (const day of trip.value.days) {
    const hotel = day.hotelPlaceId ? placeMap.value.get(day.hotelPlaceId) : null
    const firstLeg = day.transportIds?.[0] ? transportMap.value.get(day.transportIds[0]) : null
    const firstTicket = day.ticketIds?.[0] ? ticketMap.value.get(day.ticketIds[0]) : null
    if (day.city !== currentCity) {
      currentCity = day.city
      groups.push({ city: day.city, startingLabel: day.label, days: [] })
    }
    groups[groups.length - 1].days.push({
      ...day,
      hotelName: hotel?.name || '',
      keyTicket: firstTicket ? `${firstTicket.time} ${firstTicket.title}` : '',
      keyTransport: firstLeg ? `${firstLeg.departureTime} ${firstLeg.title}` : '',
      isCitySwitch: day.routePlaceIds?.some(pid => {
        const p = placeMap.value.get(pid)
        return p?.type === 'airport' || p?.type === 'station'
      }),
      isHotelSwitch: !!day.hotelPlaceId
    })
  }
  return groups
})

const mapPlaces = computed(() => {
  if (mapScope.value === 'today' && selectedDay.value) {
    return (selectedDay.value.routePlaceIds || []).map(id => placeMap.value.get(id)).filter(Boolean)
  }
  if (mapScope.value === 'city') {
    return trip.value.places.filter(p => p.city === mapCity.value)
  }
  return trip.value.places
})

const mapNodes = computed(() => buildMapNodes(mapPlaces.value))
const activeMapPlace = computed(() => {
  if (activePlaceId.value) return placeMap.value.get(activePlaceId.value)
  return mapPlaces.value[0] || null
})
const mapLabel = computed(() => {
  const c = mapCity.value || selectedDay.value?.city || ''
  if (mapScope.value === 'today') return `${c} · ${getMessage('map.todayLabel')}`
  if (mapScope.value === 'city') return `${c} · ${getMessage('map.cityOverview')}`
  return `${getMessage('map.allLabel')} · ${mapPlaces.value.length} ${getMessage('map.placesUnit')}`
})

// --- Watchers ---
watchEffect(() => { document.title = trip.value.tripMeta.title })

watch(locale, () => {
  if (typeof window !== 'undefined') {
    window.localStorage?.setItem(LOCALE_STORAGE_KEY, locale.value)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale.value === 'zh' ? 'zh-CN' : 'en'
  }
  mapCity.value = selectedDay.value?.city || cityOptions.value[0] || ''
  if (mapReady.value) initMapMarkers()
}, { immediate: true })

watch([selectedDay, mapPlaces], () => {
  if (mapScope.value === 'today' && selectedDay.value) {
    mapCity.value = selectedDay.value.city
  }
  if (!mapPlaces.value.find(p => p.id === activePlaceId.value)) {
    activePlaceId.value = mapPlaces.value[0]?.id || null
  }
  if (mapReady.value) {
    initMapMarkers()
  }
})

// --- Methods ---
function switchToDay(dayId) { selectedDayId.value = dayId }

function setMapView(scope, city) {
  mapScope.value = scope
  if (city) mapCity.value = city
  if (mapReady.value) initMapMarkers()
}

function focusPlaceOnMap(placeId) {
  const place = placeMap.value.get(placeId)
  if (!place) return
  const owningDay = trip.value.days.find(d => d.routePlaceIds?.includes(placeId))
  if (owningDay) selectedDayId.value = owningDay.id
  activeTab.value = 'map'
  activePlaceId.value = placeId
  mapScope.value = 'today'
  if (mapReady.value) {
    setTimeout(() => {
      focusMarker(placeId)
    }, 200)
  }
}

function typeLabel(type) {
  return getMessage(`types.${type}`) || type
}

function ticketTypeLabel(type) {
  return getMessage(`ticketTypes.${type}`) || type
}

function getPlace(placeId) {
  return placeMap.value.get(placeId) || null
}

function buildMapNodes(places) {
  if (!places.length) return []
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
  for (const p of places) {
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
  }
  const pad = 10
  const lngRange = maxLng - minLng || 0.001
  const latRange = maxLat - minLat || 0.001
  return places.map(p => ({
    id: p.id, name: p.name, lat: p.lat, lng: p.lng, type: p.type,
    x: pad + ((p.lng - minLng) / lngRange) * (100 - 2 * pad),
    y: 100 - (pad + ((p.lat - minLat) / latRange) * (100 - 2 * pad))
  }))
}

function googleMapsUrl(place) {
  const modes = { walk: 'walking', transit: 'transit', drive: 'driving' }
  const mode = modes[navMode.value] || 'transit'
  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=${mode}`
}

function appleMapsUrl(place) {
  const modes = { walk: 'w', transit: 'r', drive: 'd' }
  return `https://maps.apple.com/?daddr=${place.lat},${place.lng}&dirflg=${modes[navMode.value] || 'r'}`
}

// --- AMAP Integration ---
function loadAmapScript() {
  return new Promise((resolve, reject) => {
    if (scriptLoaded) { resolve(); return }
    if (!AMAP_KEY) { reject(new Error('No AMAP key')); return }
    const existing = document.querySelector('script[src*="webapi.amap.com"]')
    if (existing) {
      if (window['AMap']) { scriptLoaded = true; resolve(); return }
    }
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`
    script.onload = () => { scriptLoaded = true; resolve() }
    script.onerror = () => reject(new Error('AMAP script load failed'))
    document.head.appendChild(script)
  })
}

async function initAMap() {
  if (!mapContainer.value || mapReady.value) return
  mapLoading.value = true
  mapLoadError.value = false
  try {
    await loadAmapScript()
    if (!window['AMap']) throw new Error('AMAP not available')
    amapInstance = new window['AMap'].Map(mapContainer.value, {
      zoom: 13,
      center: [12.4964, 41.9028],
      resizeEnable: true
    })
    mapReady.value = true
    initMapMarkers()
  } catch (e) {
    mapLoadError.value = true
    console.error('AMAP init error:', e)
  } finally {
    mapLoading.value = false
  }
}

function initMapMarkers() {
  if (!amapInstance || !mapReady.value) return
  amapInstance.clearMap()
  mapMarkers = []
  if (activeInfoWindow) { activeInfoWindow.close(); activeInfoWindow = null }

  const places = mapPlaces.value
  if (!places.length) return

  const center = [places[0].lng, places[0].lat]
  amapInstance.setCenter(center)
  amapInstance.setZoom(13)

  places.forEach((place, index) => {
    const markerContent = `<div class="amap-marker ${place.id === activePlaceId.value ? 'amap-marker--active' : ''}" data-place-id="${place.id}">
      <span class="amap-marker-num">${index + 1}</span>
    </div>`
    const marker = new window['AMap'].Marker({
      position: [place.lng, place.lat],
      content: markerContent,
      offset: new window['AMap'].Pixel(-15, -30)
    })
    marker.extData = { place, index: index + 1 }
    marker.on('click', () => {
      activePlaceId.value = place.id
      showInfoWindow(place)
      initMapMarkers()
    })
    marker.setMap(amapInstance)
    mapMarkers.push(marker)
  })

  // Draw polyline
  if (places.length > 1) {
    const path = places.map(p => new window['AMap'].LngLat(p.lng, p.lat))
    mapPolylineObj = new window['AMap'].Polyline({
      path,
      strokeColor: '#c2594a',
      strokeWeight: 3,
      strokeOpacity: 0.8,
      lineJoin: 'round',
      lineCap: 'round'
    })
    mapPolylineObj.setMap(amapInstance)
  }

  amapInstance.setFitView()
}

function showInfoWindow(place) {
  if (!amapInstance || !window['AMap']) return
  if (activeInfoWindow) activeInfoWindow.close()
  const content = `<div class="amap-info-content">
    <div class="amap-info-label">${typeLabel(place.type)}</div>
    <h4 class="amap-info-title">${place.name}</h4>
    ${place.plannedTime ? `<div class="amap-info-time">${getMessage('map.plannedTime')} ${place.plannedTime}</div>` : ''}
    <div class="amap-info-addr">${place.address}</div>
    ${place.note ? `<div class="amap-info-note">${place.note}</div>` : ''}
    ${place.officialLink ? `<a href="${place.officialLink}" target="_blank" rel="noopener" class="amap-info-link">${getMessage('actions.officialLink')}</a>` : ''}
  </div>`
  activeInfoWindow = new window['AMap'].InfoWindow({
    content,
    offset: new window['AMap'].Pixel(0, -30)
  })
  const marker = mapMarkers.find(m => m.extData?.place.id === place.id)
  if (marker) {
    activeInfoWindow.open(amapInstance, marker.getPosition())
  }
}

function focusMarker(placeId) {
  const marker = mapMarkers.find(m => m.extData?.place.id === placeId)
  if (marker) {
    activePlaceId.value = placeId
    const place = marker.extData.place
    amapInstance.setCenter([place.lng, place.lat], true)
    showInfoWindow(place)
    initMapMarkers()
  }
}

// --- Lifecycle ---
onMounted(() => {
  if (activeTab.value === 'map') {
    initAMap()
  }
})

watch(activeTab, (tab) => {
  if (tab === 'map' && !mapReady.value) {
    setTimeout(() => initAMap(), 100)
  } else if (tab === 'map' && mapReady.value) {
    setTimeout(() => initMapMarkers(), 100)
  }
})
</script>

<template>
  <main class="companion-page">
    <div class="companion-layout">
      <section class="app-card">
        <!-- Header -->
        <header class="app-header">
          <div class="app-header-left">
            <span class="app-city">{{ selectedDay.city }}</span>
            <span class="app-title">{{ trip.tripMeta.title }}</span>
            <span class="app-subtitle">{{ selectedDay.label }} · {{ selectedDay.title }}</span>
          </div>
          <div class="header-actions">
            <div class="language-switcher" role="group" :aria-label="getMessage('languageLabel')">
              <button type="button" class="language-chip" :class="{ 'language-chip--active': locale === 'zh' }" @click="setLocale('zh')">
                {{ getMessage('zh') }}
              </button>
              <button type="button" class="language-chip" :class="{ 'language-chip--active': locale === 'en' }" @click="setLocale('en')">
                {{ getMessage('en') }}
              </button>
            </div>
            <a v-if="selectedDay.weatherUrl" :href="selectedDay.weatherUrl" target="_blank" rel="noopener" class="weather-link">
              {{ selectedDay.weatherLabel }}
            </a>
          </div>
        </header>

        <!-- Day Switcher -->
        <div class="day-switcher">
          <button v-for="day in trip.days" :key="day.id" class="day-chip" :class="{ 'day-chip--active': day.id === selectedDayId }" @click="switchToDay(day.id)">
            {{ day.label }}
          </button>
        </div>

        <!-- Alert Banner -->
        <div v-if="selectedDay.topReminder" class="alert-strip">
          <span class="alert-icon">!</span>
          <span>{{ selectedDay.topReminder }}</span>
        </div>

        <!-- Summary Grid -->
        <div class="summary-grid">
          <div v-for="(card, i) in quickCards" :key="i" class="summary-card">
            <span class="summary-label">{{ card.title }}</span>
            <span class="summary-headline">{{ card.headline }}</span>
            <span v-if="card.meta" class="summary-meta">{{ card.meta }}</span>
            <span v-if="card.text" class="summary-text">{{ card.text }}</span>
          </div>
        </div>

        <!-- ===== Today Tab ===== -->
        <section v-if="activeTab === 'today'" class="tab-panel">
          <div class="panel-heading">
            <span class="panel-meta">{{ getMessage('sections.todayRoute') }} · {{ selectedDay.label }}</span>
            <button class="text-button" @click="activeTab = 'map'">{{ getMessage('actions.switchToMap') }}</button>
          </div>
          <div v-if="selectedDayPlanningCards.length" class="planning-grid">
            <article v-for="card in selectedDayPlanningCards" :key="`${selectedDay.id}-${card.label}-${card.title}`" class="planning-card">
              <span class="planning-label">{{ card.label }}</span>
              <strong class="planning-title">{{ card.title }}</strong>
              <p class="planning-body">{{ card.body }}</p>
            </article>
          </div>
          <div class="timeline">
            <div class="timeline-rail"></div>
            <div v-for="entry in timelineEntries" :key="entry.id" class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-time">{{ entry.time }}</div>
              <div class="timeline-body">
                <span class="timeline-kind">{{ typeLabel(entry.kind) }}</span>
                <strong>{{ entry.title }}</strong>
                <span v-if="entry.subtitle" class="timeline-subtitle">{{ entry.subtitle }}</span>
                <span v-if="entry.note" class="timeline-note">{{ entry.note }}</span>
                <div v-if="entry.tags?.length" class="chip-row">
                  <span v-for="tag in entry.tags" :key="tag" class="tag-chip tag-chip--soft">{{ tag }}</span>
                </div>
                <div class="action-row">
                  <button v-if="entry.placeId" class="solid-link" @click="focusPlaceOnMap(entry.placeId)">{{ getMessage('actions.viewMap') }}</button>
                  <a v-if="entry.navigationPlaceId" :href="googleMapsUrl(getPlace(entry.navigationPlaceId) || { lat: 0, lng: 0 })" target="_blank" rel="noopener" class="ghost-link">{{ getMessage('actions.startNavigation') }}</a>
                </div>
              </div>
            </div>
            <div v-if="!timelineEntries.length" class="empty-ticket">{{ getMessage('empty.timeline') }}</div>
          </div>
        </section>

        <!-- ===== Map Tab ===== -->
        <section v-else-if="activeTab === 'map'" class="tab-panel">
          <div class="panel-heading">
            <span class="panel-meta">{{ mapLabel }}</span>
          </div>

          <!-- Filter Strip -->
          <div class="filter-strip">
            <button class="filter-chip" :class="{ 'filter-chip--active': mapScope === 'today' }" @click="setMapView('today')">{{ getMessage('map.today') }}</button>
            <button v-for="city in cityOptions" :key="city" class="filter-chip" :class="{ 'filter-chip--active': mapScope === 'city' && mapCity === city }" @click="setMapView('city', city)">{{ city }}</button>
            <button class="filter-chip" :class="{ 'filter-chip--active': mapScope === 'all' }" @click="setMapView('all')">{{ getMessage('map.all') }}</button>
          </div>

          <!-- AMAP Canvas -->
          <div class="map-layout">
            <div class="map-surface">
              <div class="map-surface-head">
                <span class="panel-heading" style="font-size:13px">{{ mapLabel }}</span>
              </div>
              <div ref="mapContainer" class="amap-canvas" :class="{ 'amap-canvas--loading': mapLoading }">
                <div v-if="mapLoading" class="amap-overlay-loading">{{ getMessage('map.loading') }}</div>
                <div v-if="mapLoadError" class="amap-overlay-error">{{ getMessage('map.loadFailed') }}</div>
                <div v-if="!mapReady && !mapLoading" class="amap-overlay-loading">{{ getMessage('map.idle') }}</div>
              </div>
              <p class="map-footnote">{{ getMessage('map.footnote') }}</p>
            </div>

            <article class="map-detail" v-if="activeMapPlace">
              <div class="map-detail-top">
                <span class="detail-kicker">{{ typeLabel(activeMapPlace.type) }} {{ activeMapPlace.plannedTime }}</span>
                <h4 class="detail-title">{{ activeMapPlace.name }}</h4>
                <address class="detail-address">{{ activeMapPlace.address }}</address>
                <p v-if="activeMapPlace.note" class="detail-note">{{ activeMapPlace.note }}</p>
              </div>
              <div class="detail-grid">
                <div v-if="activeMapPlace.navigationNote" class="detail-field"><strong>{{ getMessage('map.navigationNote') }}</strong><span>{{ activeMapPlace.navigationNote }}</span></div>
                <div v-if="activeMapPlace.contact" class="detail-field"><strong>{{ getMessage('map.contact') }}</strong><span>{{ activeMapPlace.contact }}</span></div>
                <div v-if="activeMapPlace.orderRef" class="detail-field"><strong>{{ getMessage('map.orderRef') }}</strong><span>{{ activeMapPlace.orderRef }}</span></div>
                <div v-if="activeMapPlace.officialLink" class="detail-field"><strong>{{ getMessage('actions.officialLink') }}</strong><a :href="activeMapPlace.officialLink" target="_blank" rel="noopener">{{ activeMapPlace.officialLink }}</a></div>
              </div>
              <div class="mode-row">
                <button class="mode-chip" :class="{ 'mode-chip--active': navMode === 'walk' }" @click="navMode = 'walk'">{{ getMessage('navModes.walk') }}</button>
                <button class="mode-chip" :class="{ 'mode-chip--active': navMode === 'transit' }" @click="navMode = 'transit'">{{ getMessage('navModes.transit') }}</button>
                <button class="mode-chip" :class="{ 'mode-chip--active': navMode === 'drive' }" @click="navMode = 'drive'">{{ getMessage('navModes.drive') }}</button>
              </div>
              <div class="action-row">
                <a :href="googleMapsUrl(activeMapPlace)" target="_blank" rel="noopener" class="solid-link">Google Maps</a>
                <a :href="appleMapsUrl(activeMapPlace)" target="_blank" rel="noopener" class="ghost-link">Apple Maps</a>
              </div>
            </article>
          </div>

          <!-- Place List -->
          <div class="place-list">
            <button v-for="(place, idx) in mapPlaces" :key="place.id" class="place-card" :class="{ 'place-card--active': place.id === activePlaceId }" @click="activePlaceId = place.id; focusMarker(place.id)">
              <span class="place-index">{{ idx + 1 }}</span>
              <div class="place-card-body">
                <strong>{{ place.name }}</strong>
                <span>{{ place.plannedTime || '' }} · {{ typeLabel(place.type) }}</span>
              </div>
            </button>
          </div>
        </section>

        <!-- ===== Tickets Tab ===== -->
        <section v-else-if="activeTab === 'tickets'" class="tab-panel">
          <div class="panel-heading">
            <span class="panel-meta">{{ getMessage('sections.tickets') }}</span>
          </div>

          <!-- Alerts -->
          <div class="alerts-grid">
            <div v-for="(alert, i) in trip.ticketAlerts" :key="i" class="alert-card">
              <strong>{{ alert.title }}</strong>
              <p>{{ alert.body }}</p>
            </div>
          </div>

          <!-- Today's Tickets -->
          <div class="ticket-block">
            <div class="section-heading">{{ getMessage('sections.todayTickets') }}</div>
            <div v-if="selectedDayTickets.length" class="ticket-list">
              <div v-for="ticket in selectedDayTickets" :key="ticket.id" class="ticket-card">
                <div class="ticket-top">
                  <div class="ticket-qr"><span class="ticket-qr-box">{{ ticket.qrLabel || 'QR' }}</span></div>
                  <div>
                    <strong>{{ ticket.title }}</strong>
                    <span class="subtitle-line">{{ ticket.time }} · {{ ticket.orderRef }}</span>
                  </div>
                </div>
                <div v-if="ticket.warnings?.length" class="ticket-note">
                  <div v-for="w in ticket.warnings" :key="w" class="tag-chip tag-chip--soft">{{ w }}</div>
                </div>
                <div class="action-row">
                  <button v-if="ticket.placeId" class="solid-link" @click="focusPlaceOnMap(ticket.placeId)">{{ getMessage('actions.viewMap') }}</button>
                  <a v-if="ticket.officialLink" :href="ticket.officialLink" target="_blank" rel="noopener" class="ghost-link">{{ getMessage('actions.officialEntry') }}</a>
                </div>
              </div>
            </div>
            <div v-else class="empty-ticket">{{ getMessage('empty.tickets') }}</div>
          </div>

          <!-- All Tickets -->
          <div class="ticket-block">
            <div class="section-heading">{{ getMessage('sections.allTickets') }}</div>
            <div class="ticket-list">
              <div v-for="ticket in allTickets" :key="ticket.id" class="ticket-card ticket-card--compact">
                <strong>{{ ticket.date }} {{ ticket.time }} · {{ ticket.city }}</strong>
                <span class="subtitle-line">{{ ticket.title }}</span>
                <div class="action-row">
                  <button v-if="ticket.placeId" class="solid-link" @click="focusPlaceOnMap(ticket.placeId)">{{ getMessage('actions.viewMap') }}</button>
                  <a v-if="ticket.officialLink" :href="ticket.officialLink" target="_blank" rel="noopener" class="ghost-link">{{ getMessage('actions.official') }}</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ===== Transport Tab ===== -->
        <section v-else-if="activeTab === 'transport'" class="tab-panel">
          <div class="panel-heading">
            <span class="panel-meta">{{ getMessage('sections.transport') }} · {{ selectedDay.label }}</span>
          </div>

          <!-- Transport Legs -->
          <div class="transport-list">
            <div v-for="leg in selectedDayLegs" :key="leg.id" class="transport-card">
              <div class="transport-top">
                <span class="transport-operator">{{ leg.operator }} · {{ leg.serviceNo }}</span>
                <strong>{{ leg.title }}</strong>
                <span class="transport-times">{{ leg.departureTime }} → {{ leg.arrivalTime }}</span>
              </div>
              <div class="transport-route">
                <span>{{ getPlace(leg.fromPlaceId)?.name || leg.fromPlaceId }}</span>
                <span>→</span>
                <span>{{ getPlace(leg.toPlaceId)?.name || leg.toPlaceId }}</span>
              </div>
              <div class="detail-grid">
                <div v-if="leg.ticketRules" class="detail-field"><strong>{{ getMessage('detail.ticketRules') }}</strong><span>{{ leg.ticketRules }}</span></div>
                <div v-if="leg.needsActivation" class="detail-field"><strong>{{ getMessage('detail.needsActivation') }}</strong><span>{{ getMessage('detail.activationNote') }}</span></div>
                <div v-if="leg.stationInfo" class="detail-field"><strong>{{ getMessage('detail.stationInfo') }}</strong><span>{{ leg.stationInfo }}</span></div>
                <div v-if="leg.fallbackPlan" class="detail-field"><strong>{{ getMessage('detail.fallbackPlan') }}</strong><span>{{ leg.fallbackPlan }}</span></div>
              </div>
              <div class="action-row">
                <a v-if="leg.stationMapLink" :href="leg.stationMapLink" target="_blank" rel="noopener" class="solid-link">{{ getMessage('actions.stationMap') }}</a>
                <button v-if="leg.toPlaceId" class="ghost-link" @click="focusPlaceOnMap(leg.toPlaceId)">{{ getMessage('actions.arrivalNavigation') }}</button>
                <a v-if="leg.officialLink" :href="leg.officialLink" target="_blank" rel="noopener" class="ghost-link">{{ getMessage('actions.officialEntry') }}</a>
              </div>
            </div>
            <div v-if="!selectedDayLegs.length" class="empty-ticket">{{ getMessage('empty.transport') }}</div>
          </div>

          <!-- Transport Rules -->
          <div class="rules-grid">
            <div v-for="(rule, i) in trip.transportRules" :key="i" class="rule-card">
              <strong>{{ rule.title }}</strong>
              <p>{{ rule.body }}</p>
            </div>
          </div>

          <!-- Resources -->
          <div class="resource-row">
            <a v-for="res in trip.transportResources" :key="res.title" :href="res.url" target="_blank" rel="noopener" class="resource-card">
              <strong>{{ res.title }}</strong>
              <span>{{ res.description }}</span>
            </a>
          </div>
        </section>

        <!-- ===== Trip Tab ===== -->
        <section v-else class="tab-panel">
          <div class="panel-heading">
            <span class="panel-meta">{{ getMessage('sections.tripOverview') }} · {{ trip.dateRange }}</span>
          </div>

          <!-- Jump Strip -->
          <div class="jump-strip">
            <button v-for="day in trip.days" :key="day.id" class="jump-chip" :class="{ 'jump-chip--active': day.id === selectedDayId }" @click="switchToDay(day.id)">{{ day.label }}</button>
          </div>

          <!-- City Groups -->
          <div class="trip-groups">
            <div v-for="group in groupedTripDays" :key="group.city" class="trip-group">
              <div class="trip-group-head">
                <strong>{{ group.city }}</strong>
                <span>{{ group.startingLabel }} {{ getMessage('badges.starts') }}</span>
              </div>
              <div class="trip-days">
                <div v-for="day in group.days" :key="day.id" class="trip-day-card" :class="{ 'trip-day-card--active': day.id === selectedDayId }" @click="switchToDay(day.id)">
                  <div class="trip-day-top">
                    <strong>{{ day.label }}</strong>
                    <span>{{ day.title }}</span>
                  </div>
                  <div class="chip-row">
                    <span v-if="day.isCitySwitch" class="tag-chip">{{ getMessage('badges.citySwitch') }}</span>
                    <span v-if="day.isHotelSwitch" class="tag-chip tag-chip--soft">{{ day.hotelName }}</span>
                    <span v-if="day.keyTransport" class="tag-chip tag-chip--soft">{{ day.keyTransport }}</span>
                    <span v-if="day.keyTicket" class="tag-chip tag-chip--soft">{{ day.keyTicket }}</span>
                  </div>
                  <span class="trip-day-note">{{ day.weatherLabel }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <!-- Bottom Nav -->
      <nav class="bottom-nav">
        <button v-for="tab in tabs" :key="tab.id" class="bottom-nav-item" :class="{ 'bottom-nav-item--active': activeTab === tab.id }" @click="activeTab = tab.id">
          <span class="bottom-nav-label">{{ tab.label }}</span>
          <span class="bottom-nav-caption">{{ tab.caption }}</span>
        </button>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.companion-page {
  min-height: 100vh;
  background:
    radial-gradient(110% 140% at 10% 0%, rgba(194 89 74 / 0.08) 0%, transparent 55%),
    radial-gradient(100% 120% at 90% 0%, rgba(137 105 41 / 0.10) 0%, transparent 55%),
    linear-gradient(180deg, #f9f5f0, #f4ede4 40%, #ece3d6);
  padding: 24px 16px 100px;
  font-family: "Source Han Serif SC", "Noto Serif SC", "Georgia", serif;
  color: #2c2825;
}

.companion-layout {
  max-width: 1120px;
  margin: 0 auto;
}

.app-card {
  background: #fffcf8;
  border: 1px solid rgba(194 89 74 / 0.12);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 24px rgba(44 40 37 / 0.06);
  animation: card-rise 0.4s ease-out;
}

@keyframes card-rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.app-header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 220px;
  flex: 1;
}

.app-city {
  font-size: 13px;
  color: #8b7d6b;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.app-title {
  font-size: 22px;
  font-weight: 700;
  color: #2c2825;
  line-height: 1.2;
}

.app-subtitle {
  font-size: 14px;
  color: #8b7d6b;
}

.header-actions {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.language-switcher {
  display: inline-flex;
  padding: 3px;
  border: 1px solid rgba(194 89 74 / 0.18);
  border-radius: 999px;
  background: #faf7f2;
}

.language-chip {
  min-width: 54px;
  border: none;
  border-radius: 999px;
  padding: 5px 10px;
  background: transparent;
  color: #8b7d6b;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.language-chip--active {
  background: #2e5c55;
  color: #fff;
}

.weather-link {
  font-size: 13px;
  color: #6b8f71;
  background: rgba(107 143 113 / 0.10);
  padding: 6px 12px;
  border-radius: 8px;
  text-decoration: none;
  white-space: nowrap;
}

/* Day Switcher */
.day-switcher {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 16px;
}

.day-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(194 89 74 / 0.2);
  background: transparent;
  color: #8b7d6b;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}

.day-chip--active {
  background: #c2594a;
  color: #fff;
  border-color: #c2594a;
}

/* Alert Strip */
.alert-strip {
  background: rgba(212 160 23 / 0.12);
  border-left: 3px solid #d4a017;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.alert-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #d4a017;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
}

/* Summary Grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.summary-card {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-label {
  font-size: 11px;
  text-transform: uppercase;
  color: #c2594a;
  letter-spacing: 0.06em;
  font-weight: 600;
}

.summary-headline {
  font-size: 14px;
  font-weight: 600;
}

.summary-meta {
  font-size: 12px;
  color: #8b7d6b;
}

.summary-text {
  font-size: 12px;
  color: #6b5d50;
}

/* Day Planning */
.planning-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.planning-card {
  background: linear-gradient(180deg, rgba(255 248 241 / 0.96), rgba(250 244 236 / 0.98));
  border: 1px solid rgba(194 89 74 / 0.12);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.planning-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #a06a4a;
  font-weight: 700;
}

.planning-title {
  font-size: 15px;
  line-height: 1.35;
}

.planning-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: #5d5145;
}

/* Tab Panel */
.tab-panel {
  margin-top: 8px;
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-meta {
  font-size: 13px;
  color: #8b7d6b;
}

.text-button {
  background: none;
  border: 1px solid #c2594a;
  color: #c2594a;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}

/* Timeline */
.timeline {
  position: relative;
  padding-left: 32px;
}

.timeline-rail {
  position: absolute;
  left: 11px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, #c2594a 0%, rgba(194 89 74 / 0.1) 100%);
  border-radius: 1px;
}

.timeline-item {
  position: relative;
  padding-bottom: 20px;
}

.timeline-dot {
  position: absolute;
  left: -26px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #c2594a;
  border: 2px solid #fffcf8;
  box-shadow: 0 0 0 2px rgba(194 89 74 / 0.2);
}

.timeline-time {
  font-size: 13px;
  font-weight: 700;
  color: #c2594a;
  margin-bottom: 2px;
}

.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-kind {
  font-size: 11px;
  text-transform: uppercase;
  color: #8b7d6b;
  letter-spacing: 0.04em;
}

.timeline-subtitle {
  font-size: 13px;
  color: #6b5d50;
}

.timeline-note {
  font-size: 13px;
  color: #8b7d6b;
  font-style: italic;
}

/* Chips & Tags */
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(194 89 74 / 0.1);
  color: #c2594a;
}

.tag-chip--soft {
  background: rgba(107 143 113 / 0.1);
  color: #6b8f71;
}

/* Action Row */
.action-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.solid-link {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  background: #c2594a;
  color: #fff;
  border: none;
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
}

.ghost-link {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  background: transparent;
  color: #6b8f71;
  border: 1px solid rgba(107 143 113 / 0.3);
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
}

/* Filter Strip */
.filter-strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 12px;
  padding-bottom: 4px;
}

.filter-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(194 89 74 / 0.2);
  background: transparent;
  color: #8b7d6b;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}

.filter-chip--active {
  background: #2e5c55;
  color: #fff;
  border-color: #2e5c55;
}

/* Map Layout */
.map-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .map-layout {
    grid-template-columns: 1fr;
  }
}

.map-surface {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.map-surface-head {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(194 89 74 / 0.08);
}

.amap-canvas {
  position: relative;
  width: 100%;
  height: 320px;
  background: #f5f0e8;
}

.amap-canvas :deep(.amap-marker) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #c2594a;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(194 89 74 / 0.3);
  font-family: inherit;
}

.amap-canvas :deep(.amap-marker--active) {
  background: #2e5c55;
  box-shadow: 0 0 0 4px rgba(46 92 85 / 0.2), 0 2px 8px rgba(46 92 85 / 0.3);
}

.amap-overlay-loading, .amap-overlay-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #8b7d6b;
  background: rgba(245 240 232 / 0.9);
}

.amap-overlay-error {
  color: #c2594a;
}

.amap-canvas--loading {
  opacity: 0.5;
}

.amap-info-content {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  max-width: 260px;
}

.map-footnote {
  font-size: 11px;
  color: #8b7d6b;
  padding: 6px 12px;
  margin: 0;
}

/* Map Detail */
.map-detail {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.map-detail-top {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-kicker {
  font-size: 11px;
  text-transform: uppercase;
  color: #c2594a;
  letter-spacing: 0.06em;
}

.detail-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.detail-address {
  font-size: 13px;
  color: #8b7d6b;
  font-style: normal;
}

.detail-note {
  font-size: 13px;
  color: #6b5d50;
  font-style: italic;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-field {
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-field strong {
  color: #8b7d6b;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-field a {
  color: #6b8f71;
  word-break: break-all;
}

/* Navigation Mode */
.mode-row {
  display: flex;
  gap: 6px;
}

.mode-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(107 143 113 / 0.3);
  background: transparent;
  color: #6b8f71;
  cursor: pointer;
  font-family: inherit;
}

.mode-chip--active {
  background: #6b8f71;
  color: #fff;
  border-color: #6b8f71;
}

/* Place List */
.place-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.place-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.place-card--active {
  background: rgba(194 89 74 / 0.06);
  border-color: rgba(194 89 74 / 0.2);
}

.place-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #c2594a;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.place-card-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.place-card-body span {
  font-size: 12px;
  color: #8b7d6b;
}

/* Alerts Grid */
.alerts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.alert-card {
  background: rgba(212 160 23 / 0.1);
  border-left: 3px solid #d4a017;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
}

.alert-card strong {
  display: block;
  margin-bottom: 4px;
  color: #8a6d10;
}

.alert-card p {
  margin: 0;
  color: #6b5d50;
}

/* Tickets */
.ticket-block {
  margin-bottom: 20px;
}

.ticket-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.ticket-card {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ticket-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.ticket-qr {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ticket-qr-box {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2c2825;
  color: #fff;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  font-family: monospace;
}

.ticket-card strong {
  font-size: 14px;
}

.subtitle-line {
  font-size: 12px;
  color: #8b7d6b;
  display: block;
  margin-top: 2px;
}

.ticket-note {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ticket-card--compact {
  padding: 10px 12px;
}

.empty-ticket {
  font-size: 13px;
  color: #8b7d6b;
  padding: 20px;
  text-align: center;
}

/* Transport */
.transport-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.transport-card {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.transport-operator {
  font-size: 11px;
  text-transform: uppercase;
  color: #2e5c55;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.transport-times {
  font-size: 14px;
  font-weight: 700;
  color: #c2594a;
}

.transport-route {
  font-size: 13px;
  color: #6b5d50;
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Rules */
.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.rule-card {
  background: rgba(46 92 85 / 0.06);
  border-radius: 10px;
  padding: 14px;
  font-size: 13px;
}

.rule-card strong {
  display: block;
  margin-bottom: 4px;
  color: #2e5c55;
}

.rule-card p {
  margin: 0;
  color: #6b5d50;
}

/* Resources */
.resource-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.resource-card {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
}

.resource-card strong {
  color: #c2594a;
}

.resource-card span {
  color: #8b7d6b;
}

/* Trip Tab */
.section-heading {
  font-size: 14px;
  font-weight: 600;
  color: #2c2825;
  padding: 8px 0 4px;
}

.jump-strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  margin-bottom: 16px;
  padding-bottom: 4px;
}

.jump-chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(194 89 74 / 0.2);
  background: transparent;
  color: #8b7d6b;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}

.jump-chip--active {
  background: #c2594a;
  color: #fff;
  border-color: #c2594a;
}

.trip-groups {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trip-group {
  background: #faf7f2;
  border: 1px solid rgba(194 89 74 / 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.trip-group-head {
  padding: 10px 14px;
  background: rgba(194 89 74 / 0.06);
  border-bottom: 1px solid rgba(194 89 74 / 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.trip-group-head strong {
  font-size: 15px;
  color: #2c2825;
}

.trip-group-head span {
  font-size: 12px;
  color: #8b7d6b;
}

.trip-days {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.trip-day-card {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.15s;
}

.trip-day-card:hover {
  background: rgba(194 89 74 / 0.06);
}

.trip-day-card--active {
  background: rgba(194 89 74 / 0.1);
  border-color: rgba(194 89 74 / 0.2);
}

.trip-day-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.trip-day-top strong {
  font-size: 14px;
}

.trip-day-top span {
  font-size: 13px;
  color: #8b7d6b;
}

.trip-day-note {
  font-size: 12px;
  color: #6b8f71;
  margin-top: 4px;
  display: block;
}

/* Bottom Nav */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: #fffcf8;
  border-top: 1px solid rgba(194 89 74 / 0.12);
  box-shadow: 0 -2px 12px rgba(44 40 37 / 0.06);
  z-index: 100;
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  color: #8b7d6b;
}

.bottom-nav-item--active {
  color: #c2594a;
  background: rgba(194 89 74 / 0.06);
}

.bottom-nav-label {
  font-size: 14px;
  font-weight: 700;
}

.bottom-nav-caption {
  font-size: 10px;
  opacity: 0.7;
}
</style>
