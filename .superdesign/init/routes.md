# Routes and navigation

This is a native React Native app with state-based navigation in `App.tsx`, not URL/file-based routing.

## Navigation states

- `home` — dashboard/course overview
- `courses` — all enrolled classes
- `downloads` — offline video library
- `course` — course outline with sections, modules, and lesson content
- `player` — video lesson player
- `pdf` — PDF lesson material
- `quiz` — quiz and result/review flow
- `assignment` — assignment submission screen

`StudentApp` owns the current `Screen` state and renders the corresponding screen component. `BottomNav` handles the three primary destinations.

