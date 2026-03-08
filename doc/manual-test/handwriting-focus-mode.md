# Handwriting Focus Mode Manual Checklist

## Scope
- `/session` split mode
- `/session` handwritingFocus mode
- `/session/complete`
- `/history`
- `/history/[id]`

## Checklist

### 1) Mode switch
- [ ] Mode switch UI is visible on md+.
- [ ] Can switch `split` -> `handwritingFocus`.
- [ ] Can switch `handwritingFocus` -> `split`.
- [ ] No layout break occurs during switching.

### 2) State retention
- [ ] Canvas drawing remains after mode switch.
- [ ] Text input remains after mode switch.
- [ ] Timer state (running/seconds left) remains after mode switch.

### 3) Focus mode text overlay
- [ ] Text overlay opens in focus mode.
- [ ] Typed text remains after close and reopen.
- [ ] Overlay blocks accidental canvas interactions while open.
- [ ] Overlay can be closed from close button and backdrop.

### 4) Session flow
- [ ] Next theme action works in split mode.
- [ ] Next theme action works in focus mode.
- [ ] Timer finish auto-advance still works.
- [ ] Last theme transitions to `/session/complete`.

### 5) History integrity
- [ ] Completed session appears in `/history`.
- [ ] Text and handwriting are visible in `/history/[id]`.

### 6) Responsive behavior
- [ ] On md- screens, focus mode UI is not exposed.
- [ ] On md+ screens, focus layout keeps canvas dominant.
