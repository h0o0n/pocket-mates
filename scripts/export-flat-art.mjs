// Deterministic SVG exports for catalog thumbnails and the database asset_path.
import { createServer } from '../web/node_modules/vite/dist/node/index.js'
import { createElement } from '../web/node_modules/react/index.js'
import { renderToStaticMarkup } from '../web/node_modules/react-dom/server.node.js'
import { mkdir, writeFile } from 'node:fs/promises'
const server = await createServer({root:'web',server:{middlewareMode:true,watch:null},optimizeDeps:{noDiscovery:true}})
try {
 const { FlatArt } = await server.ssrLoadModule('/src/room/FlatArt.tsx')
 const { decorations } = await server.ssrLoadModule('/src/room/catalog.ts')
 await mkdir('web/public/assets/flat/items',{recursive:true})
 for (const id of [...decorations.map(item=>item.id),'food-cup','food-pizza','food-bowl','food-lunch','parcel']) {
  const svg=renderToStaticMarkup(createElement(FlatArt,{id})).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ')
  await writeFile(`web/public/assets/flat/items/${id}.svg`,svg)
 }
 console.log('Exported 29 flat SVG assets')
} finally {await server.close()}
