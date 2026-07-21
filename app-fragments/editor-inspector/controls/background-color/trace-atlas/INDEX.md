# Data Flow Trace

**Input:**
`{ name: "bgColor", label: "Background", value: "#ff0000", showAlpha: true }`

**Render Cycle:**
1. Function parses `#ff0000` -> `rgb(255, 0, 0)`.
2. Creates input element with value `#ff0000`.
3. Creates alpha slider with value `1`.
4. Creates preview div with `style.background = "rgba(255, 0, 0, 1)"`.

**Change Event (User types `#00ff00`):**
1. Event listener triggers normalization.
2. New Hex `#00ff00`.
3. `onChange("#00ff00")` called.
4. Parent state updates.