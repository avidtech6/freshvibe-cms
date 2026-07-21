# Codex: Unsplash Logic

**Mock Data:**
Use the specific URLs provided in the prompt logic (or standard mock endpoints if restricted).
- `curated`: High quality nature/architecture.
- `forest`: Greenery.
- `classroom`: School/Study.
- `books`: Library/Reading.
- `recent`: Dynamic shots.

**Search Logic:**
- `filterImages(keyword)` function.
- Filters by title or generic keyword match.
- Updates the grid.

**Selection Logic:**
- `selectImage(imageObj)`.
- Updates state.
- Emits `onChange({ url: imageObj.urls.regular, author: imageObj.author })`.

**UI Components:**
- Chips container.
- Image Grid container.