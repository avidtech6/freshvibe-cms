# Recipe: Background Unsplash

**Goal:** Provide a curated gallery of high-quality images from Unsplash for quick background selection.

**User Flow:**
1. **Search Bar:** Input to filter images by keyword (client-side mock).
2. **Categories:** Horizontal scrollable chips (Curated, Forest, Classroom, Books, Recent).
3. **Grid:** 2-column grid of image thumbnails.
4. **Selection:** Click thumbnail -> updates preview -> calls `onChange({ url, author })`.
5. **Mock Data:** Hardcoded array of 6 curated images (using v2 mock URLs).

**Sub-controls:**
- `value`: Object `{ url, author }`.
- Default: `{ url: '', author: '' }`.