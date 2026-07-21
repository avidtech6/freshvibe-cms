# Recipe: Animation Trigger Control

## Objective
Define *when* an animation is triggered: on page load, scroll, hover, or click.

## Context
Crucial for orchestrating complex scroll animations (IntersectionObserver logic).

## Behavior
1. **State:** `value: 'scroll' | 'load' | 'hover' | 'click'`
2. **UI:** 4 Pill buttons.
3. **Interaction:** Clicking a pill updates the trigger state.