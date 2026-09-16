import { useId, type CSSProperties } from 'react'
import { FlatArt } from './FlatArt'
import { DogReaction } from './DogReaction'
import { placements, type Decoration, type SkinId, type TimePhase } from './catalog'
import './flat-room.css'

type Props = {
  skin: SkinId; phase: Exclude<TimePhase,'auto'>; selectedPhase:TimePhase; onPhase:(phase:TimePhase)=>void
  items:Decoration[]; food:string[]; parcels:number; remaining:number; foodLevel:number; shoppingCount?:number
  bubble:boolean; line:string; onTalk:()=>void; onClose:()=>void; miniature?:boolean
}
const box = (x:number,y:number,w:number,h:number):CSSProperties => ({left:`${x/10}%`,top:`${y/6.5}%`,width:`${w/10}%`,height:`${h/6.5}%`})
const foodSpots = [[22,543,94,79,-7],[91,527,87,74,6],[142,553,100,84,-4],[65,576,90,65,3]]
const parcelSpots = [[785,559,105,78,-5],[858,558,92,79,5],[800,517,95,79,-2],[848,500,101,84,4]]
export function FlatRoom({skin,phase,selectedPhase,onPhase,items,food,parcels,remaining,foodLevel,shoppingCount=0,bubble,line,onTalk,onClose,miniature=false}:Props) {
  const clip = useId()
  const worn = remaining <= .5, poor = remaining <= .25, broke = remaining <= .1
  const sorted = [...items].sort((a,b)=>(a.slot==='rug'?-1:b.slot==='rug'?1:placements[a.slot].y-placements[b.slot].y))
  return <section className={`flat-room palette-${skin} phase-${phase}${miniature?' miniature':''}`} aria-label={`${skin === 'attic' ? '바닐라' : skin === 'cloud' ? '구름' : '말차'} 방, ${phase === 'day' ? '낮' : phase === 'sunset' ? '노을' : '밤'}`}>
    <svg className="flat-shell" viewBox="0 0 1000 650" aria-hidden="true">
      <defs><clipPath id={clip}><rect x="291" y="91" width="368" height="226" rx="23"/></clipPath></defs>
      <path d="M0 0H1000V650H0Z" className="flat-wall"/>
      <path d="M0 452H1000V650H0Z" className="flat-floor"/>
      <path d="M0 451H1000" stroke="#987555" strokeWidth="4"/>
      <rect x="277" y="77" width="396" height="254" rx="34" fill="#d7b38a" stroke="#705139" strokeWidth="5"/>
      <g clipPath={`url(#${clip})`}>
        <rect x="291" y="91" width="368" height="226" className="flat-sky"/>
        <circle className="flat-sun" cx="565" cy={phase==='sunset'?263:148} r="26" fill="#ffdf8b"/>
        <path className="flat-moon" d="M561 114A29 29 0 1 0 593 150A25 25 0 0 1 561 114" fill="#fff2c1"/>
        <g className="flat-stars" fill="#fff3ce">{[[320,129],[420,154],[511,119],[629,204],[396,241],[526,218]].map(([x,y])=><circle key={x} cx={x} cy={y} r="2"/>)}</g>
        <g className="flat-clouds" fill="#fff8e9"><path d="M315 183Q305 163 326 159Q327 129 353 138Q370 137 374 158Q397 154 400 177Q400 185 384 185Z"/><path d="M520 237Q514 220 532 216Q536 194 557 206Q575 199 581 218Q599 217 601 233Z"/></g>
        <path d="M280 320V290Q296 257 319 282Q349 256 371 297Q397 279 420 320 M500 320Q526 287 543 307Q566 270 589 293Q635 250 671 290V320" className="flat-trees"/>
      </g>
      <rect x="291" y="91" width="368" height="226" rx="23" stroke="#705139" strokeWidth="4" fill="none"/>
      <path d="M475 92V317" stroke="#705139" strokeWidth="10"/>
      {worn && <g className="wear-marks" stroke="#c1ab8b" strokeWidth="3" fill="none"><path d="M45 342l16 3m-8 8l20 3 M898 253l23 4m-18 9l12 2"/></g>}
      {poor && <g stroke="#b29c7e" strokeWidth="2"><path d="M160 288h34v35l-34-35" fill="#e5d3b7"/><path d="M175 292l16 18" fill="none"/><rect x="79" y="400" width="37" height="12" rx="2" fill="#d9c49c" transform="rotate(-15 79 400)"/></g>}
      {broke && <g fill="#dac39a" stroke="#ab9071" strokeWidth="2"><path d="M815 273l44 15-5 13-44-15Z M825 303l22-42 12 6-22 42Z"/><path d="M193 591l33-8m-22 19l24-7" fill="none"/></g>}
    </svg>
    {sorted.map(item=>{ const p=item.id==='christmas-tree' ? {x:681,y:367,w:150,h:170} : item.id==='furniture-bookcase' ? {x:813,y:294,w:163,h:270} : item.id==='furniture-plant' ? {x:666,y:473,w:59,h:78} : placements[item.slot]; return <div className={`flat-prop prop-${item.id}`} key={item.id} style={box(p.x,p.y,p.w,p.h)}><FlatArt id={item.id}/>{poor && item.slot==='seat' && <span className="sofa-patch">×</span>}</div> })}
    {phase!=='day' && items.some(item=>['floor-lamp','mood-light','camp-lantern','string-lights'].includes(item.id)) && <div className="flat-light-glow"/>}
    <div className={`mochi-dog food-level-${foodLevel}`} style={box(370,421,260,180)}>
      {!miniature && bubble && <button className="mochi-speech" onClick={onClose}>{line}<small>눌러서 닫기</small></button>}
      <button className="mochi-touch" onClick={onTalk} aria-label="강아지와 대화하기" disabled={miniature}>
        <span className="mochi-breathe"><img src="/assets/flat/mochi-dog.png" alt={`${foodLevel>0?'통통한 ':''}찹쌀떡 강아지${shoppingCount>=3?', 선글라스 착용':''}${remaining<=.5?', 영수증 확인 중':''}`}/><span className="mochi-eyelid left"/><span className="mochi-eyelid right"/><DogReaction foodLevel={foodLevel} remaining={remaining} shoppingCount={shoppingCount}/></span>
      </button>
    </div>
    {food.slice(0,4).map((id,i)=>{const [x,y,w,h,angle]=foodSpots[i]; return <div className="flat-clutter" key={`${i}-${id}`} style={{...box(x,y,w,h),rotate:`${angle}deg`}}><FlatArt id={id}/></div>})}
    {Array.from({length:Math.min(4,parcels)},(_,i)=>{const [x,y,w,h,angle]=parcelSpots[i]; return <div className="flat-clutter" key={`parcel-${i}`} style={{...box(x,y,w,h),rotate:`${angle}deg`}}><FlatArt id={i===3?'parcel-open':'parcel'}/></div>})}
    {!miniature && <><div className="flat-time" aria-label="방 시간대">{(['auto','day','sunset','night'] as const).map(value=><button key={value} aria-pressed={selectedPhase===value} onClick={()=>onPhase(value)}>{ {auto:'자동',day:'낮',sunset:'노을',night:'밤'}[value]}</button>)}</div><span className="flat-room-note">{broke?'테이프로 버티는 중':poor?'조금 낡아도 우리 집':worn?'생활감이 생겼어요':'오늘도 느긋하게'} · 강아지를 눌러보세요</span></>}
  </section>
}
