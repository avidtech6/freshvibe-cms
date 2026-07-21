# Recipe: Entrance Animation Control

## Objective
Select a CSS animation class to be triggered when an element enters the viewport (or loads).

## Context
Rapid prototyping of scroll-driven animations.

## Behavior
1. **State:** `value: 'fade-up' | 'slide' | 'scale' | 'rotate' | 'reveal' | 'none'`
2. **UI:** 6-Tile grid. Each tile shows an icon (or character) and label.
3. **Interaction:** Clicking a tile sets the active class and triggers `onChange`.