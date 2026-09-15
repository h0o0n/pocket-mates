import { useMemo, useState } from 'react'
import { calculateBudget } from './domain/index.ts'
import type { Expense, ExpenseCategory } from './domain/types.ts'

const plan = { monthlyIncome: 3_000_000, fixedExpenses: 1_000_000, savingsGoal: 500_000 }
const items: Array<{label:string; amount:number; category:ExpenseCategory; emoji:string}> = [
  { label:'커피', amount:5_500, category:'coffee', emoji:'☕' },
  { label:'배달', amount:28_000, category:'delivery', emoji:'🍕' },
  { label:'쇼핑', amount:89_000, category:'shopping', emoji:'📦' },
  { label:'게임', amount:69_800, category:'game', emoji:'🎮' },
]
const copy = {
  relaxed:['평화로움','이번 달은 아직 창밖을 볼 여유가 있다.'],
  watching:['슬슬 보는 중','방금 그 결제, 꼭 필요했던 거 맞지?'],
  calculating:['계산기 등장','강아지가 영수증을 모으기 시작했다.'],
  worried:['집안 사정 회의','전등 하나 끄면 해결되는 문제인가.'],
  speechless:['말을 잃음','강아지와 방이 동시에 낡아가고 있다.'],
} as const

function Dog({stage, foodLevel}:{stage:keyof typeof copy; foodLevel:number}) {
  const worried = stage === 'worried' || stage === 'speechless'
  const mouth = stage === 'relaxed' ? 'M93 112 Q100 118 107 112' : worried ? 'M94 117 Q100 111 106 117' : 'M95 115 L105 115'
  const scale = 1 + foodLevel * .11
  return <svg className="dog" viewBox="0 0 200 230" role="img" aria-label={`강아지 상태: ${copy[stage][0]}`}>
    <ellipse className="dog-shadow" cx="100" cy="215" rx="65" ry="10" />
    <g className="dog-body" style={{transform:`translateX(${100-100*scale}px) scaleX(${scale})`}}>
      <path d="M53 140Q51 106 72 91Q100 75 128 92Q150 108 147 142L151 191Q149 211 126 210L74 210Q50 211 49 190Z" />
      <path className="belly" d="M73 154Q100 137 127 154Q134 185 119 202L81 202Q66 184 73 154Z" />
    </g>
    <path className="ear" d="M67 55Q42 56 48 91Q55 104 73 89Z"/><path className="ear" d="M133 55Q158 56 152 91Q145 104 127 89Z"/>
    <path className="head" d="M62 91Q59 50 100 45Q141 50 138 91Q140 133 100 141Q60 133 62 91Z"/>
    <circle className="eye" cx="82" cy="88" r={worried?3.5:3}/><circle className="eye" cx="118" cy="88" r={worried?3.5:3}/>
    <path className="snout" d="M76 100Q100 89 124 100Q126 126 100 130Q74 126 76 100Z"/><ellipse className="nose" cx="100" cy="104" rx="9" ry="6"/><path className="mouth" d={mouth}/>
    {stage==='calculating'&&<text className="prop" x="154" y="154">⌨</text>}{stage==='worried'&&<text className="sweat" x="139" y="77">💧</text>}{stage==='speechless'&&<text className="prop" x="153" y="153">…</text>}
    <path className="paw" d="M62 184Q54 210 72 214"/><path className="paw" d="M138 184Q146 210 128 214"/>
  </svg>
}

export default function App(){
  const [expenses,setExpenses]=useState<Expense[]>([])
  const snapshot=useMemo(()=>calculateBudget(plan,expenses),[expenses])
  const foodSpent=expenses.filter(x=>['coffee','delivery','dining'].includes(x.category)).reduce((s,x)=>s+x.amount,0)
  const foodLevel=Math.min(3,Math.floor(foodSpent/70_000))
  const [status,line]=copy[snapshot.stage]
  const spend=(category:ExpenseCategory,amount:number)=>setExpenses(list=>[...list,{id:crypto.randomUUID(),category,amount,spentAt:new Date().toISOString()}])
  return <main className="app-shell">
    <header className="topbar"><div><p className="brand">POCKET MATES</p><h1>내 지갑에 얹혀사는 강아지</h1></div><button className="reset" onClick={()=>setExpenses([])} disabled={!expenses.length}>이번 달 다시 시작</button></header>
    <section className={`attic stage-${snapshot.stage}`} aria-label="강아지의 다락방">
      <div className="roof roof-left"/><div className="roof roof-right"/><div className="beam beam-left"/><div className="beam beam-right"/>
      <div className="window"><div className="moon"/><span className="building one"/><span className="building two"/><span className="building three"/></div>
      <div className="lamp"><span/></div><div className="shelf"><i/><i/><i/></div><div className="plant">⌇</div>
      <div className="crack crack-one"/><div className="crack crack-two"/><div className="wall-stain stain-one"/><div className="wall-stain stain-two"/><div className="rug"/>
      <div className="dog-wrap"><span className="speech">{line}</span><Dog stage={snapshot.stage} foodLevel={foodLevel}/>{foodLevel>0&&<span className="food-badge">배부름 +{foodLevel}</span>}</div>
      <div className="moving-box">잔액<br/>보관함</div>
    </section>
    <section className="dashboard"><div className="balance-card"><p>이번 달 쓸 수 있는 돈</p><strong>{snapshot.remainingBalance.toLocaleString('ko-KR')}원</strong><div className="meter"><span style={{width:`${Math.max(0,snapshot.remainingRatio*100)}%`}}/></div><small>{status} · 총 {snapshot.totalSpent.toLocaleString('ko-KR')}원 사용</small></div>
      <div className="spend-panel"><p className="panel-title">방금 뭘 샀나요?</p><div className="quick-grid">{items.map(x=><button key={x.category} onClick={()=>spend(x.category,x.amount)}><span>{x.emoji}</span><b>{x.label}</b><small>{x.amount.toLocaleString('ko-KR')}원</small></button>)}</div><p className="hint">배달·커피를 자주 누르면 강아지 배가 먼저 반응합니다.</p></div>
    </section>
  </main>
}
