# Recipe: AI Assist Control

## Objective
Provide a mock "AI Assistant" interface for content suggestions and copy improvements within the inspector.

## Context
Demonstrates how a mock async service can integrate into the FES Inspector workflow.

## Behavior
1. **State:** `value: ''` (response text), `loading: bool`
2. **UI:**
   - "✦ AI: Improve this" button.
   - On click: Opens a modal with options ("Improve copy", "Match brand", etc.).
   - Clicking an option starts a 1.5s mock delay, then populates a text area.
   - "Apply" button confirms the result.