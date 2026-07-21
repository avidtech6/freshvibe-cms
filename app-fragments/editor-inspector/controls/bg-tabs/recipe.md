# CONTROL RECIPE: Background Type Tabs

## Objective
Select the background source type (None, Color, Gradient, Image, Video).

## Contract
**Input:**
- `field`: Object containing configuration.
  - `value`: String ("none" | "color" | "gradient" | "image" | "video").

**Output:**
- String on change.

## Functional Requirements
1. **Tabs**: 5 items, equal width.
2. **Icons**: Specific icons for each type.
3. **Labels**: Uppercase, small.
4. **Active State**: Panel-2 background, text color.

## UI Layout
[None] [Color] [Gradient] [Image] [Video]

## Edge Cases
- Invalid value handling.