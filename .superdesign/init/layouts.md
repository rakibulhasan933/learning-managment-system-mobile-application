# Layouts

## App shell

Source: `App.tsx`

`App` wraps the experience in `SafeAreaProvider`, shows a splash state while the session loads, then chooses between `Login` and `StudentApp`.

```tsx
return (
  <SafeAreaProvider>
    <StatusBar barStyle="light-content" />
    {!ready ? <Splash /> : profile ? (
      <StudentApp profile={profile} onLogout={() => setProfile(null)} />
    ) : <Login onLogin={setProfile} />}
  </SafeAreaProvider>
)
```

## Bottom navigation

Source: `App.tsx`, `BottomNav`

Three destinations are exposed: Home, My classes, and Download. The active item uses the brass accent color and the inactive state uses muted gray.

