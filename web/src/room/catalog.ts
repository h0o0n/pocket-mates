export type SkinId = 'attic' | 'cloud' | 'game'
export type TimePhase = 'auto' | 'day' | 'sunset' | 'night'
export type DecorationZone = 'media' | 'wall' | 'table' | 'floor' | 'right'
export const decorationSlots = {
 seat: '왼쪽 휴식 자리', cabinet: '오른쪽 수납장', rug: '가운데 러그', table: '작은 협탁',
 shelf: '왼쪽 벽 선반', plant: '창가 화분', screen: '수납장 위', console: '수납장 아래',
 wall: '왼쪽 위 벽', appliance: '오른쪽 바닥', lamp: '창문 오른쪽', basket: '소파 옆 바구니',
 tabletop: '협탁 위', clock: '오른쪽 벽',
} as const
export type DecorationSlot = keyof typeof decorationSlots
export type Decoration = {id:string; name:string; description:string; price:number; slot:DecorationSlot}
export const decorations: Decoration[] = [
  { id: 'furniture-bed', name: '포근한 침대', description: '방의 절반을 차지하는 행복', price: 0, slot: 'seat' },
  { id: 'furniture-bookcase', name: '원목 책장', description: '읽은 책보다 장식이 더 많음', price: 0, slot: 'cabinet' },
  { id: 'furniture-rug', name: '타원 러그', description: '강아지가 제일 먼저 차지함', price: 0, slot: 'rug' },
  { id: 'furniture-sofa', name: '남색 소파', description: '게임 켜고 그대로 잠드는 자리', price: 0, slot: 'seat' },
  { id: 'furniture-tv-unit', name: '원목 TV장', description: '게임기들이 모이는 본진', price: 0, slot: 'cabinet' },
  { id: 'furniture-side-table', name: '둥근 협탁', description: '컵 하나 올리면 꽉 참', price: 0, slot: 'table' },
  { id: 'furniture-wall-shelf', name: '벽 선반', description: '작은 소품을 위한 무대', price: 0, slot: 'shelf' },
  { id: 'furniture-plant', name: '큰 화분', description: '물 주는 날은 늘 내일', price: 0, slot: 'plant' },
  { id: 'tv', name: '작은 TV', description: '주말을 순식간에 없애는 화면', price: 180, slot: 'screen' },
  { id: 'console', name: '게임기', description: '할 게임은 많은데 시간은 없음', price: 220, slot: 'console' },
  { id: 'air-conditioner', name: '에어컨', description: '강아지 털도 여름은 덥습니다', price: 260, slot: 'wall' },
  { id: 'air-purifier', name: '공기청정기', description: '털은 못 잡아도 기분은 상쾌', price: 160, slot: 'appliance' },
  { id: 'air-fryer', name: '에어프라이어', description: '냉동 감자의 최종 목적지', price: 140, slot: 'appliance' },
  { id: 'christmas-tree', name: '미니 트리', description: '방 한쪽만 갑자기 연말', price: 200, slot: 'lamp' },
  { id: 'string-lights', name: '전구 가랜드', description: '전기세보다 분위기가 먼저', price: 110, slot: 'wall' },
  { id: 'gift-boxes', name: '선물상자', description: '내용물은 아직 비밀', price: 90, slot: 'basket' },
  { id: 'picnic-basket', name: '피크닉 바구니', description: '날씨 좋은 날 들고 나가기', price: 130, slot: 'basket' },
  { id: 'picnic-mat', name: '체크 돗자리', description: '펴면 어디든 한강 느낌', price: 100, slot: 'rug' },
  { id: 'camp-lantern', name: '캠핑 랜턴', description: '방 안인데 괜히 캠핑 기분', price: 120, slot: 'tabletop' },
  { id: 'floor-lamp', name: '플로어 조명', description: '천장등 끄면 감성 두 배', price: 150, slot: 'lamp' },
  { id: 'mood-light', name: '버섯 무드등', description: '쓸모보다 귀여움이 중요', price: 100, slot: 'tabletop' },
  { id: 'wall-clock', name: '레트로 벽시계', description: '시간은 가고 월급날은 안 옴', price: 120, slot: 'clock' },
  { id: 'retro-radio', name: '빈티지 라디오', description: '주파수보다 분위기 수신 중', price: 140, slot: 'tabletop' },
  { id: 'turntable', name: '턴테이블', description: '한 면 듣고 뒤집는 부지런함', price: 190, slot: 'tabletop' },
]
export const decorationZones: Array<{value:DecorationZone; label:string; emoji:string}> = [
 {value:'media',label:'TV존',emoji:'📺'}, {value:'wall',label:'벽',emoji:'🖼️'},
 {value:'table',label:'테이블',emoji:'☕'}, {value:'floor',label:'바닥',emoji:'🧺'}, {value:'right',label:'오른쪽',emoji:'🪴'},
]
export const slotZones: Record<DecorationSlot,DecorationZone> = {
 seat:'floor',rug:'floor',basket:'floor',cabinet:'media',screen:'media',console:'media',
 wall:'wall',shelf:'wall',clock:'wall',table:'table',tabletop:'table',plant:'right',lamp:'right',appliance:'right',
}
export const roomSkins: Array<{id:SkinId;name:string;description:string;price:number}> = [
 {id:'attic',name:'바닐라 다락방',description:'크림 벽과 따뜻한 나무색 바닥',price:0},
 {id:'cloud',name:'구름 우유방',description:'분홍빛 벽과 부드러운 파스텔 바닥',price:250},
 {id:'game',name:'말차 게임방',description:'차분한 초록 벽과 레트로 가구',price:400},
]
export const defaultRoomSets: Record<SkinId,string[]> = {
 attic:['furniture-sofa','furniture-tv-unit','furniture-rug','tv','floor-lamp'],
 cloud:['furniture-bed','furniture-tv-unit','furniture-rug','tv','floor-lamp','furniture-wall-shelf'],
 game:['furniture-sofa','furniture-tv-unit','furniture-rug','tv','floor-lamp','console'],
}
export const starterFurnitureIds = [...new Set([...decorations.filter(item=>item.price===0).map(item=>item.id), ...Object.values(defaultRoomSets).flat()])]
export function normalizeItems(ids:string[]) {
 const slots = new Map<DecorationSlot,string>()
 ids.forEach(id=>{ const item=decorations.find(candidate=>candidate.id===id); if(item) slots.set(item.slot,id) })
 // Screens need a cabinet; small table ornaments need their supporting table.
 if (slots.get('cabinet') !== 'furniture-tv-unit') { slots.delete('screen'); slots.delete('console') }
 if (!slots.has('table')) slots.delete('tabletop')
 return [...slots.values()]
}
/** Logical 1000×650 canvas. Every prop has an explicit rectangle; no sprite padding. */
export const placements: Record<DecorationSlot,{x:number;y:number;w:number;h:number}> = {
 seat:{x:15,y:365,w:265,h:190}, cabinet:{x:795,y:414,w:190,h:150},
 rug:{x:260,y:490,w:475,h:125}, table:{x:285,y:450,w:105,h:90},
 shelf:{x:35,y:235,w:180,h:45}, plant:{x:930,y:330,w:60,h:80},
 screen:{x:817,y:337,w:146,h:122}, console:{x:847,y:505,w:77,h:64},
 wall:{x:35,y:110,w:190,h:95}, appliance:{x:919,y:550,w:62,h:72},
 lamp:{x:708,y:245,w:90,h:292}, basket:{x:210,y:535,w:80,h:67},
 tabletop:{x:312,y:406,w:53,h:48}, clock:{x:854,y:134,w:72,h:60},
}
