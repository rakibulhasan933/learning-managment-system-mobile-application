# Shared UI components

The app is currently a single React Native entry point rather than a component directory. Reusable UI is defined as local functions in `App.tsx`.

## App.tsx

The main reusable UI functions include `Splash`, `Login`, `StudentApp`, `HomeScreen`, `DownloadsScreen`, `BottomNav`, `CourseOutline`, `Player`, `PdfScreen`, `QuizScreen`, and `AssignmentScreen`. They use React Native primitives (`View`, `Text`, `Pressable`, `ScrollView`, `TextInput`) and `lucide-react-native` icons.

Primary styling is NativeWind for the migrated surfaces, with legacy styles from `src/theme.ts` still used by specialized player, outline, PDF, and quiz surfaces.

## NativeWind setup

```tsx
<SafeAreaView className="flex-1 bg-ink">
  <Text className="font-serif text-[28px] leading-[34px] text-text">BanglaBox</Text>
</SafeAreaView>
```

