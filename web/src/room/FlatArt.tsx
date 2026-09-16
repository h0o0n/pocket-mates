import type { ReactNode } from 'react'
import { ClutterArt } from './ClutterArt'

/** All props share a 120 × 100 front-view canvas and the same outline. */
export function FlatArt({ id }: { id: string }) {
  if (id.startsWith('food-') || id.startsWith('parcel')) return <ClutterArt id={id}/>
  let art: ReactNode
  switch (id) {
    case 'furniture-bed':
    case 'furniture-sofa':
      art = <><rect x="10" y="35" width="100" height="48" rx="20" fill="#f8eedc"/><rect x="22" y="22" width="76" height="40" rx="18" fill={id === 'furniture-sofa' ? '#a8b69b' : '#fff6e6'}/><path d="M12 48 Q2 40 5 66 L8 85 Q60 95 112 85 L115 64 Q118 40 106 48 L100 70 H20Z" fill="#f8eedc"/><path d="M35 57 Q63 50 83 59 L75 93 H30Z" fill="#a9b38e"/></>
      break
    case 'furniture-bookcase':
      art = <><rect x="22" y="4" width="76" height="91" rx="5" fill="#c89c70"/><path d="M28 38H92 M28 67H92"/><path d="M35 33V13H45V33 M51 33V17H60V33 M66 33L62 13L72 11L77 33" fill="#a9b38e"/><rect x="34" y="46" width="45" height="15" rx="3" fill="#eee0ca"/><rect x="34" y="75" width="51" height="15" rx="3" fill="#e6c59d"/></>
      break
    case 'furniture-tv-unit':
      art = <><path d="M17 82V95 M103 82V95"/><rect x="6" y="28" width="108" height="59" rx="6" fill="#c89c70"/><path d="M60 34V81 M52 53V65 M68 53V65"/></>
      break
    case 'furniture-rug': case 'picnic-mat':
      art = <><ellipse cx="60" cy="62" rx="56" ry="29" fill={id === 'picnic-mat' ? '#b6bf9d' : '#f8efdd'}/>{id === 'picnic-mat' && <path d="M20 46L97 78 M37 37L108 64 M17 69L82 38 M35 85L103 50" stroke="#f8efdd"/>}</>
      break
    case 'furniture-side-table':
      art = <><path d="M30 52L24 94 M90 52L96 94"/><ellipse cx="60" cy="47" rx="50" ry="17" fill="#d9b48b"/></>
      break
    case 'furniture-wall-shelf':
      art = <><path d="M28 65V84 M92 65V84"/><rect x="5" y="48" width="110" height="14" rx="4" fill="#c89c70"/></>
      break
    case 'furniture-plant':
      art = <><path d="M60 70V20" fill="none"/><path d="M59 43Q18 43 28 17Q57 16 59 43 M62 30Q62 2 94 8Q101 28 62 30 M61 58Q66 30 97 39Q98 62 61 58" fill="#9ca77c"/><path d="M36 65H84L77 95H43Z" fill="#eee0c7"/></>
      break
    case 'tv':
      art = <><path d="M33 90L30 98 M88 90L91 98"/><rect x="8" y="12" width="104" height="80" rx="20" fill="#a2ab81"/><rect x="18" y="23" width="70" height="56" rx="13" fill="#b9d8e7"/><path d="M23 69Q40 47 54 69Q67 53 84 69" fill="#a7b48a"/><circle cx="99" cy="47" r="4"/><circle cx="99" cy="64" r="4"/></>
      break
    case 'console':
      art = <><rect x="9" y="45" width="102" height="33" rx="9" fill="#eee8dc"/><path d="M21 54H80"/><path d="M36 79Q21 56 17 83Q16 99 34 89H85Q108 103 104 81Q95 58 81 79Z" fill="#ece9df"/><path d="M29 79V89 M24 84H34"/><circle cx="88" cy="83" r="2"/></>
      break
    case 'air-conditioner':
      art = <><rect x="4" y="27" width="112" height="43" rx="10" fill="#f1eddf"/><path d="M13 55H106 M19 63H100"/><circle cx="101" cy="40" r="2" fill="#9ead83"/></>
      break
    case 'air-purifier':
      art = <><rect x="30" y="8" width="60" height="87" rx="16" fill="#eeeae1"/><path d="M40 30H80 M42 66H78 M42 74H78 M42 82H78"/><circle cx="60" cy="45" r="5" fill="#a9b38e"/></>
      break
    case 'air-fryer':
      art = <><rect x="22" y="18" width="76" height="77" rx="18" fill="#aab395"/><circle cx="60" cy="38" r="7" fill="#f7ecdb"/><path d="M29 55H91"/><rect x="55" y="60" width="10" height="20" rx="4" fill="#6d533e"/></>
      break
    case 'christmas-tree':
      art = <><path d="M55 78H65V96H55Z" fill="#c79e78"/><path d="M60 6L85 39H75L102 70H82L112 85H8L38 65H20L45 38H33Z" fill="#9ca97e"/><circle cx="53" cy="37" r="4" fill="#d6a28d"/><circle cx="72" cy="60" r="4" fill="#f6d584"/><circle cx="42" cy="75" r="4" fill="#f6d584"/></>
      break
    case 'string-lights':
      art = <><path d="M3 20Q60 70 117 20" fill="none"/>{[15,38,60,82,105].map((x,i)=><ellipse key={x} cx={x} cy={35 + (2-Math.abs(2-i))*8} rx="6" ry="9" fill="#f6d584"/>)}</>
      break
    case 'gift-boxes': case 'parcel':
      art = <><rect x="8" y="42" width="64" height="49" rx="3" fill="#d5ad7d"/><path d="M34 43V89" stroke="#f1d9ad" strokeWidth="12"/><rect x="67" y="21" width="44" height="70" rx="3" fill={id === 'parcel' ? '#c59b71' : '#aab395'}/><path d="M87 23V89" stroke="#efdbc0" strokeWidth="8"/>{id === 'gift-boxes' && <path d="M81 22Q54 0 73 5L88 20Q115 0 108 17Z" fill="#d6a28d"/>}</>
      break
    case 'picnic-basket':
      art = <><path d="M30 47Q30 6 60 6Q90 6 90 47" fill="none"/><path d="M9 40H111L101 92H20Z" fill="#d2b088"/><path d="M16 57H105 M20 74H103 M38 43V89 M60 43V89 M82 43V89" strokeWidth="2"/></>
      break
    case 'floor-lamp':
      art = <><ellipse cx="60" cy="94" rx="26" ry="3" fill="#cba67e"/><path d="M60 31V93" strokeWidth="7"/><path d="M32 5Q60 1 88 5L108 29Q60 37 12 29Z" fill="#ffe8ad"/></>
      break
    case 'camp-lantern': case 'mood-light':
      art = <><path d="M60 54V85" strokeWidth="9"/><ellipse cx="60" cy="89" rx="25" ry="6" fill="#cba67e"/>{id === 'camp-lantern' ? <><path d="M40 27V12Q60 -2 80 12V27" fill="none"/><rect x="31" y="27" width="58" height="47" rx="10" fill="#ffe8ad"/></> : <path d="M13 53Q17 4 60 7Q103 4 107 53Z" fill="#f2d3a1"/>}</>
      break
    case 'wall-clock':
      art = <><circle cx="60" cy="50" r="44" fill="#f8efdd"/><path d="M60 19V50L80 61" fill="none"/><circle cx="60" cy="50" r="3" fill="#72543c"/></>
      break
    case 'retro-radio':
      art = <><path d="M24 30L75 5"/><rect x="6" y="30" width="108" height="61" rx="9" fill="#cda77c"/><circle cx="38" cy="61" r="20" fill="#eee0c7"/><path d="M76 46H101 M76 56H101"/><circle cx="87" cy="75" r="6" fill="#a9b38e"/></>
      break
    case 'turntable':
      art = <><rect x="5" y="25" width="110" height="64" rx="6" fill="#cda77c"/><ellipse cx="48" cy="56" rx="32" ry="22" fill="#705e50"/><ellipse cx="48" cy="56" rx="9" ry="6" fill="#e7c293"/><path d="M98 37L91 64L76 70" fill="none"/></>
      break
    case 'food-cup':
      art = <><path d="M32 37H88L81 94H40Z" fill="#f7ecd9"/><rect x="27" y="28" width="66" height="12" rx="4" fill="#a9b38e"/><path d="M70 27L77 6"/><path d="M39 63H83" stroke="#d7b38a" strokeWidth="15"/></>
      break
    case 'food-pizza':
      art = <><path d="M9 49L81 27L113 53L40 76Z" fill="#eee0c7"/><path d="M9 49V72L40 92L113 70V53L40 76Z" fill="#d1a67b"/><ellipse cx="63" cy="52" rx="20" ry="11" fill="#d8a078"/></>
      break
    case 'food-bowl':
      art = <><path d="M12 43Q20 92 60 94Q100 92 108 43Z" fill="#e5c1a1"/><ellipse cx="60" cy="43" rx="48" ry="13" fill="#faf0dc"/><path d="M39 26L86 8 M51 28L96 15"/></>
      break
    default:
      art = <><rect x="9" y="35" width="102" height="53" rx="12" fill="#f3e8d4"/><path d="M17 49H103 M45 49V80"/><path d="M57 62Q70 42 91 62Q86 81 65 75Z" fill="#cfa17b"/></>
  }
  return <svg viewBox="0 0 120 100" preserveAspectRatio={id==='christmas-tree'?'xMidYMax meet':'none'} aria-hidden="true" fill="none" stroke="#705139" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">{art}</svg>
}
