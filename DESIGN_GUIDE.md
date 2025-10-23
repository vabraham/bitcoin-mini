# Bitcoin Mini - Design Principles & Style Guide

## Design Philosophy

### Core Principles
1. **Minimal & Focused**: Every element serves a purpose. No clutter.
2. **Bitcoin-First**: Orange (#f2a900) is our signature. Use it for primary actions and brand elements.
3. **Dark Theme Native**: Designed for dark mode, not adapted from light.
4. **Compact & Efficient**: Small footprint (440px width), maximum information density.
5. **Consistent Spacing**: 4px/8px/12px/16px grid system throughout.

### Visual Hierarchy
- **Primary actions**: Bitcoin orange buttons
- **Secondary actions**: Gray/transparent buttons
- **Destructive actions**: Red (#c53030)
- **Success states**: Green (#1dd1a1)
- **Warnings/errors**: Red (#ee5253)

---

## Color Palette

### Brand Colors
```css
--bitcoin-orange: #f2a900;     /* Primary brand, CTAs, headers */
--bitcoin-orange-hover: #e09900; /* Hover states */
```

### Background Colors
```css
--bg-primary: #0b1220;         /* Main background */
--bg-secondary: #121a2b;       /* Cards, modals */
--bg-tertiary: rgba(255,255,255,0.03); /* Subtle highlights */
```

### Text Colors
```css
--text-primary: #e8eef7;       /* Main text */
--text-secondary: #8aa0b6;     /* Muted text, labels */
--text-bitcoin: #f2a900;       /* Headings, emphasis */
```

### Semantic Colors
```css
--success: #1dd1a1;            /* Price up, confirmations */
--error: #ee5253;              /* Price down, errors */
--warning: #f2a900;            /* Alerts, attention */
--neutral: #666;               /* Disabled, inactive */
```

### UI Elements
```css
--border: #333;                /* Inputs, dividers */
--overlay: rgba(0, 0, 0, 0.7); /* Modal backgrounds */
```

---

## Typography

### Font Stack
```css
font-family: system-ui;        /* Native system font for performance */
```

### Font Sizes
```css
--text-xs: 11px;               /* Helper text, badges */
--text-sm: 12px;               /* Body text, tables */
--text-base: 13px;             /* Input text, standard UI */
--text-md: 14px;               /* Modal body text */
--text-lg: 15px;               /* Compact modal headers */
--text-xl: 16px;               /* Main headers */
--text-2xl: 18px;              /* Modal titles */
--text-3xl: 20px;              /* Muted prices */
--text-4xl: 24px;              /* Large prices */
```

### Font Weights
- **Regular**: 400 (default)
- **Medium**: 500 (secondary buttons)
- **Semibold**: 600 (headings, primary buttons)

---

## Spacing System

### Base Grid: 4px
All spacing should be multiples of 4px for visual consistency.

```css
--space-1: 4px;    /* Tight spacing (table cells, compact elements) */
--space-2: 8px;    /* Standard gaps (buttons, inputs, margins) */
--space-3: 12px;   /* Card padding, section spacing */
--space-4: 16px;   /* Modal padding, larger sections */
--space-5: 20px;   /* Modal button margins */
--space-6: 24px;   /* Large modal padding */
```

### Common Patterns
- **Button gap**: 8px
- **Card padding**: 12px
- **Modal padding**: 16px (compact) or 24px (standard)
- **Section margins**: 8px vertical
- **Input margins**: 4px bottom

---

## Layout Principles

### Positioning Philosophy
- **"Right side"** = Far right edge (use `justify-content: space-between`)
- **"Left side"** = Far left edge
- **"Center"** = Only when explicitly centering text or single elements
- **Never assume**: "Right" does NOT mean "right of another element" - it means "aligned to the right edge"

### Flexbox Patterns
```css
/* Standard horizontal layout */
.row {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* Spread layout (left vs right) */
.spread {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Button groups */
.button-group {
  display: flex;
  gap: 8px;
  justify-content: flex-end; /* Buttons align right */
}
```

### Width Standards
- **Extension width**: 440px (fixed)
- **Compact modals**: max-width 360px
- **Standard modals**: max-width 400px
- **Modal width**: 90% (responsive within extension)

---

## Components

### Buttons

#### Primary Button (CTA)
```css
background: #f2a900;
color: #000;
padding: 8px 16px;
border-radius: 6px;
font-size: 12px;
font-weight: 600;
```
**Use for**: Main actions, "Save", "Confirm", "Add"

#### Secondary Button (Text)
```css
background: transparent;
color: #8aa0b6;
padding: 8px 16px;
border-radius: 5px;
font-size: 13px;
font-weight: 500;
```
**Use for**: "Close", "Cancel", secondary actions

#### Destructive Button
```css
background: #c53030;
color: white;
padding: 8px 16px;
border-radius: 6px;
font-size: 12px;
font-weight: 600;
```
**Use for**: "Delete", "Remove", "Reset"

#### Icon Button
```css
background: transparent;
border: none;
padding: 8px;
color: #8aa0b6;
```
**Use for**: Settings, notifications, toolbar actions

### Modals

#### Standard Modal
```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.7);
  /* Full screen overlay */
}

.modal-content {
  background: #121a2b;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
}
```

#### Compact Modal
```css
.modal-content.compact {
  padding: 16px;
  max-width: 360px;
}
```
**Use for**: Quick actions, alerts, settings where space efficiency matters

#### Modal Structure
```html
<div class="modal-overlay">
  <div class="modal-content">
    <h3>Title</h3>              <!-- Orange, centered -->
    <p>Description</p>           <!-- Body text -->
    <div class="modal-buttons">  <!-- Right-aligned -->
      <button class="cancel">Cancel</button>
      <button class="confirm">Confirm</button>
    </div>
  </div>
</div>
```

### Inputs

#### Text Input
```css
background: #0b1220;
color: #e8eef7;
border: 1px solid #333;
border-radius: 4px;
padding: 8px;
font-size: 13px;

/* Focus state */
border-color: #f2a900;
outline: none;
```

#### Input with Inline Label
```html
<div class="input-group">
  <span class="label">Label</span>
  <input type="text">
</div>
```

### Toggle Switch

#### Standard Toggle
```css
width: 38px;
height: 22px;
border-radius: 22px;
background: #333; /* Off state */
background: #1dd1a1; /* On state */
```

**Positioning Rule**: Toggle switches go on the **far right** of their container
```html
<!-- Correct: Toggle on far right -->
<div class="controls">
  <div class="left-content">
    <button>Action 1</button>
    <button>Action 2</button>
  </div>
  <label class="toggle">...</label>
</div>
```

### Cards
```css
background: #121a2b;
border-radius: 8px;
padding: 12px;
margin: 4px 0;
```

### Tables
```css
font-size: 12px;
border-collapse: collapse;

/* Cells */
padding: 4px;
border-bottom: 1px solid #333;
text-align: left;
```

### Badges
```css
background: #dc2626; /* Notification badge */
color: white;
font-size: 10px;
font-weight: bold;
padding: 2px 5px;
border-radius: 10px;
min-width: 16px;
position: absolute;
top: -4px;
right: -4px;
```

---

## Notification & Alert System

### Core Philosophy
1. **Less is More**: "Sending fewer notifications improved user satisfaction and long-term usage" (Facebook study)
2. **Respect User Attention**: Notifications interrupt users - they must deliver timely, actionable content
3. **Progressive Disclosure**: Start with minimal notifications, increase based on user behavior
4. **User Control**: Always provide granular control over notification frequency and types

### Notification Severity Levels

#### High Attention (Critical)
- **Color**: Red (#ee5253)
- **Icon**: Filled/solid bell with red badge
- **Use for**: Price thresholds crossed, critical errors, destructive confirmations
- **Behavior**: Modal popup (blocks interaction), requires user action
- **Sound/Visual**: Brief pulse animation, optional sound alert
- **Example**: "BTC dropped below $100,000 (-5%)"

#### Medium Attention (Warning)
- **Color**: Orange (#f2a900)
- **Icon**: Outlined bell with orange badge
- **Use for**: Approaching thresholds, important updates, actionable warnings
- **Behavior**: Toast notification (dismissible, non-blocking)
- **Sound/Visual**: Subtle fade-in, no sound
- **Example**: "BTC at $101,500, approaching your $100,000 alert"

#### Low Attention (Informational)
- **Color**: Blue (#4a90e2) or Muted Gray (#8aa0b6)
- **Icon**: Simple bell outline, no badge
- **Use for**: Status updates, confirmations, passive information
- **Behavior**: Inline status text, no popup
- **Sound/Visual**: No animation, text update only
- **Example**: "Alert settings saved"

### Color System for Notifications

```css
/* Alert Severity Colors */
--alert-critical: #ee5253;      /* Urgent, requires immediate action */
--alert-warning: #f2a900;       /* Caution, attention needed */
--alert-success: #1dd1a1;       /* Positive confirmation */
--alert-info: #4a90e2;          /* Neutral information */
--alert-disabled: #666;         /* Inactive state */
```

**Accessibility Rules:**
1. **Never rely on color alone** - Always pair with icons, text labels, or patterns
2. **Maintain WCAG 2.1 contrast ratios** - Critical alerts must have 4.5:1 contrast minimum
3. **Support color-blind modes** - Use shapes/icons in addition to colors

### Notification Icon States

#### Bell Icon Variations
```css
/* Default (No alerts active) */
.alert-icon-default {
  color: #8aa0b6;          /* Muted gray */
  opacity: 0.7;
}

/* Active (Alerts enabled, not triggered) */
.alert-icon-active {
  color: #f2a900;          /* Bitcoin orange */
  opacity: 1;
}

/* Triggered (Alert condition met) */
.alert-icon-triggered {
  color: #f2a900;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Critical (Multiple alerts or urgent) */
.alert-icon-critical {
  color: #ee5253;          /* Red */
  animation: pulse 1s ease-in-out infinite;
}
```

#### Badge Numbers
```css
.alert-badge {
  background: #dc2626;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 16px;
  position: absolute;
  top: -4px;
  right: -4px;
}
```

**Badge Display Rules:**
- **1-9 active alerts**: Show exact number
- **10+ alerts**: Show "9+" to prevent visual clutter
- **No active alerts**: No badge (icon returns to muted state)

### Browser Notification Content

#### Structure
```javascript
{
  title: "Price Alert! 🚀",              // Short, action-oriented (40-60 chars)
  body: "Bitcoin is now $114,552 (Above $113,900 or +1%)",
  icon: "icon128.png",                    // Extension icon
  badge: "badge.png",                     // Small monochrome icon
  tag: "price-alert-btc",                 // Prevents duplicate notifications
  requireInteraction: true                // Stays until user dismisses
}
```

#### Content Best Practices
1. **Title**: 40-60 characters, action-oriented, includes context
   - ✅ "Price Alert! 🚀"
   - ❌ "Bitcoin Mini - Price Alert Notification"

2. **Body**: Specific, includes actual values, reason for alert
   - ✅ "Bitcoin is now $114,552 (Above $113,900 or +1%)"
   - ❌ "Your price alert has been triggered"

3. **No Redundancy**: Chrome prepends extension name automatically
   - ❌ "Bitcoin Mini - Price Alert!"
   - ✅ "Price Alert! 🚀"

### In-App Alert Status Display

#### Status Badge Styling
```css
/* Alert Active */
.alert-status-active {
  background: rgba(242, 169, 0, 0.1);    /* Subtle orange tint */
  color: #f2a900;
  border: 1px solid rgba(242, 169, 0, 0.2);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
}

/* Alert Triggered */
.alert-status-triggered {
  background: rgba(238, 82, 83, 0.15);   /* Subtle red tint */
  color: #ee5253;
  border: 1px solid rgba(238, 82, 83, 0.3);
  animation: pulseBackground 2s ease-in-out infinite;
}

/* Alert Disabled */
.alert-status-disabled {
  background: transparent;
  color: #666;
  border: 1px solid #333;
}
```

#### Status Text Patterns
- **Active**: "✓ Alert active: Above $100,000 or +5%"
- **Triggered**: "🔔 Alert triggered: $114,552 (Above $100,000)"
- **Disabled**: "Alerts disabled"
- **Multiple**: "✓ 2 alerts active: Above $100,000 or +5%"

### Notification Frequency & Timing

#### Cooldown Periods
```javascript
const COOLDOWN_PERIODS = {
  same_alert: 15 * 60 * 1000,      // 15 minutes between same alert
  any_alert: 5 * 60 * 1000,         // 5 minutes between any alerts
  daily_limit: 10                    // Max 10 notifications per day
};
```

**Rationale**: Prevents notification fatigue while ensuring users don't miss critical price movements

#### Smart Throttling
- **First trigger**: Immediate notification
- **Subsequent triggers**: 15-minute cooldown for same threshold
- **Rapid changes**: Batch multiple alerts into summary ("3 alerts triggered in last hour")

### User Control Settings

#### Notification Preferences
```
□ Enable price alerts
  └─ □ Target value alerts
  └─ □ Percentage change alerts
□ Browser notifications
□ Sound alerts
□ Badge counter on icon
```

#### Quiet Hours (Future Enhancement)
```
□ Enable quiet hours
  ⏰ From: [22:00] To: [08:00]
  □ Weekend mode (disable all notifications)
```

### Modal Design for Alert Configuration

#### Compact Alert Modal (Current Design)
- **Width**: 360px
- **Padding**: 16px
- **Header**: "Price Alerts 🔔" (15px, orange)
- **Current Price**: Prominent display with $ symbol
- **Alert Rows**: Each with inline toggle (far right)
- **Button Layout**: Close (left) + Save Alert (right, orange)
- **Status Badge**: Below inputs, subtle background

#### Visual Hierarchy
1. **Modal Title** - Orange, centered, with icon
2. **Current Price** - Large, prominent (user context)
3. **Alert Configuration** - Two rows (Target Value, Percentage)
4. **Status Feedback** - Muted badge showing alert state
5. **Actions** - Right-aligned, orange primary button

### Animation & Feedback

#### Alert Triggered Animation
```css
@keyframes pulseBackground {
  0%, 100% {
    background: rgba(238, 82, 83, 0.15);
  }
  50% {
    background: rgba(238, 82, 83, 0.25);
  }
}
```

#### Icon Pulse (for triggered state)
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}
```

#### Toast Notification Entry
```css
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### Accessibility Considerations

1. **Screen Readers**: Alert status changes announced via `aria-live="polite"`
2. **Keyboard Navigation**: All alert controls accessible via Tab/Enter
3. **Focus Management**: Modal traps focus, Escape key closes
4. **Reduced Motion**: Respect `prefers-reduced-motion` media query
5. **High Contrast**: Alert colors maintain 4.5:1 ratio in high contrast mode

### Testing Checklist

- [ ] Alert icon changes color when enabled (muted → orange)
- [ ] Alert icon pulses when triggered
- [ ] Badge shows correct number of active alerts
- [ ] Browser notification appears with correct format
- [ ] Notification cooldown prevents spam
- [ ] Status badge updates in real-time
- [ ] Modal shows current price with $ symbol
- [ ] Toggles are on far right, buttons on far left
- [ ] Red/orange colors accessible (WCAG AA contrast)
- [ ] Keyboard navigation works throughout

### Design Rationale

**Why these choices:**
1. **Three-tier severity system**: Balances urgency without overwhelming users
2. **Orange for active, Red for triggered**: Consistent with Bitcoin brand while signaling urgency
3. **15-minute cooldown**: Prevents notification fatigue (backed by Facebook research)
4. **Inline toggles**: Allows granular control per alert type
5. **$ symbol for USD**: Cleaner, more intuitive than "USD" prefix
6. **Far-right toggle placement**: Consistent with design system, visually balanced
7. **Compact modal (360px)**: Efficient use of extension space while readable

---

## Interaction States

### Hover States
- **Buttons**: Darken color or add subtle background
- **Icon buttons**: Change color to `#e0e7ed`
- **Primary buttons**: Transform slightly (`translateY(-1px)`)

### Active/Selected States
- **Alert icon (enabled)**: Orange (#f2a900)
- **Alert icon (triggered)**: Orange + pulse animation
- **Selected tab**: Orange text/border

### Disabled States
```css
background: #666;
cursor: not-allowed;
opacity: 0.6;
```

### Focus States
- **Inputs**: Orange border (#f2a900)
- **Remove default outline**: `outline: none;`

---

## Animations

### Transitions
```css
transition: all 0.2s;          /* Standard UI transitions */
transition: 0.25s;             /* Toggle switches */
```

### Keyframe Animations

#### Pulse (for alerts)
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
animation: pulse 1.5s ease-in-out infinite;
```

#### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

---

## Common Patterns

### Header with Right-Side Controls
```html
<div class="header">
  <h1>Title</h1>
  <div class="controls">
    <button id="icon1">...</button>
    <button id="icon2">...</button>
  </div>
</div>
```

### Two-Column Layout (50/50 split)
```html
<div class="row-split">
  <div class="col-left">Content</div>
  <div class="divider"></div>
  <div class="col-right">Content</div>
</div>
```

### Button Row (Right-aligned)
```html
<div class="button-row">
  <button class="secondary">Cancel</button>
  <button class="primary">Confirm</button>
</div>
```

### Button Row with Toggle (Spread Layout)
```html
<div class="button-row-spread">
  <div class="buttons-left">
    <button class="secondary">Close</button>
    <button class="primary">Save</button>
  </div>
  <label class="toggle">...</label>
</div>
```

---

## Accessibility

### Contrast Ratios
- Primary text on dark background: High contrast (#e8eef7 on #0b1220)
- Muted text: Lower contrast but still readable (#8aa0b6)
- Orange on black: Ensure proper contrast for readability

### User Select
- **Allow text selection** on inputs and text content:
```css
-webkit-user-select: text;
user-select: text;
```

### Click Targets
- Minimum 24px × 24px for icon buttons
- Use padding to expand click area when needed

---

## Design Review Checklist

Before considering a design "done":

### Visual
- [ ] Colors match the palette (no random colors)
- [ ] Spacing follows 4px grid
- [ ] Font sizes use defined scale
- [ ] Border radius is consistent (4px inputs, 6px buttons, 8px cards, 12px modals)

### Layout
- [ ] "Right side" means far-right edge (not middle-right)
- [ ] Flexbox used correctly (space-between for spread layouts)
- [ ] Button groups have 8px gap
- [ ] Modal padding is 16px (compact) or 24px (standard)

### Interaction
- [ ] Hover states defined
- [ ] Focus states use orange
- [ ] Disabled states are clear
- [ ] Transitions are smooth (0.2s standard)

### Brand
- [ ] Primary actions use bitcoin orange
- [ ] Headers/titles use orange
- [ ] Overall feel is dark, minimal, efficient

---

## Working with Claude Code

### When Requesting Design Changes

1. **Be Specific About Position**
   - ❌ "Move toggle to the right"
   - ✅ "Move toggle to the far right edge of the button row"

2. **Reference Existing Patterns**
   - ❌ "Make it look better"
   - ✅ "Use the same spacing as the vault PIN modal"

3. **Provide Visual Context**
   - Include screenshot of current state
   - Annotate what you want changed
   - Reference similar UI already in the app

4. **Specify Layout Intent**
   - ❌ "Put buttons and toggle together"
   - ✅ "Buttons on left, toggle on far right, using space-between"

### Design Iteration Process (with Playwright MCP)

1. Claude makes changes
2. Claude takes screenshot automatically
3. Claude verifies design matches intent
4. Claude shows you the result (only when correct)

---

## Examples from Codebase

### Price Alerts Modal (Compact Design)
- Width: 360px
- Padding: 16px
- Header: 15px font, orange
- Two-column input: Current | Alert Above (with vertical divider)
- Button row: Left group (Close, Save) + Right toggle
- Status badge: Subtle background with muted text

### Vault PIN Modal (Standard Design)
- Width: 400px
- Padding: 24px
- Centered text
- 24px price display
- Button gap: 12px

### Main Header
- Bitcoin orange title (16px)
- Icon buttons (8px padding, transparent)
- Right-aligned controls (settings, notifications)

---

## Questions to Ask Before Building

1. **Is this compact or standard?** (Determines padding and max-width)
2. **Where does this element align?** (Far left, far right, center, or spread?)
3. **What's the primary action?** (Should use orange button)
4. **Does this match an existing pattern?** (Reference it to maintain consistency)
5. **What spacing grid applies?** (4px, 8px, 12px, or 16px?)

---

*This guide is a living document. Update it as new patterns emerge or design principles evolve.*
