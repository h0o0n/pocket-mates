/** Small hand-drawn objects with a top face, contact shadow and restrained detail. */
export function ClutterArt({ id }: { id: string }) {
  return <svg viewBox="0 0 120 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true" fill="none" stroke="#705139" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="61" cy="91" rx="49" ry="6" fill="#705139" opacity=".13" stroke="none"/>
    {id.startsWith('parcel') ? <>
      <path d="M13 35L76 23L108 40L45 55Z" fill="#dcbc8d"/>
      <path d="M13 35L45 55V91L15 72Z" fill="#b7885c"/>
      <path d="M45 55L108 40L105 77L45 91Z" fill="#cca16f"/>
      <path d="M39 30L71 49L70 62L81 59L82 46L51 28Z" fill="#edd5a7" stroke="none"/>
      <path d="M57 63L83 57L82 73L56 79Z" fill="#fff4de" strokeWidth="1"/>
      <path d="M61 67L77 63M61 71L69 69M91 69V76M95 68V75M99 67V74" strokeWidth="1.5"/>
      <path d="M20 51L25 55M19 63L28 69M49 86L59 83" opacity=".45"/>
      {id==='parcel-open' && <><path d="M13 35L4 20L65 9L76 23Z" fill="#dfbc8c"/><path d="M76 23L100 14L118 30L108 40Z" fill="#e9c99a"/><path d="M45 55L33 66L2 45L13 35Z" fill="#d7b281"/></>}
    </> : id==='food-cup' ? <>
      <path d="M35 31L42 87Q60 96 78 87L85 31Z" fill="#faf0dc"/>
      <path d="M40 51L80 51L77 74Q60 81 43 74Z" fill="#c99a71"/>
      <ellipse cx="60" cy="31" rx="29" ry="9" fill="#ede1cc"/><path d="M29 29L33 21Q60 13 87 21L91 29Q63 41 29 29Z" fill="#6b6257"/>
      <path d="M65 22L71 4L86 4" stroke="#a9977f" strokeWidth="4"/><path d="M53 61Q61 53 68 61Q63 70 55 66" fill="#f6e8cd" stroke="none"/>
    </> : id==='food-pizza' ? <>
      <path d="M9 51L79 30L111 50L40 75Z" fill="#f1dfba"/><path d="M9 51V66L40 89V75Z" fill="#c6976d"/><path d="M40 75L111 50V65L40 89Z" fill="#dec29a"/>
      <path d="M27 48L78 35L94 45L44 61Z" fill="#b45f44" stroke="none"/><path d="M51 48L67 42L80 47L63 53Z" fill="#f2d39a" stroke="none"/><path d="M54 78L89 66M17 57L31 67" stroke="#a67550"/>
    </> : id==='food-bowl' ? <>
      <path d="M18 43Q24 87 59 89Q96 89 103 43Z" fill="#514e47"/><ellipse cx="60" cy="43" rx="44" ry="16" fill="#777367"/><ellipse cx="60" cy="42" rx="36" ry="11" fill="#d9b684"/>
      <path d="M36 40Q45 33 55 42T78 41M46 46Q60 37 71 46" stroke="#f8e5b8"/><path d="M40 33L91 11M47 36L100 16" stroke="#bd946d" strokeWidth="4"/>
      <path d="M31 63Q59 80 87 64" stroke="#938675"/><path d="M89 77L113 66L117 79L95 90Z" fill="#fff0d8" strokeWidth="1.5"/>
    </> : <>
      <path d="M12 44Q12 36 23 35L94 35Q105 36 108 45L103 79Q61 99 17 79Z" fill="#514e47"/>
      <rect x="9" y="29" width="101" height="37" rx="12" fill="#b7b9a8"/><rect x="16" y="35" width="87" height="24" rx="9" fill="#e4dec5"/>
      <path d="M65 36V58M21 47H59" stroke="#aea88f"/><path d="M76 40Q85 35 94 44L89 52L74 51Z" fill="#b67c4f" stroke="none"/><path d="M28 70V78M36 72V81M90 69V78" stroke="#888172"/>
      <path d="M39 30L43 64L54 65L50 30" fill="#fff2d4" strokeWidth="1"/>
    </>}
  </svg>
}
