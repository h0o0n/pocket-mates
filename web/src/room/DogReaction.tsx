/** Independent layers keep the mochi face intact when reactions combine. */
export function DogReaction({foodLevel,remaining,shoppingCount}:{foodLevel:number;remaining:number;shoppingCount:number}) {
  const receipt = remaining <= .5
  const worried = remaining <= .25
  const sunglasses = shoppingCount >= 3
  return <svg className={`dog-reactions${worried?' is-worried':''}`} viewBox="0 0 300 200" preserveAspectRatio="none" aria-hidden="true" fill="none" stroke="#684329" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {foodLevel > 0 && <g className={`dog-belly belly-${foodLevel}`}>
      <path d={foodLevel===2 ? 'M83 139Q49 150 63 174Q72 199 146 191Q222 204 245 173Q253 147 226 139' : 'M91 145Q70 158 84 176Q109 192 155 184Q202 192 219 173Q229 155 211 145'} fill="#ffe9c8"/>
      <path d="M133 160Q149 167 164 160" stroke="#d8b58b" strokeWidth="2"/>
      <path d="M96 177q-9 8-16 0 M197 178q9 8 16 0"/>
    </g>}
    {worried && !sunglasses && <g className="dog-side-eye"><path d="M94 102h16 M181 102h16" strokeWidth="4"/><path d="M98 110h7 M185 110h7" strokeWidth="2"/></g>}
    {sunglasses && <g className="dog-sunglasses" data-reaction="sunglasses">
      <path d="M77 99L60 96 M213 99L229 96"/>
      <path d="M77 99h48l-5 25q-18 13-38-1Z M165 99h48l-5 25q-18 13-38-1Z" fill="#454640"/>
      <path d="M125 105Q146 96 165 105"/><path d="M89 106l10 1 M177 106l10 1" stroke="#b4b9a7" strokeWidth="3"/>
    </g>}
    {receipt && <g className="dog-receipt" data-reaction="receipt">
      <path d={worried ? 'M221 124h44v76l-6-4-6 5-6-4-6 5-7-4-7 4-6-4Z' : 'M221 124h44v54l-7-4-7 4-8-4-8 4-7-4-7 4Z'} fill="#fff9e9"/>
      <path d="M231 137h24 M231 146h20 M231 155h24 M231 164h14" strokeWidth="2" stroke="#ad9272"/>
      {worried && <path d="M231 177h24 M231 186h16" strokeWidth="2" stroke="#ad9272"/>}
      <path d="M219 145q-11-5-13 5q-5 5 1 10q-1 9 8 8h9q7-3 3-9q5-7-1-10Z" fill="#ffe9c8"/>
    </g>}
    {remaining <= .1 && <g className="dog-sweat" stroke="#94acb5" fill="#d5e9ed"><path d="M210 72q-12 16 0 16q12 0 0-16Z"/></g>}
  </svg>
}
