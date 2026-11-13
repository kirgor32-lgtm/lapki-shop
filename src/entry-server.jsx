import { renderToString } from 'react-dom/server'
import App from './App.jsx'
import { match, head, headHtml } from './seo'

export function render(path) {
  const route = match(path)
  return { html: renderToString(<App path={path} />), head: headHtml(head(route)), type: route.type }
}
export { routes, isEmptyRoute } from "./seo"
export { products } from './data.js'
