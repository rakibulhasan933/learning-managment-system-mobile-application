# Extractable components

## AppShell

- Source: `App.tsx`
- Category: layout
- Description: Session-aware safe-area shell that switches splash, login, and student experiences.
- Extractable props: `profile`, `onLogout`, `onLogin`

## BottomNav

- Source: `App.tsx`
- Category: layout
- Description: Three-item primary navigation for Home, My classes, and Download.
- Extractable props: `active`, `onPress`

## CourseCard

- Source: `App.tsx`
- Category: basic
- Description: Course progress card with icon, status badge, progress bar, and CTA.
- Extractable props: `course`, `onPress`

## ContentRow

- Source: `App.tsx`
- Category: basic
- Description: Course lesson row supporting video, PDF, quiz, and assignment content.
- Extractable props: `content`, `onPress`, `completed`

## StatusCard

- Source: `App.tsx`
- Category: basic
- Description: Loading, error, empty, and result feedback card pattern.
- Extractable props: `title`, `message`, `action`

