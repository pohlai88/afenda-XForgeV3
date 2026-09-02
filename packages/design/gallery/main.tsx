import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/design.css'
import '../generated/tokens.css'
import { Gallery } from './gallery'

const root = document.getElementById('root')
if (!root) {
  throw new Error('the gallery has no mount point -- index.html lost its #root')
}

createRoot(root).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
)
