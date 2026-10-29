import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  GestureResponderEvent,
  Image,
  KeyboardAvoidingView,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  Download,
  FileText,
  GraduationCap,
  LogOut,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  Trash2,
  TrendingUp,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import Video from 'react-native-video';
import Orientation from 'react-native-orientation-locker';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  api,
  Dashboard,
  DownloadControls,
  LearningCourse,
  LearningModule,
  LearningVideo,
  OfflineVideo,
  Profile,
  Quiz,
  QuizResult,
  clearSession,
  loadSession,
} from './src/api';
import { colors, styles } from './src/theme';
import { AuthNavigator as FileAuthNavigator } from './src/navigation/AuthNavigator';
import { StudentNavigator as FileStudentNavigator } from './src/navigation/StudentNavigator';

type Screen =
  | { kind: 'home' }
  | { kind: 'courses' }
  | { kind: 'downloads' }
  | { kind: 'course'; courseId: string; title: string }
  | {
      kind: 'player';
      courseId: string;
      courseTitle: string;
      video: LearningVideo;
      contentKey?: string;
      fromDownloads?: boolean;
    }
  | {
      kind: 'pdf';
      title: string;
      url: string;
      courseId?: string;
      courseTitle?: string;
      contentKey?: string;
    }
  | {
      kind: 'quiz';
      courseTitle: string;
      quiz: Quiz;
      courseId?: string;
      contentKey?: string;
    }
  | {
      kind: 'assignment';
      courseTitle: string;
      assignment: LearningAssignment;
      courseId?: string;
      contentKey?: string;
    };

type NavKey = 'home' | 'classes' | 'download';


type LearningAssignment = {
  id: string;
  title: string;
  instructions: string;
  maxScore: number;
  dueAt: string | null;
  submission: {
    submissionText: string;
    submittedAt: string;
    gradeScore: number | null;
    gradeFeedback: string | null;
  } | null;
};

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(
    Math.floor(seconds % 60),
  ).padStart(2, '0')}`;
}

function formatTotal(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes}m`;
}

/* ------------------------------------------------------------------ */
/* App shell                                                           */
/* ------------------------------------------------------------------ */

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSession()
      .then(session => setProfile(session?.profile ?? null))
      .finally(() => setReady(true));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      {!ready ? (
        <Splash />
      ) : profile ? (
        <StudentApp
          profile={profile}
          onLogout={async () => {
            // Real sign-out (not just clearing in-memory state): revoke the
            // server refresh token and delete offline downloads via
            // api.logout(), then always navigate to Login, even if the
            // server call fails. api.logout() itself also best-efforts
            // local cleanup, so a network failure cannot leave a session.
            try {
              await api.logout();
            } catch {
              // Local cleanup already attempted inside api.logout();
              // navigation to Login must still happen below.
            } finally {
              setProfile(null);
            }
          }}
        />
      ) : (
        <FileAuthNavigator screens={{ Login }} onLogin={setProfile} />
      )}
    </SafeAreaProvider>
  );
}

function Splash() {
  return (
    <SafeAreaView style={[styles.screen, styles.center]}>
      <View style={styles.logoMark}>
        <Image
          source={require('./public/banglabox-app-icon-1024.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>BanglaBox</Text>
      <View style={styles.thread} />
      <Text style={[styles.body, styles.splashSubtitle]}>Student learning</Text>
      <ActivityIndicator color={colors.brass} style={styles.splashSpinner} />
    </SafeAreaView>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.stateCard}>
      <ActivityIndicator color={colors.brass} />
      <Text style={styles.stateLabel}>{label}</Text>
    </View>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={[styles.stateCard, styles.errorStateCard]}>
      <View style={styles.errorIcon}>
        <X size={18} color={colors.danger} />
      </View>
      <Text style={styles.stateTitle}>Something went wrong</Text>
      <Text style={styles.stateLabel}>{message}</Text>
      <Pressable onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export function Login({ onLogin }: { onLogin: (profile: Profile) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!email.trim() || !password) {
      return setError('Enter your email and password.');
    }

    setBusy(true);
    try {
      const session = await api.login(email.trim(), password);
      if (session.profile.role !== 'student') {
        await clearSession();
        throw new Error('Only student accounts can use BanglaBox.');
      }
      onLogin(session.profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.content, styles.loginContent]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginBrand}>
            <View style={styles.logoMark}>
              <Image
                source={require('./public/banglabox-app-icon-1024.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, styles.loginTitle]}>BanglaBox</Text>
            <View style={styles.thread} />
            <Text style={[styles.body, styles.loginSubtitle]}>
              Continue your Folio courses on your phone.
            </Text>
          </View>

          <Text style={[styles.heading, styles.loginFirstLabel]}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Enter your email"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <Text style={[styles.heading, styles.formLabel]}>Password</Text>
          <View style={styles.loginPasswordRow}>
            <TextInput
              secureTextEntry={!showPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              style={[styles.input, styles.loginPasswordInput]}
            />
            <Pressable
              onPress={() => setShowPassword(value => !value)}
              style={styles.passwordToggle}
            >
              <Text style={styles.passwordToggleText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.loginError}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={submit} disabled={busy}>
            {busy ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>

          <Pressable>
            <Text style={styles.forgotPassword}>Forgot password?</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* Legacy in-file navigator implementation retained below for reference.
function AuthNavigator({ onLogin }: { onLogin: (profile: Profile) => void }) {
  return (
    <NavigationContainer>
      <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login">
          {() => <Login onLogin={onLogin} />}
        </AuthStack.Screen>
      </AuthStack.Navigator>
    </NavigationContainer>
  );
}

function StudentNavigator({
  profile,
  onLogout,
}: {
  profile: Profile;
  onLogout: () => void;
}) {
  return (
    <NavigationContainer>
      <StudentRootStack.Navigator screenOptions={{ headerShown: false }}>
        <StudentRootStack.Screen name="Tabs">
          {() => <StudentTabNavigator profile={profile} onLogout={onLogout} />}
        </StudentRootStack.Screen>
        <StudentRootStack.Screen name="Learning">
          {() => <LearningNavigator profile={profile} />}
        </StudentRootStack.Screen>
      </StudentRootStack.Navigator>
    </NavigationContainer>
  );
}

function StudentTabNavigator({
  profile,
  onLogout,
}: {
  profile: Profile;
  onLogout: () => void;
}) {
  return (
    <StudentTabs.Navigator screenOptions={{ headerShown: false }}>
      <StudentTabs.Screen name="Home">
        {({ navigation }) => (
          <TabCourseScreen
            profile={profile}
            mode="home"
            navigation={navigation}
            onLogout={onLogout}
          />
        )}
      </StudentTabs.Screen>
      <StudentTabs.Screen name="Courses">
        {({ navigation }) => (
          <TabCourseScreen
            profile={profile}
            mode="classes"
            navigation={navigation}
            onLogout={onLogout}
          />
        )}
      </StudentTabs.Screen>
      <StudentTabs.Screen name="Downloads">
        {({ navigation }) => <DownloadsTab navigation={navigation} />}
      </StudentTabs.Screen>
      <StudentTabs.Screen name="Profile">
        {() => <ProfileTab profile={profile} onLogout={onLogout} />}
      </StudentTabs.Screen>
    </StudentTabs.Navigator>
  );
}

function TabCourseScreen({
  profile,
  mode,
  navigation,
  onLogout,
}: {
  profile: Profile;
  mode: 'home' | 'classes';
  navigation: { navigate: (name: string, params?: object) => void };
  onLogout: () => void;
}) {
  const openCourse = (courseId: string, title: string) =>
    navigation.navigate('Learning', {
      screen: 'Course',
      params: { courseId, title },
    });

  return (
    <CourseList
      profile={profile}
      mode={mode}
      openCourse={openCourse}
      onLogout={onLogout}
      onNavigate={key => {
        if (key === 'home') navigation.navigate('Home');
        if (key === 'classes') navigation.navigate('Courses');
        if (key === 'download') navigation.navigate('Downloads');
      }}
    />
  );
}

function DownloadsTab({
  navigation,
}: {
  navigation: { navigate: (name: string, params?: object) => void };
}) {
  return (
    <DownloadsScreen
      onNavigate={key => {
        if (key === 'home') navigation.navigate('Home');
        if (key === 'classes') navigation.navigate('Courses');
        if (key === 'download') navigation.navigate('Downloads');
      }}
      onPlay={item =>
        navigation.navigate('Learning', {
          screen: 'Player',
          params: {
            courseId: item.courseId,
            courseTitle: 'Downloaded lesson',
            video: {
              id: item.lectureId,
              title: item.title,
              description: null,
              durationSeconds: null,
              pdfUrl: null,
              slidesUrl: null,
              progress: null,
              quiz: null,
              moduleTitle: '',
            },
          },
        })
      }
    />
  );
}

function ProfileTab({
  profile,
  onLogout,
}: {
  profile: Profile;
  onLogout: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Profile</Text>
        <Text style={styles.title}>{profile.fullName || 'Student'}</Text>
        <Text style={styles.body}>{profile.email}</Text>
        <Pressable onPress={onLogout} style={styles.button}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function LearningNavigator({ profile }: { profile: Profile }) {
  return (
    <LearningStack.Navigator screenOptions={{ headerShown: false }}>
      <LearningStack.Screen name="Course">
        {({ navigation, route }) => (
          <CourseOutline
            courseId={route.params.courseId}
            title={route.params.title}
            back={() => navigation.goBack()}
            onNavigate={() => undefined}
            openVideo={video =>
              navigation.navigate('Player', {
                courseId: route.params.courseId,
                courseTitle: route.params.title,
                video,
              })
            }
            openPdf={(title, url) =>
              navigation.navigate('Pdf', {
                courseId: route.params.courseId,
                courseTitle: route.params.title,
                title,
                url,
              })
            }
            openQuiz={quiz =>
              navigation.navigate('Quiz', {
                courseId: route.params.courseId,
                courseTitle: route.params.title,
                quiz,
              })
            }
          />
        )}
      </LearningStack.Screen>
      <LearningStack.Screen name="Player">
        {({ navigation, route }) => (
          <Player
            email={profile.email}
            screen={{ kind: 'player', ...route.params }}
            back={() => navigation.goBack()}
            onNavigate={() => undefined}
            openVideo={video =>
              navigation.replace('Player', {
                ...route.params,
                video,
              })
            }
            openPdf={(title, url) =>
              navigation.navigate('Pdf', {
                courseId: route.params.courseId,
                courseTitle: route.params.courseTitle,
                title,
                url,
              })
            }
            openQuiz={quiz =>
              navigation.navigate('Quiz', {
                courseId: route.params.courseId,
                courseTitle: route.params.courseTitle,
                quiz,
              })
            }
            openAssignment={assignment =>
              navigation.navigate('Assignment', {
                courseId: route.params.courseId,
                courseTitle: route.params.courseTitle,
                assignment,
              })
            }
            previousContent={null}
            nextContent={null}
            onOpenContent={() => undefined}
          />
        )}
      </LearningStack.Screen>
      <LearningStack.Screen name="Pdf">
        {({ navigation, route }) => (
          <PdfReader
            title={route.params.title}
            url={route.params.url}
            back={() => navigation.goBack()}
            previousContent={null}
            nextContent={null}
            onOpenContent={() => undefined}
          />
        )}
      </LearningStack.Screen>
      <LearningStack.Screen name="Quiz">
        {({ navigation, route }) => (
          <QuizScreen
            courseTitle={route.params.courseTitle}
            quiz={route.params.quiz}
            back={() => navigation.goBack()}
            onNavigate={() => undefined}
            previousContent={null}
            nextContent={null}
            onOpenContent={() => undefined}
          />
        )}
      </LearningStack.Screen>
      <LearningStack.Screen name="Assignment">
        {({ navigation, route }) => (
          <AssignmentScreen
            courseTitle={route.params.courseTitle}
            assignment={route.params.assignment}
            back={() => navigation.goBack()}
            onNavigate={() => undefined}
            previousContent={null}
            nextContent={null}
            onOpenContent={() => undefined}
          />
        )}
      </LearningStack.Screen>
    </LearningStack.Navigator>
  );
}

*/

function ProfileTab({
  profile,
  onLogout,
}: {
  profile: Profile;
  onLogout: () => void;
}) {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Profile</Text>
        <Text style={styles.title}>{profile.fullName || 'Student'}</Text>
        <Text style={styles.body}>{profile.email}</Text>
        <Pressable onPress={onLogout} style={styles.button}>
          <Text style={styles.buttonText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StudentApp({
  profile,
  onLogout,
}: {
  profile: Profile;
  onLogout: () => void;
}) {
  // ACTIVE path (FileStudentNavigator, above the legacy router below).
  // Prune offline downloads for courses that are no longer actively
  // enrolled (or whose file is missing) on launch (this component mounts
  // only when authenticated, including on session restore) and whenever
  // the app returns to the foreground.
  useEffect(() => {
    api.reconcileOffline().catch(() => undefined);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') api.reconcileOffline().catch(() => undefined);
    });
    return () => sub.remove();
  }, []);

  return (
    <FileStudentNavigator
      profile={profile}
      onLogout={onLogout}
      screens={{
        CourseList,
        DownloadsScreen,
        CourseOutline,
        Player,
        PdfReader,
        QuizScreen,
        AssignmentScreen,
        ProfileTab,
      }}
    />
  );

  /* eslint-disable no-unreachable, react-hooks/exhaustive-deps */
  /* Legacy screen-state router kept below temporarily while the navigator
   * screens are migrated. New navigation enters through StudentNavigator. */
  const [screen, setScreen] = useState<any>({ kind: 'home' });
  const [courseContents, setCourseContents] = useState<PlayerContent[]>([]);

  useEffect(() => {
    api.reconcileOffline().catch(() => undefined);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') api.reconcileOffline().catch(() => undefined);
    });
    return () => sub.remove();
  }, []);

  const activeCourseId =
    screen.kind === 'course' ||
    screen.kind === 'player' ||
    screen.kind === 'pdf' ||
    screen.kind === 'quiz' ||
    screen.kind === 'assignment'
      ? screen.courseId
      : undefined;

  useEffect(() => {
    if (!activeCourseId) {
      setCourseContents([]);
      return;
    }
    api
      .learning(activeCourseId)
      .then(course => setCourseContents(buildCourseContents(course)))
      .catch(() => setCourseContents([]));
  }, [activeCourseId]);

  const logout = async () => {
    await api.logout();
    onLogout();
  };

  const navigate = (key: NavKey) =>
    setScreen({
      kind:
        key === 'home' ? 'home' : key === 'classes' ? 'courses' : 'downloads',
    });

  const currentContentIndex =
    screen.kind === 'player'
      ? courseContents.findIndex(
          content =>
            content.kind === 'video' && content.video.id === screen.video.id,
        )
      : screen.kind === 'pdf'
      ? courseContents.findIndex(
          content => content.kind === 'pdf' && content.url === screen.url,
        )
      : screen.kind === 'quiz'
      ? courseContents.findIndex(
          content =>
            content.kind === 'quiz' && content.quiz.id === screen.quiz.id,
        )
      : screen.kind === 'assignment'
      ? courseContents.findIndex(
          content =>
            content.kind === 'assignment' &&
            content.assignment.id === screen.assignment.id,
        )
      : -1;
  const previousContent =
    currentContentIndex > 0 ? courseContents[currentContentIndex - 1] : null;
  const nextContent =
    currentContentIndex >= 0
      ? courseContents[currentContentIndex + 1] ?? null
      : null;
  const activeCourseTitle =
    screen.kind === 'course'
      ? screen.title
      : 'courseTitle' in screen
      ? screen.courseTitle ?? ''
      : '';
  const openContent = (content: PlayerContent) => {
    const key = contentKey(content);
    if (content.kind === 'video')
      setScreen({
        kind: 'player',
        courseId: activeCourseId ?? '',
        courseTitle: activeCourseTitle,
        video: content.video,
        contentKey: key,
      });
    if (content.kind === 'pdf')
      setScreen({
        kind: 'pdf',
        courseId: activeCourseId,
        courseTitle: activeCourseTitle,
        title: content.title,
        url: content.url,
        contentKey: key,
      });
    if (content.kind === 'quiz')
      setScreen({
        kind: 'quiz',
        courseId: activeCourseId,
        courseTitle: activeCourseTitle,
        quiz: content.quiz,
        contentKey: key,
      });
    if (content.kind === 'assignment')
      setScreen({
        kind: 'assignment',
        courseId: activeCourseId,
        courseTitle: activeCourseTitle,
        assignment: content.assignment,
        contentKey: key,
      });
  };
  const openAdjacent = (content: PlayerContent | null) => {
    if (content) openContent(content);
  };

  const playOffline = async (item: OfflineVideo) => {
    try {
      const dashboard = await api.dashboard();
      for (const course of dashboard.courses) {
        const learning = await api.learning(course.courseId);
        const video = learning.sections
          .flatMap((section: { modules: any[] }) =>
            section.modules.flatMap(module => module.videos),
          )
          .find((lesson: { id: string }) => lesson.id === item.lectureId);
        if (video) {
          setScreen({
            kind: 'player',
            courseId: course.courseId,
            courseTitle: course.courseTitle,
            video,
            fromDownloads: true,
          });
          return;
        }
      }
    } catch {
      // No connection: fall through and play the saved copy directly.
    }
    setScreen({
      kind: 'player',
      courseId: '',
      courseTitle: '',
      video: { id: item.lectureId, title: item.title } as LearningVideo,
      fromDownloads: true,
    });
  };

  if (screen.kind === 'course') {
    return (
      <CourseOutline
        courseId={screen.courseId}
        title={screen.title}
        back={() => setScreen({ kind: 'courses' })}
        onNavigate={navigate}
        openVideo={video =>
          setScreen({
            kind: 'player',
            courseId: screen.courseId,
            courseTitle: screen.title,
            video,
            contentKey: `video:${video.id}`,
          })
        }
        openPdf={(title, url) =>
          setScreen({
            kind: 'pdf',
            title,
            url,
            courseId: screen.courseId,
            courseTitle: screen.title,
            contentKey: `pdf:${url}`,
          })
        }
        openQuiz={quiz =>
          setScreen({
            kind: 'quiz',
            courseTitle: screen.title,
            courseId: screen.courseId,
            quiz,
            contentKey: `quiz:${quiz.id}`,
          })
        }
      />
    );
  }

  if (screen.kind === 'player') {
    return (
      <Player
        key={screen.video.id}
        email={profile.email}
        screen={screen}
        onNavigate={navigate}
        back={() =>
          screen.fromDownloads
            ? setScreen({ kind: 'downloads' })
            : setScreen({
                kind: 'course',
                courseId: screen.courseId,
                title: screen.courseTitle,
              })
        }
        openVideo={video =>
          setScreen({
            kind: 'player',
            courseId: screen.courseId,
            courseTitle: screen.courseTitle,
            video,
          })
        }
        openPdf={(title, url) =>
          setScreen({
            kind: 'pdf',
            title,
            url,
            courseId: screen.courseId,
            courseTitle: screen.courseTitle,
            contentKey: `pdf:${url}`,
          })
        }
        openQuiz={quiz =>
          setScreen({
            kind: 'quiz',
            courseTitle: screen.courseTitle,
            courseId: screen.courseId,
            quiz,
            contentKey: `quiz:${quiz.id}`,
          })
        }
        openAssignment={assignment =>
          setScreen({
            kind: 'assignment',
            courseTitle: screen.courseTitle,
            courseId: screen.courseId,
            assignment,
          })
        }
        previousContent={previousContent}
        nextContent={nextContent}
        onOpenContent={openContent}
      />
    );
  }

  if (screen.kind === 'pdf') {
    return (
      <PdfReader
        title={screen.title}
        url={screen.url}
        back={() =>
          screen.courseId
            ? setScreen({
                kind: 'course',
                courseId: screen.courseId,
                title: screen.courseTitle ?? '',
              })
            : setScreen({ kind: 'courses' })
        }
        previousContent={previousContent}
        nextContent={nextContent}
        onOpenContent={openAdjacent}
      />
    );
  }

  if (screen.kind === 'quiz') {
    return (
      <QuizScreen
        courseTitle={screen.courseTitle}
        quiz={screen.quiz}
        back={() =>
          screen.courseId
            ? setScreen({
                kind: 'course',
                courseId: screen.courseId,
                title: screen.courseTitle,
              })
            : setScreen({ kind: 'courses' })
        }
        onNavigate={navigate}
        previousContent={previousContent}
        nextContent={nextContent}
        onOpenContent={openAdjacent}
      />
    );
  }

  if (screen.kind === 'assignment') {
    return (
      <AssignmentScreen
        courseTitle={screen.courseTitle}
        assignment={screen.assignment}
        back={() =>
          screen.courseId
            ? setScreen({
                kind: 'course',
                courseId: screen.courseId,
                title: screen.courseTitle,
              })
            : setScreen({ kind: 'courses' })
        }
        onNavigate={navigate}
        previousContent={previousContent}
        nextContent={nextContent}
        onOpenContent={openAdjacent}
      />
    );
  }

  if (screen.kind === 'downloads') {
    return <DownloadsScreen onNavigate={navigate} onPlay={playOffline} />;
  }

  return (
    <CourseList
      profile={profile}
      mode={screen.kind === 'home' ? 'home' : 'classes'}
      openCourse={(courseId, title) =>
        setScreen({ kind: 'course', courseId, title })
      }
      onLogout={logout}
      onNavigate={navigate}
    />
  );
}
/* eslint-enable no-unreachable */

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

function CourseList({
  profile,
  mode,
  openCourse,
  onLogout,
  onNavigate,
}: {
  profile: Profile;
  mode: 'home' | 'classes';
  openCourse: (id: string, title: string) => void;
  onLogout: () => void;
  onNavigate: (key: NavKey) => void;
}) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [offline, setOffline] = useState<OfflineVideo[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    Promise.all([api.dashboard(), api.offlineVideos()])
      .then(([data, saved]) => {
        setDashboard(data);
        setOffline(saved);
      })
      .catch(e => Alert.alert('Could not load courses', e.message))
      .finally(() => setBusy(false));
  }, []);

  const isHome = mode === 'home';
  const firstName = profile.fullName ? profile.fullName.split(' ')[0] : '';
  const initial = (profile.fullName || profile.email || 'S')
    .charAt(0)
    .toUpperCase();
  const activeCount = dashboard?.activeCourses ?? 0;
  const courses = dashboard?.courses ?? [];
  const featured =
    courses.find(
      course =>
        course.completionPercentage > 0 && course.completionPercentage < 100,
    ) ?? courses[0];
  const shown = isHome ? (featured ? [featured] : []) : courses;

  const statusOf = (percent: number) =>
    percent >= 100 ? 'Completed' : percent > 0 ? 'In progress' : 'Not started';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isHome ? (
          <>
            <View style={styles.rowBetween}>
              <View style={styles.homeIdentity}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.eyebrow}>Home</Text>
                  <Text numberOfLines={1} style={styles.homeTitle}>
                    {firstName ? `Welcome, ${firstName}` : 'Welcome'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={onLogout}
                style={styles.headerIcon}
                accessibilityLabel="Sign out"
              >
                <LogOut size={18} color={colors.brass} />
              </Pressable>
            </View>

            <Text style={[styles.body, styles.homeIntro]}>
              Your browser enrollments, ready when you are.
            </Text>

            {featured ? (
              <Pressable
                onPress={() => openCourse(featured.courseId, featured.courseTitle)}
                style={({ pressed }) => [styles.homeHeroCard, pressed && styles.cardPressed]}
              >
                <Text style={styles.homeHeroEyebrow}>Pick up where you left off</Text>
                <Text numberOfLines={2} style={styles.homeHeroTitle}>
                  {featured.courseTitle}
                </Text>
                <Text style={[styles.body, styles.homeHeroBody]}>
                  {featured.completionPercentage}% complete · ready for your next lesson
                </Text>
                <View style={[styles.progressTrack, styles.courseProgress]}>
                  <View
                    style={[styles.progressFill, { width: `${featured.completionPercentage}%` }]}
                  />
                </View>
                <View style={styles.homeHeroFooter}>
                  <Text style={styles.homeHeroPercent}>
                    {featured.completionPercentage}% complete
                  </Text>
                  <Text style={styles.homeHeroAction}>Continue learning →</Text>
                </View>
              </Pressable>
            ) : null}

            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <BookOpen size={16} color={colors.brass} />
                </View>
                <Text style={styles.statValue}>{activeCount}</Text>
                <Text style={styles.statLabel}>
                  {activeCount === 1 ? 'Active course' : 'Active courses'}
                </Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Download size={16} color={colors.brass} />
                </View>
                <Text style={styles.statValue}>{offline.length}</Text>
                <Text style={styles.statLabel}>
                  {offline.length === 1 ? 'Video offline' : 'Videos offline'}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Continue learning</Text>
          </>
        ) : (
          <>
            <Text style={styles.eyebrow}>Your courses</Text>
            <Text style={styles.title}>My classes</Text>
            <Text style={[styles.body, styles.homeIntro]}>
              {plural(courses.length, 'course')} enrolled.
            </Text>
          </>
        )}

        {busy ? (
          <ActivityIndicator
            color={colors.brass}
            style={styles.loadingCourses}
          />
        ) : !isHome && shown.length ? (
          shown.map(course => {
            const percent = course.completionPercentage;
            return (
              <Pressable
                key={course.courseId}
                onPress={() => openCourse(course.courseId, course.courseTitle)}
                style={({ pressed }) => [
                  styles.courseCard,
                  pressed && styles.cardPressed,
                ]}
              >
                <View style={styles.courseTop}>
                  <View style={styles.courseIcon}>
                    <GraduationCap size={22} color={colors.brass} />
                  </View>
                  <View style={styles.courseCopy}>
                    <Text numberOfLines={2} style={styles.heading}>
                      {course.courseTitle}
                    </Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{statusOf(percent)}</Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.progressTrack, styles.courseProgress]}>
                  <View
                    style={[styles.progressFill, { width: `${percent}%` }]}
                  />
                </View>

                <View style={styles.courseFooter}>
                  <Text style={styles.body}>{percent}% complete</Text>
                  <View style={styles.ctaRow}>
                    <Text style={styles.ctaText}>
                      {percent > 0 ? 'Continue' : 'Start learning'}
                    </Text>
                    <ChevronRight size={16} color={colors.brass} />
                  </View>
                </View>
              </Pressable>
            );
          })
        ) : !isHome ? (
          <View style={styles.emptyCard}>
            <View style={styles.courseIcon}>
              <GraduationCap size={22} color={colors.brass} />
            </View>
            <Text style={[styles.heading, styles.emptyTitle]}>
              No active enrollment
            </Text>
            <Text style={[styles.body, styles.emptyBody]}>
              Enroll in a course from the BanglaBox website first.
            </Text>
          </View>
        ) : null}

        {isHome && courses.length > 1 ? (
          <Pressable
            onPress={() => onNavigate('classes')}
            style={styles.seeAllRow}
          >
            <Text style={styles.ctaText}>See all {courses.length} classes</Text>
            <ChevronRight size={16} color={colors.brass} />
          </Pressable>
        ) : null}
      </ScrollView>

    </SafeAreaView>
  );
}

function DownloadsScreen({
  onNavigate: _onNavigate,
  onPlay,
}: {
  onNavigate: (key: NavKey) => void;
  onPlay: (item: OfflineVideo) => void;
}) {
  const [items, setItems] = useState<OfflineVideo[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    api
      .offlineVideos()
      .then(setItems)
      .catch(() => undefined)
      .finally(() => setBusy(false));
  }, []);

  const remove = (item: OfflineVideo) => {
    Alert.alert('Delete download?', `Remove ${item.title} from this phone?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          api
            .removeOffline(item.lectureId)
            .then(setItems)
            .catch(() =>
              Alert.alert(
                'Delete failed',
                'The download could not be removed.',
              ),
            ),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>Offline library</Text>
        <Text style={styles.title}>Downloads</Text>
        <Text style={[styles.body, styles.homeIntro]}>
          {plural(items.length, 'video')} saved on this phone.
        </Text>

        {busy ? (
          <ActivityIndicator
            color={colors.brass}
            style={styles.loadingCourses}
          />
        ) : items.length ? (
          items.map(item => (
            <View key={item.lectureId} style={styles.upNextRow}>
              <View style={styles.upNextIcon}>
                <Play size={14} color={colors.brass} />
              </View>
              <View style={styles.contentText}>
                <Text
                  numberOfLines={1}
                  style={[styles.body, styles.contentLabel]}
                >
                  {item.title}
                </Text>
                <View style={styles.contentSubtitle}>
                  <Check size={13} color={colors.teal} />
                  <Text style={styles.offlineLabel}>Offline</Text>
                </View>
              </View>
              <View style={styles.downloadActions}>
                <Pressable
                  onPress={() => onPlay(item)}
                  style={styles.downloadAction}
                  accessibilityLabel="Play downloaded video"
                >
                  <ChevronRight size={16} color={colors.brass} />
                </Pressable>
                <Pressable
                  onPress={() => remove(item)}
                  style={styles.downloadAction}
                  accessibilityLabel="Delete downloaded video"
                >
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.courseIcon}>
              <Download size={22} color={colors.brass} />
            </View>
            <Text style={[styles.heading, styles.emptyTitle]}>
              No downloads yet
            </Text>
            <Text style={[styles.body, styles.emptyBody]}>
              Download a video to watch it without internet.
            </Text>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

/* Legacy custom tab bar replaced by React Navigation bottom tabs.
function BottomNav({
  active,
  onPress,
}: {
  active: NavKey;
  onPress: (key: NavKey) => void;
}) {
  const insets = useSafeAreaInsets();
  const items: Array<[NavKey, string]> = [
    ['home', 'Home'],
    ['classes', 'My classes'],
    ['download', 'Download'],
  ];

  return (
    <View
      style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      {items.map(([key, label]) => {
        const Icon =
          key === 'home' ? Home : key === 'classes' ? BookOpen : Download;
        const isActive = active === key;
        return (
          <Pressable
            key={key}
            style={styles.bottomNavItem}
            onPress={() => onPress(key)}
          >
            <Icon
              size={19}
              color={isActive ? colors.brass : colors.muted}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
            <Text
              style={[
                styles.bottomNavLabel,
                isActive && styles.bottomNavLabelActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
*/

/* ------------------------------------------------------------------ */
/* Course outline                                                      */
/* ------------------------------------------------------------------ */

function CourseOutline({
  courseId,
  title,
  back,
  onNavigate: _onNavigate,
  openVideo,
  openPdf,
  openQuiz,
}: {
  courseId: string;
  title: string;
  back: () => void;
  onNavigate: (key: NavKey) => void;
  openVideo: (video: LearningVideo) => void;
  openPdf: (title: string, url: string) => void;
  openQuiz: (quiz: Quiz) => void;
}) {
  const [data, setData] = useState<LearningCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [offline, setOffline] = useState<OfflineVideo[]>([]);
  const [query, setQuery] = useState('');
  const [showDownloads, setShowDownloads] = useState(false);
  const [offlineExpanded, setOfflineExpanded] = useState(true);
  const [autoDownload, setAutoDownload] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.learning(courseId),
      api.offlineVideos(),
      api.getAutoDownload(),
    ])
      .then(async ([learning, saved, auto]) => {
        setData(learning);
        setOffline(saved);
        setAutoDownload(auto);
        if (learning.sections[0]) {
          setOpenSections({ [learning.sections[0].id]: true });
        }

        const savedVideo = learning.sections
          .flatMap(section =>
            section.modules.flatMap(module =>
              module.videos.map(video => ({ section, module, video })),
            ),
          )
          .find(item =>
            Boolean(
              item.video.progress &&
                item.video.progress.positionSeconds > 0 &&
                !item.video.progress.isCompleted,
            ),
          );
        if (savedVideo) {
          setOpenSections({ [savedVideo.section.id]: true });
          setOpenModules({ [savedVideo.module.id]: true });
        }

        if (auto) {
          const existing = new Set(saved.map(item => item.lectureId));
          const fresh = learning.sections
            .flatMap((section: LearningCourse['sections'][number]) =>
              section.modules.flatMap(
                (module: LearningModule) => module.videos,
              ),
            )
            .filter((video: LearningVideo) => !existing.has(video.id));

          for (const video of fresh) {
            await api
              .downloadVideo(courseId, video, progress =>
                setDownloadProgress(current => ({
                  ...current,
                  [video.id]: progress,
                })),
              )
              .catch(() => undefined);
          }
          setOffline(await api.offlineVideos());
        }
      })
      .catch(e =>
        setError(
          e instanceof Error ? e.message : 'This course could not be loaded.',
        ),
      )
      .finally(() => setLoading(false));
  }, [courseId, reloadKey]);

  const downloadModule = async (module: LearningModule) => {
    const pending = module.videos.filter(
      video => !offline.some(item => item.lectureId === video.id),
    );

    if (!pending.length) {
      Alert.alert('Already downloaded', 'This module is available offline.');
      return;
    }

    for (const video of pending) {
      await api
        .downloadVideo(courseId, video, progress =>
          setDownloadProgress(current => ({
            ...current,
            [video.id]: progress,
          })),
        )
        .catch(e => Alert.alert('Download failed', e.message));
    }

    setOffline(await api.offlineVideos());
  };

  const toggleAutoDownload = async () => {
    const next = !autoDownload;
    setAutoDownload(next);
    await api.setAutoDownload(next);
  };

  const removeOffline = (item: OfflineVideo) => {
    Alert.alert('Delete download?', `Remove ${item.title} from this phone?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          api
            .removeOffline(item.lectureId)
            .then(setOffline)
            .catch(() =>
              Alert.alert(
                'Delete failed',
                'The download could not be removed.',
              ),
            ),
      },
    ]);
  };

  const videos = useMemo(
    () =>
      data?.sections.flatMap(section =>
        section.modules.flatMap(module => module.videos),
      ) ?? [],
    [data],
  );
  const totalDuration = useMemo(
    () => videos.reduce((sum, video) => sum + (video.durationSeconds ?? 0), 0),
    [videos],
  );
  const needle = query.trim().toLowerCase();
  const visibleSections = useMemo(
    () =>
      data?.sections.filter(
        section =>
          !needle ||
          section.title.toLowerCase().includes(needle) ||
          section.modules.some(
            module =>
              module.title.toLowerCase().includes(needle) ||
              module.videos.some(video =>
                video.title.toLowerCase().includes(needle),
              ),
          ),
      ) ?? [],
    [data, needle],
  );
  const completion = data?.course.completionPercentage ?? 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.outlineContent}>
        <View style={styles.outlineHandle}>
          <View style={styles.outlineHandleBar} />
        </View>

        <View style={styles.outlineHeader}>
          <View style={styles.outlineHeaderCopy}>
            <Text style={styles.title}>All milestones</Text>
            <Text numberOfLines={1} style={styles.body}>
              {title}
            </Text>
          </View>
          <View style={styles.rowGap}>
            <Pressable
              onPress={() => setShowDownloads(value => !value)}
              style={styles.headerIcon}
            >
              <Download size={18} color={colors.brass} />
            </Pressable>
            <Pressable onPress={back} style={styles.headerIcon}>
              <X size={21} color={colors.text} strokeWidth={2} />
            </Pressable>
          </View>
        </View>

        {showDownloads ? (
          <View style={[styles.card, styles.downloadPanel]}>
            <Pressable
              onPress={() => setOfflineExpanded(value => !value)}
              style={styles.offlineHeader}
            >
              <View style={styles.offlineHeaderCopy}>
                <Text style={styles.heading}>Offline library</Text>
                <Text style={styles.body}>
                  {plural(offline.length, 'video')} saved
                </Text>
              </View>
              {offlineExpanded ? (
                <ChevronUp size={20} color={colors.brass} />
              ) : (
                <ChevronDown size={20} color={colors.muted} />
              )}
            </Pressable>

            {offlineExpanded ? (
              <>
                <View style={styles.offlineSettingRow}>
                  <Text style={styles.body}>Auto-download new lessons</Text>
                  <Switch
                    value={autoDownload}
                    onValueChange={toggleAutoDownload}
                    trackColor={{ false: colors.border, true: colors.brass }}
                    thumbColor={colors.text}
                  />
                </View>

                {offline.length ? (
                  offline.map(item => (
                    <View key={item.lectureId} style={styles.downloadRow}>
                      <Check size={16} color={colors.teal} />
                      <Text
                        numberOfLines={1}
                        style={[styles.body, styles.contentText]}
                      >
                        {item.title}
                      </Text>
                      <Pressable
                        onPress={() => removeOffline(item)}
                        style={styles.downloadAction}
                        accessibilityLabel="Delete downloaded video"
                      >
                        <Trash2 size={16} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))
                ) : (
                  <View style={styles.offlineEmpty}>
                    <Download size={22} color={colors.muted} />
                    <Text style={styles.body}>
                      Download a video to watch it without internet.
                    </Text>
                  </View>
                )}

                {Object.entries(downloadProgress)
                  .filter(([, progress]) => progress > 0 && progress < 1)
                  .map(([lectureId, progress]) => {
                    const lesson = videos.find(video => video.id === lectureId);
                    return (
                      <View key={lectureId} style={styles.offlineProgressRow}>
                        <View style={styles.offlineProgressHeader}>
                          <Text
                            numberOfLines={1}
                            style={[styles.body, styles.contentText]}
                          >
                            {lesson?.title ?? 'Lesson'}
                          </Text>
                          <Text style={styles.contentSubtitleText}>
                            {Math.round(progress * 100)}%
                          </Text>
                        </View>
                        <View style={styles.offlineProgressTrack}>
                          <View
                            style={[
                              styles.offlineProgressFill,
                              { width: `${Math.round(progress * 100)}%` },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
              </>
            ) : null}
          </View>
        ) : null}

        <View style={styles.searchRow}>
          <Search size={18} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search lessons"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.searchInput, styles.searchField]}
          />
        </View>

        <View style={styles.overallProgress}>
          <View style={styles.progressHeader}>
            <Text style={styles.heading}>{completion}% complete</Text>
            <Text style={styles.body}>
              {plural(videos.length, 'video')} • {formatTotal(totalDuration)}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completion}%` }]} />
          </View>
        </View>

        {loading ? (
          <LoadingState label="Loading course outline" />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => setReloadKey(value => value + 1)}
          />
        ) : !data ? (
          <ErrorState
            message="This course is not available right now."
            onRetry={() => setReloadKey(value => value + 1)}
          />
        ) : visibleSections.length ? (
          visibleSections.map(section => {
            const sectionVideos = section.modules.flatMap(
              module => module.videos,
            );
            const sectionDuration = sectionVideos.reduce(
              (sum, video) => sum + (video.durationSeconds ?? 0),
              0,
            );

            return (
              <View key={section.id} style={styles.sectionSpacing}>
                <Pressable
                  style={styles.sectionHeader}
                  onPress={() =>
                    setOpenSections(current => ({
                      ...current,
                      [section.id]: !current[section.id],
                    }))
                  }
                >
                  <View style={styles.milestoneRow}>
                    <View style={styles.milestoneTile}>
                      <Text style={styles.milestoneTileText}>
                        {section.position}
                      </Text>
                    </View>
                    <View style={styles.milestoneCopy}>
                      <Text style={styles.heading}>{section.title}</Text>
                      <Text style={styles.body}>
                        {plural(section.modules.length, 'module')} •{' '}
                        {plural(sectionVideos.length, 'video')} •{' '}
                        {formatTotal(sectionDuration)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sectionChevron}>
                    {openSections[section.id] ? (
                      <ChevronUp size={21} color={colors.brass} />
                    ) : (
                      <ChevronDown size={21} color={colors.muted} />
                    )}
                  </View>
                </Pressable>

                {openSections[section.id]
                  ? section.modules.map((module, index) => (
                      <ModuleCard
                        key={module.id}
                        module={module}
                        index={index}
                        open={Boolean(openModules[module.id])}
                        toggle={() =>
                          setOpenModules(current => ({
                            ...current,
                            [module.id]: !current[module.id],
                          }))
                        }
                        offline={offline}
                        openVideo={openVideo}
                        openPdf={openPdf}
                        openQuiz={openQuiz}
                        onDownload={() => downloadModule(module)}
                      />
                    ))
                  : null}
              </View>
            );
          })
        ) : (
          <View style={[styles.card, styles.emptyState]}>
            <Text style={styles.heading}>No milestones found</Text>
            <Text style={styles.body}>Try a different search.</Text>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const ModuleCard = memo(
  function ModuleCard({
    module,
    index,
    open,
    toggle,
    offline,
    openVideo,
    openPdf,
    openQuiz,
    onDownload,
  }: {
    module: LearningModule;
    index: number;
    open: boolean;
    toggle: () => void;
    offline: OfflineVideo[];
    openVideo: (video: LearningVideo) => void;
    openPdf: (title: string, url: string) => void;
    openQuiz: (quiz: Quiz) => void;
    onDownload: () => void;
  }) {
    const moduleQuizIsAttachedToVideo =
      module.quiz &&
      module.videos.some(video => video.quiz?.id === module.quiz?.id);

    return (
      <View style={[styles.moduleCard, styles.moduleCardSpacing]}>
        <Pressable onPress={toggle} style={styles.moduleHeader}>
          <View style={styles.moduleCopy}>
            <Text style={styles.eyebrow}>Module {index + 1}</Text>
            <Text style={styles.heading}>{module.title}</Text>
            <View style={styles.moduleChips}>
              <Text style={styles.contentSubtitleText}>
                {plural(module.videos.length, 'video')}
              </Text>
              {module.pdfUrl ? (
                <View style={styles.moduleChip}>
                  <Text style={styles.moduleChipText}>PDF</Text>
                </View>
              ) : null}
              {module.quiz ? (
                <View style={styles.moduleChip}>
                  <Text style={styles.moduleChipText}>Quiz</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.rowGap}>
            <Pressable onPress={onDownload} style={styles.headerIcon}>
              <Download size={16} color={colors.brass} />
            </Pressable>
            {open ? (
              <ChevronUp size={19} color={colors.brass} />
            ) : (
              <ChevronDown size={19} color={colors.muted} />
            )}
          </View>
        </Pressable>

        {open ? (
          <View style={styles.moduleExpanded}>
            {orderedModuleContentTypes(module).map(type => {
              if (type === 'pdf' && module.pdfUrl) {
                return (
                  <ContentButton
                    key="module-pdf"
                    label="Read module PDF"
                    type="PDF"
                    onPress={() => openPdf(`${module.title} • PDF`, module.pdfUrl!)}
                  />
                );
              }

              if (type === 'video') {
                return [...module.videos]
                  .sort(
                    (left, right) =>
                      ((left as LearningVideo & { position?: number }).position ?? 0) -
                      ((right as LearningVideo & { position?: number }).position ?? 0),
                  )
                  .map(video => {
                    const isOffline = offline.some(
                      item => item.lectureId === video.id,
                    );
                    return (
                      <View key={video.id} style={styles.contentItemSpacing}>
                        <ContentButton
                          label={video.title}
                          type="Video"
                          subtitle={formatDuration(video.durationSeconds ?? 0)}
                          offline={isOffline}
                          onPress={() => openVideo(video)}
                          completed={video.progress?.isCompleted}
                        />
                        {video.pdfUrl ? (
                          <ContentButton
                            label="Read lecture PDF"
                            type="PDF"
                            onPress={() =>
                              openPdf(`${video.title} • PDF`, video.pdfUrl!)
                            }
                          />
                        ) : null}
                        {video.quiz ? (
                          <ContentButton
                            label={video.quiz.title}
                            type="Quiz"
                            onPress={() => openQuiz(video.quiz!)}
                          />
                        ) : null}
                      </View>
                    );
                  });
              }

              if (type === 'quiz' && module.quiz && !moduleQuizIsAttachedToVideo) {
                return (
                  <ContentButton
                    key="module-quiz"
                    label={module.quiz.title}
                    type="Quiz"
                    onPress={() => openQuiz(module.quiz!)}
                  />
                );
              }

              return null;
            })}
          </View>
        ) : null}
      </View>
    );
  },
  (previous, next) =>
    previous.module === next.module &&
    previous.index === next.index &&
    previous.open === next.open &&
    previous.offline === next.offline,
);

const ContentButton = memo(
  function ContentButton({
    label,
    type,
    subtitle,
    offline,
    onPress,
    completed,
  }: {
    label: string;
    type: 'Video' | 'PDF' | 'Quiz';
    subtitle?: string;
    offline?: boolean;
    onPress: () => void;
    completed?: boolean;
  }) {
    const isVideo = type === 'Video';
    const Icon = isVideo ? Play : type === 'Quiz' ? CircleHelp : FileText;
    const iconStyle = isVideo
      ? styles.contentIconVideo
      : type === 'Quiz'
      ? styles.contentIconQuiz
      : styles.contentIconPdf;
    const iconColor = isVideo ? colors.brass : colors.text;

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.contentRow,
          pressed && styles.contentRowPressed,
        ]}
      >
        <View style={[styles.contentIcon, iconStyle]}>
          <Icon size={16} color={iconColor} strokeWidth={2} />
        </View>

        <View style={styles.contentText}>
          <Text numberOfLines={1} style={[styles.body, styles.contentLabel]}>
            {label}
          </Text>
          {isVideo ? (
            <View style={styles.contentSubtitle}>
              <Text style={styles.contentSubtitleText}>
                {subtitle ?? '0:00'}
              </Text>
              {offline ? (
                <>
                  <Check size={13} color={colors.teal} />
                  <Text style={styles.offlineLabel}>Offline</Text>
                </>
              ) : null}
            </View>
          ) : null}
        </View>

        {completed ? (
          <Text style={styles.completedText}>Done</Text>
        ) : (
          <ChevronRight size={16} color={colors.brass} />
        )}
      </Pressable>
    );
  },
  (previous, next) =>
    previous.label === next.label &&
    previous.type === next.type &&
    previous.subtitle === next.subtitle &&
    previous.offline === next.offline &&
    previous.completed === next.completed,
);

/* ------------------------------------------------------------------ */
/* Player                                                              */
/* ------------------------------------------------------------------ */

function SkipButton({
  direction,
  onPress,
}: {
  direction: 'back' | 'forward';
  onPress: () => void;
}) {
  const Icon = direction === 'back' ? RotateCcw : RotateCw;
  return (
    <Pressable onPress={onPress} style={styles.playerJumpButton}>
      <Icon size={26} color={colors.text} />
      <Text style={styles.skipLabel}>10</Text>
    </Pressable>
  );
}

type PlayerContent =
  | { kind: 'video'; title: string; video: LearningVideo }
  | { kind: 'pdf'; title: string; url: string }
  | { kind: 'quiz'; title: string; quiz: Quiz }
  | { kind: 'assignment'; title: string; assignment: LearningAssignment };

type OrderedModule = LearningModule & {
  position?: number;
  contentTypes?: Array<'video' | 'pdf' | 'quiz' | 'assignment'>;
  assignment?: LearningAssignment | null;
};

type OrderedSection = {
  position?: number;
  modules: OrderedModule[];
  quiz?: Quiz | null;
  assignment?: LearningAssignment | null;
};

function contentKey(content: PlayerContent) {
  if (content.kind === 'video') return `video:${content.video.id}`;
  if (content.kind === 'pdf') return `pdf:${content.url}`;
  if (content.kind === 'quiz') return `quiz:${content.quiz.id}`;
  return `assignment:${content.assignment.id}`;
}

type ModuleContentType = 'video' | 'pdf' | 'quiz' | 'assignment';

function orderedModuleContentTypes(module: {
  contentTypes?: ModuleContentType[];
  videos: LearningVideo[];
  pdfUrl: string | null;
  slidesUrl: string | null;
  quiz?: Quiz | null;
  assignment?: LearningAssignment | null;
}): ModuleContentType[] {
  const actualTypes: ModuleContentType[] = [];
  if (module.videos.length) actualTypes.push('video');
  if (module.pdfUrl || module.slidesUrl) actualTypes.push('pdf');
  if (module.quiz) actualTypes.push('quiz');
  if (module.assignment) actualTypes.push('assignment');
  const declaredTypes = module.contentTypes ?? [];

  // Keep the instructor's declared order, but never hide content just because
  // an older API response has an incomplete contentTypes array.
  return [
    ...declaredTypes,
    ...actualTypes.filter(type => !declaredTypes.includes(type)),
  ];
}

function buildCourseContents(course: LearningCourse): PlayerContent[] {
  const contents: PlayerContent[] = [];
  const sections = [...(course.sections as OrderedSection[])].sort(
    (left, right) => (left.position ?? 0) - (right.position ?? 0),
  );

  sections.forEach(section => {
    const modules = [...section.modules].sort(
      (left, right) => (left.position ?? 0) - (right.position ?? 0),
    );

    modules.forEach(module => {
      const types = orderedModuleContentTypes(module);
      let videoIndex = 0;
      let hasPdf = false;
      let hasQuiz = false;
      let hasAssignment = false;
      const videos = [...module.videos].sort(
        (left, right) =>
          ((left as LearningVideo & { position?: number }).position ?? 0) -
          ((right as LearningVideo & { position?: number }).position ?? 0),
      );

      types.forEach(type => {
        if (type === 'video') {
          const video = videos[videoIndex++];
          if (video)
            contents.push({ kind: 'video', title: video.title, video });
        } else if (
          type === 'pdf' &&
          !hasPdf &&
          (module.pdfUrl || module.slidesUrl)
        ) {
          hasPdf = true;
          contents.push({
            kind: 'pdf',
            title: `Read ${module.title} PDF`,
            url: module.pdfUrl ?? module.slidesUrl!,
          });
        } else if (type === 'quiz' && !hasQuiz && module.quiz) {
          hasQuiz = true;
          contents.push({
            kind: 'quiz',
            title: module.quiz.title,
            quiz: module.quiz,
          });
        } else if (
          type === 'assignment' &&
          !hasAssignment &&
          module.assignment
        ) {
          hasAssignment = true;
          contents.push({
            kind: 'assignment',
            title: module.assignment.title,
            assignment: module.assignment,
          });
        }
      });
    });

    if (section.quiz)
      contents.push({
        kind: 'quiz',
        title: section.quiz.title,
        quiz: section.quiz,
      });
    if (section.assignment)
      contents.push({
        kind: 'assignment',
        title: section.assignment.title,
        assignment: section.assignment,
      });
  });

  return contents;
}

function useAdjacentCourseContent(
  courseId: string | undefined,
  current: PlayerContent,
) {
  const [contents, setContents] = useState<PlayerContent[]>([]);

  useEffect(() => {
    if (!courseId) {
      setContents([]);
      return;
    }

    let active = true;
    api
      .learning(courseId)
      .then(course => {
        if (active) setContents(buildCourseContents(course));
      })
      .catch(() => {
        if (active) setContents([]);
      });

    return () => {
      active = false;
    };
  }, [courseId]);

  const index = contents.findIndex(content => contentKey(content) === contentKey(current));
  return {
    previous: index > 0 ? contents[index - 1] : null,
    next: index >= 0 ? contents[index + 1] ?? null : null,
  };
}

function Player({
  email,
  screen,
  back,
  onNavigate: _onNavigate,
  openVideo,
  openPdf,
  openQuiz,
  openAssignment,
  previousContent,
  nextContent,
  onOpenContent,
}: {
  email: string;
  screen: Extract<Screen, { kind: 'player' }>;
  back: () => void;
  onNavigate: (key: NavKey) => void;
  openVideo: (video: LearningVideo) => void;
  openPdf: (title: string, url: string) => void;
  openQuiz: (quiz: Quiz) => void;
  openAssignment: (assignment: LearningAssignment) => void;
  previousContent: PlayerContent | null;
  nextContent: PlayerContent | null;
  onOpenContent: (content: PlayerContent) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const videoRef = useRef<any>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef(0);
  const lastSaved = useRef(screen.video.progress?.positionSeconds ?? 0);
  const scrubbing = useRef(false);
  const seekRef = useRef<any>(null);
  const seekLeft = useRef(0);
  const seekWidth = useRef(0);
  const durationRef = useRef(screen.video.durationSeconds ?? 0);
  const positionRef = useRef(screen.video.progress?.positionSeconds ?? 0);
  const resumePositionRef = useRef(screen.video.progress?.positionSeconds ?? 0);
  const resumeAllowedRef = useRef(true);

  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState<OfflineVideo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadPaused, setDownloadPaused] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const downloadControls = useRef<DownloadControls | null>(null);
  const [position, setPosition] = useState(
    screen.video.progress?.positionSeconds ?? 0,
  );
  const [duration, setDuration] = useState(screen.video.durationSeconds ?? 0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [rate, setRate] = useState(1);
  const [watermark, setWatermark] = useState({ top: 20, left: 10 });
  const [courseContents, setCourseContents] = useState<PlayerContent[]>([]);

  durationRef.current = duration;

  useEffect(() => {
    const loadOnline = () =>
      api
        .videoUrl(screen.video.id)
        .then(result => setUrl(result.url))
        .catch(e => Alert.alert('Video unavailable', e.message));

    api
      .offlineVideos()
      .then(items => {
        const item = items.find(
          savedVideo => savedVideo.lectureId === screen.video.id,
        );
        if (item) {
          setSaved(item);
          setUrl(item.path);
          return;
        }
        loadOnline();
      })
      .catch(loadOnline);

    api
      .learning(screen.courseId)
      .then(course => {
        const contents: PlayerContent[] = [];
        const sections = [...(course.sections as OrderedSection[])].sort(
          (left, right) => (left.position ?? 0) - (right.position ?? 0),
        );

        sections.forEach(section => {
          const modules = [...section.modules].sort(
            (left, right) => (left.position ?? 0) - (right.position ?? 0),
          );

          modules.forEach(module => {
            const types = orderedModuleContentTypes(module);
            let videoIndex = 0;
            let hasPdf = false;
            let hasQuiz = false;
            let hasAssignment = false;

            types.forEach(type => {
              if (type === 'video') {
                const video = [...module.videos].sort(
                  (left, right) =>
                    ((left as LearningVideo & { position?: number }).position ??
                      0) -
                    ((right as LearningVideo & { position?: number })
                      .position ?? 0),
                )[videoIndex++];
                if (!video) return;
                contents.push({ kind: 'video', title: video.title, video });
              } else if (
                type === 'pdf' &&
                !hasPdf &&
                (module.pdfUrl || module.slidesUrl)
              ) {
                hasPdf = true;
                contents.push({
                  kind: 'pdf',
                  title: `Read ${module.title} PDF`,
                  url: module.pdfUrl ?? module.slidesUrl!,
                });
              } else if (type === 'quiz' && !hasQuiz && module.quiz) {
                hasQuiz = true;
                contents.push({
                  kind: 'quiz',
                  title: module.quiz.title,
                  quiz: module.quiz,
                });
              } else if (
                type === 'assignment' &&
                !hasAssignment &&
                module.assignment
              ) {
                hasAssignment = true;
                contents.push({
                  kind: 'assignment',
                  title: module.assignment.title,
                  assignment: module.assignment,
                });
              }
            });
          });

          if (section.quiz)
            contents.push({
              kind: 'quiz',
              title: section.quiz.title,
              quiz: section.quiz,
            });
          if (section.assignment)
            contents.push({
              kind: 'assignment',
              title: section.assignment.title,
              assignment: section.assignment,
            });
        });
        setCourseContents(contents);
      })
      .catch(() => undefined);

    const timer = setInterval(
      () =>
        setWatermark({
          top: 10 + Math.random() * 68,
          left: 5 + Math.random() * 70,
        }),
      10000,
    );

    return () => {
      clearInterval(timer);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Orientation.unlockAllOrientations();
      Orientation.lockToPortrait();
    };
  }, [screen.video.id, screen.courseId]);

  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (controlsVisible && !paused) {
      hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [controlsVisible, paused]);

  const saveProgress = (seconds: number, complete = false) => {
    lastSaved.current = seconds;
    positionRef.current = seconds;
    api
      .progress(screen.video.id, Math.floor(seconds), complete)
      .catch(() => undefined);
  };

  useEffect(() => {
    if (resumePositionRef.current > 5 && !screen.video.progress?.isCompleted) {
      Alert.alert(
        'Continue watching?',
        `Resume from ${formatDuration(resumePositionRef.current)}?`,
        [
          {
            text: 'Start over',
            onPress: () => {
              resumeAllowedRef.current = false;
              positionRef.current = 0;
              videoRef.current?.seek(0);
              setPosition(0);
              saveProgress(0);
            },
          },
          {
            text: 'Continue',
            onPress: () => {
              resumeAllowedRef.current = true;
              videoRef.current?.seek(resumePositionRef.current);
              setPosition(resumePositionRef.current);
            },
            style: 'default',
          },
        ],
        { cancelable: false },
      );
    }

    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') saveProgress(positionRef.current);
    });
    return () => {
      saveProgress(positionRef.current);
      subscription.remove();
    };
  }, [screen.video.id]);

  const download = async () => {
    setDownloading(true);
    setDownloadPaused(false);
    setDownloadProgress(0);
    try {
      const item = await api.downloadVideo(
        screen.courseId,
        screen.video,
        setDownloadProgress,
        controls => {
          downloadControls.current = controls;
        },
      );
      setSaved(item);
      Alert.alert(
        'Saved offline',
        'This content is now available inside BanglaBox.',
      );
    } catch (e) {
      Alert.alert(
        'Download failed',
        e instanceof Error ? e.message : 'Try again.',
      );
    } finally {
      setDownloading(false);
      setDownloadPaused(false);
      downloadControls.current = null;
    }
  };

  const toggleDownloadPause = () => {
    const controls = downloadControls.current;
    if (!controls) return;

    if (downloadPaused) {
      controls.resume();
      setDownloadPaused(false);
    } else {
      controls.pause();
      setDownloadPaused(true);
    }
  };

  const toggleFullscreen = () => {
    if (fullscreen) {
      Orientation.unlockAllOrientations();
      Orientation.lockToPortrait();
      setFullscreen(false);
    } else {
      Orientation.lockToLandscape();
      setFullscreen(true);
    }
    setControlsVisible(true);
  };

  const leave = () => {
    saveProgress(position);
    back();
  };

  const jump = (seconds: number) => {
    const next = Math.max(0, Math.min(duration || 0, position + seconds));
    videoRef.current?.seek(next);
    setPosition(next);
    setControlsVisible(true);
  };

  const togglePlay = () => {
    if (!paused) saveProgress(position);
    setPaused(value => !value);
  };

  const cycleRate = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    setRate(rates[(rates.indexOf(rate) + 1) % rates.length]);
    setControlsVisible(true);
  };

  const handleVideoTap = (event: GestureResponderEvent) => {
    const now = Date.now();
    const isDoubleTap = now - lastTap.current < 300;
    lastTap.current = now;

    if (isDoubleTap) {
      jump(event.nativeEvent.locationX < width / 2 ? -10 : 10);
      return;
    }
    setControlsVisible(value => !value);
  };

  const measureSeek = () => {
    seekRef.current?.measureInWindow((x: number, _y: any, w: number) => {
      seekLeft.current = x;
      seekWidth.current = w;
    });
  };

  const seekResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_event, gesture) => {
        scrubbing.current = true;
        setControlsVisible(true);
        setPosition(secondsAt(gesture.x0));
      },
      onPanResponderMove: (_event, gesture) =>
        setPosition(secondsAt(gesture.moveX)),
      onPanResponderRelease: (_event, gesture) => {
        const next = secondsAt(gesture.moveX);
        scrubbing.current = false;
        videoRef.current?.seek(next);
        setPosition(next);
        saveProgress(next);
      },
      onPanResponderTerminate: () => {
        scrubbing.current = false;
      },
    }),
  ).current;

  function secondsAt(pageX: number) {
    const trackWidth = seekWidth.current;
    if (!trackWidth || !durationRef.current) return 0;
    const ratio = Math.max(
      0,
      Math.min(1, (pageX - seekLeft.current) / trackWidth),
    );
    return ratio * durationRef.current;
  }

  const percent = duration ? Math.min(100, (position / duration) * 100) : 0;
  const videoHeight = fullscreen ? height : (width * 9) / 16;
  const currentContentIndex = courseContents.findIndex(
    content => content.kind === 'video' && content.video.id === screen.video.id,
  );
  const localPreviousContent =
    currentContentIndex > 0 ? courseContents[currentContentIndex - 1] : null;
  const localNextContent =
    currentContentIndex >= 0
      ? courseContents[currentContentIndex + 1] ?? null
      : null;
  const upNext =
    currentContentIndex >= 0
      ? courseContents.slice(currentContentIndex + 1, currentContentIndex + 3)
      : [];
  const navigationPrevious = previousContent ?? localPreviousContent;
  const navigationNext = nextContent ?? localNextContent;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openLocalContent = (content: PlayerContent) => {
    if (content.kind === 'video') openVideo(content.video);
    if (content.kind === 'pdf') openPdf(content.title, content.url);
    if (content.kind === 'quiz') openQuiz(content.quiz);
    if (content.kind === 'assignment') openAssignment(content.assignment);
  };
  const downloadLabel = downloading
    ? `${downloadPaused ? 'Paused ' : ''}${Math.round(downloadProgress * 100)}%`
    : saved
    ? 'Offline'
    : 'Download';

  return (
    <View
      style={[
        styles.screen,
        fullscreen ? styles.playerFullscreen : { paddingTop: insets.top },
      ]}
    >
      <StatusBar hidden={fullscreen} barStyle="light-content" />

      <View style={[styles.videoFrame, { height: videoHeight }]}>
        {url ? (
          <Video
            ref={videoRef}
            source={{ uri: url }}
            style={styles.video}
            controls={false}
            resizeMode="contain"
            paused={paused}
            muted={muted}
            rate={rate}
            onLoad={event => {
              setDuration(event.duration);
              if (
                resumePositionRef.current > 5 &&
                !screen.video.progress?.isCompleted &&
                resumeAllowedRef.current
              ) {
                videoRef.current?.seek(resumePositionRef.current);
                setPosition(resumePositionRef.current);
              }
            }}
            onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
            onProgress={event => {
              if (scrubbing.current) return;
              setPosition(event.currentTime);
              positionRef.current = event.currentTime;
              if (Math.abs(event.currentTime - lastSaved.current) >= 15) {
                saveProgress(event.currentTime);
              }
            }}
            onEnd={() => {
              setPaused(true);
              setPosition(duration || position);
              saveProgress(duration || position, true);
            }}
          />
        ) : (
          <ActivityIndicator
            color={colors.brass}
            style={styles.playerLoading}
          />
        )}

        <View style={styles.videoSurface} onTouchEnd={handleVideoTap} />

        <View
          pointerEvents="none"
          style={[
            styles.watermark,
            { top: `${watermark.top}%`, left: `${watermark.left}%` },
          ]}
        >
          <Text style={styles.watermarkText}>{email}</Text>
        </View>

        {buffering ? (
          <ActivityIndicator
            color={colors.brass}
            style={styles.playerBuffering}
          />
        ) : null}

        {controlsVisible ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.playerOverlay,
              fullscreen && {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
                paddingLeft: insets.left,
                paddingRight: insets.right,
              },
            ]}
          >
            <View style={styles.playerTopBar}>
              <Pressable onPress={leave} style={styles.playerIconButton}>
                <ArrowLeft size={21} color={colors.text} />
              </Pressable>
              <Text numberOfLines={1} style={styles.playerTitle}>
                {screen.video.title}
              </Text>
            </View>

            <View style={styles.playerCenter}>
              <SkipButton direction="back" onPress={() => jump(-10)} />
              <Pressable onPress={togglePlay} style={styles.playerPlayButton}>
                {paused ? (
                  <Play size={22} color={colors.ink} fill={colors.ink} />
                ) : (
                  <Pause size={22} color={colors.ink} fill={colors.ink} />
                )}
              </Pressable>
              <SkipButton direction="forward" onPress={() => jump(10)} />
            </View>

            <View style={styles.playerBottomBar}>
              <View
                ref={seekRef}
                collapsable={false}
                style={styles.seekTrack}
                onLayout={measureSeek}
                {...seekResponder.panHandlers}
              >
                <View pointerEvents="none" style={styles.seekTrackInner}>
                  <View style={[styles.seekFill, { width: `${percent}%` }]} />
                  <View style={[styles.seekThumb, { left: `${percent}%` }]} />
                </View>
              </View>

              <View style={styles.playerMetaRow}>
                <Text style={styles.playerTime}>
                  {formatDuration(position)} / {formatDuration(duration)}
                </Text>
                <View style={styles.playerRightActions}>
                  <Pressable
                    onPress={() => setMuted(value => !value)}
                    style={styles.playerSmallButton}
                    accessibilityLabel={muted ? 'Unmute video' : 'Mute video'}
                  >
                    {muted ? (
                      <VolumeX size={20} color={colors.text} />
                    ) : (
                      <Volume2 size={20} color={colors.text} />
                    )}
                  </Pressable>
                  <Pressable onPress={cycleRate} style={styles.speedButton}>
                    <Text style={styles.speedText}>{rate}x</Text>
                  </Pressable>
                  <Pressable
                    onPress={toggleFullscreen}
                    style={styles.playerSmallButton}
                  >
                    {fullscreen ? (
                      <Minimize2 size={20} color={colors.text} />
                    ) : (
                      <Maximize2 size={20} color={colors.text} />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {!fullscreen ? (
        <>
          <ScrollView contentContainerStyle={styles.playerDescription}>
            <Text style={styles.eyebrow}>Now learning</Text>
            <Text style={styles.heading}>{screen.video.title}</Text>
            <Text style={[styles.body, styles.homeIntro]}>
              {screen.video.description ||
                'Continue at your own pace. Your progress is saved automatically.'}
            </Text>

            <View style={styles.playerInfoChips}>
              <Pressable
                onPress={downloading ? toggleDownloadPause : download}
                disabled={Boolean(saved)}
                style={styles.playerInfoChip}
              >
                {saved ? (
                  <Check size={16} color={colors.teal} />
                ) : downloading && !downloadPaused ? (
                  <Pause size={16} color={colors.brass} />
                ) : downloading && downloadPaused ? (
                  <Play size={16} color={colors.brass} />
                ) : (
                  <Download size={16} color={colors.brass} />
                )}
                <Text style={styles.playerInfoChipText}>{downloadLabel}</Text>
              </Pressable>
            </View>
            {downloading ? (
              <View style={styles.downloadProgressTrack}>
                <View
                  style={[
                    styles.downloadProgressFill,
                    { width: `${Math.round(downloadProgress * 100)}%` },
                  ]}
                />
              </View>
            ) : null}

            <View style={styles.lessonNavigation}>
              <Pressable
                onPress={() =>
                  navigationPrevious && onOpenContent(navigationPrevious)
                }
                disabled={!navigationPrevious}
                style={[
                  styles.lessonNavButton,
                  styles.outlineLessonButton,
                  !navigationPrevious && styles.nextLessonDisabled,
                ]}
              >
                <ArrowLeft size={17} color={colors.text} />
                <View style={styles.lessonNavCopy}>
                  <Text style={styles.lessonNavLabel}>Previous</Text>
                  <Text numberOfLines={1} style={styles.lessonNavText}>
                    {navigationPrevious?.title ?? 'First content'}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => navigationNext && onOpenContent(navigationNext)}
                disabled={!navigationNext}
                style={[
                  styles.lessonNavButton,
                  styles.nextLessonButton,
                  !navigationNext && styles.nextLessonDisabled,
                ]}
              >
                <View style={styles.lessonNavCopy}>
                  <Text style={styles.nextLessonLabel}>
                    {navigationNext ? 'Next' : 'Complete'}
                  </Text>
                  <Text numberOfLines={1} style={styles.nextLessonText}>
                    {navigationNext?.title ?? 'Course complete'}
                  </Text>
                </View>
                <ArrowRight size={17} color={colors.ink} />
              </Pressable>
            </View>

            {upNext.length ? (
              <>
                <Text style={styles.upNextTitle}>Lesson outline</Text>
                {upNext.map(content => (
                  <Pressable
                    key={`${content.kind}-${
                      content.kind === 'video'
                        ? content.video.id
                        : content.kind === 'pdf'
                        ? content.url
                        : content.kind === 'quiz'
                        ? content.quiz.id
                        : content.assignment.id
                    }`}
                    onPress={() => onOpenContent(content)}
                    style={styles.upNextRow}
                  >
                    <View style={styles.upNextIcon}>
                      {content.kind === 'video' ? (
                        <Play size={14} color={colors.brass} />
                      ) : content.kind === 'pdf' ? (
                        <FileText size={14} color={colors.text} />
                      ) : content.kind === 'assignment' ? (
                        <FileText size={14} color={colors.text} />
                      ) : (
                        <CircleHelp size={14} color={colors.text} />
                      )}
                    </View>
                    <View style={styles.contentText}>
                      <Text
                        numberOfLines={1}
                        style={[styles.body, styles.contentLabel]}
                      >
                        {content.title}
                      </Text>
                      <Text style={styles.contentSubtitleText}>
                        {content.kind === 'video'
                          ? formatDuration(content.video.durationSeconds ?? 0)
                          : content.kind.toUpperCase()}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={colors.brass} />
                  </Pressable>
                ))}
              </>
            ) : null}
          </ScrollView>

        </>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* PDF + quiz                                                          */
/* ------------------------------------------------------------------ */

function ContentNavigation({
  previousContent,
  nextContent,
  onOpenContent,
}: {
  previousContent: PlayerContent | null;
  nextContent: PlayerContent | null;
  onOpenContent: (content: PlayerContent) => void;
}) {
  return (
    <View style={styles.lessonNavigation}>
      <Pressable
        onPress={() => previousContent && onOpenContent(previousContent)}
        disabled={!previousContent}
        style={[
          styles.lessonNavButton,
          styles.outlineLessonButton,
          !previousContent && styles.nextLessonDisabled,
        ]}
      >
        <ArrowLeft size={17} color={colors.text} />
        <View style={styles.lessonNavCopy}>
          <Text style={styles.lessonNavLabel}>Previous</Text>
          <Text numberOfLines={1} style={styles.lessonNavText}>
            {previousContent?.title ?? 'First content'}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => nextContent && onOpenContent(nextContent)}
        disabled={!nextContent}
        style={[
          styles.lessonNavButton,
          styles.nextLessonButton,
          !nextContent && styles.nextLessonDisabled,
        ]}
      >
        <View style={styles.lessonNavCopy}>
          <Text style={styles.nextLessonLabel}>
            {nextContent ? 'Next' : 'Complete'}
          </Text>
          <Text numberOfLines={1} style={styles.nextLessonText}>
            {nextContent?.title ?? 'Course complete'}
          </Text>
        </View>
        <ArrowRight size={17} color={colors.ink} />
      </Pressable>
    </View>
  );
}

function AssignmentScreen({
  courseId,
  courseTitle,
  assignment,
  back,
  onNavigate: _onNavigate,
  previousContent,
  nextContent,
  onOpenContent,
}: {
  courseId?: string;
  courseTitle: string;
  assignment: LearningAssignment;
  back: () => void;
  onNavigate: (key: NavKey) => void;
  previousContent: PlayerContent | null;
  nextContent: PlayerContent | null;
  onOpenContent: (content: PlayerContent) => void;
}) {
  const adjacent = useAdjacentCourseContent(courseId, {
    kind: 'assignment',
    title: assignment.title,
    assignment,
  });
  const resolvedPreviousContent = previousContent ?? adjacent.previous;
  const resolvedNextContent = nextContent ?? adjacent.next;
  const [submissionText, setSubmissionText] = useState(
    assignment.submission?.submissionText ?? '',
  );
  const [submission, setSubmission] = useState(assignment.submission);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!submissionText.trim()) {
      Alert.alert(
        'Write your answer',
        'Add your assignment response before submitting.',
      );
      return;
    }
    setBusy(true);
    try {
      const result = await api.submitAssignment(
        assignment.id,
        submissionText.trim(),
      );
      setSubmission(result);
      Alert.alert(
        'Assignment submitted',
        'Your submission was sent to the instructor.',
      );
    } catch (e) {
      Alert.alert(
        'Submission failed',
        e instanceof Error ? e.message : 'Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={back} style={styles.backRow}>
          <ArrowLeft size={17} color={colors.brass} />
          <Text style={styles.outlineText}>Back to course</Text>
        </Pressable>
        <View style={styles.contentHeader}>
          <Text style={styles.eyebrow}>{courseTitle}</Text>
          <Text style={styles.title}>{assignment.title}</Text>
          <View style={styles.contentMeta}>
            <View style={styles.contentMetaPill}>
              <Text style={styles.contentMetaText}>Assignment</Text>
            </View>
            <Text style={styles.contentSubtitleText}>
              Max {assignment.maxScore} points
            </Text>
          </View>
        </View>
        <View style={[styles.card, styles.materialCard]}>
          <Text style={styles.eyebrow}>Assignment</Text>
          <Text style={styles.body}>{assignment.instructions}</Text>
          <Text style={[styles.contentSubtitleText, styles.formLabel]}>
            Maximum score: {assignment.maxScore}
          </Text>
          {assignment.dueAt ? (
            <Text style={styles.contentSubtitleText}>
              Due: {new Date(assignment.dueAt).toLocaleDateString()}
            </Text>
          ) : null}
          {submission ? (
            <Text style={[styles.offlineLabel, styles.formLabel]}>
              Submitted for review
            </Text>
          ) : (
            <>
              <TextInput
                multiline
                textAlignVertical="top"
                placeholder="Write your assignment response"
                placeholderTextColor={colors.muted}
                value={submissionText}
                onChangeText={setSubmissionText}
                style={[styles.input, styles.assignmentInput]}
              />
              <Pressable onPress={submit} disabled={busy} style={styles.button}>
                {busy ? (
                  <ActivityIndicator color={colors.ink} />
                ) : (
                  <Text style={styles.buttonText}>Submit assignment</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
        <ContentNavigation
          previousContent={resolvedPreviousContent}
          nextContent={resolvedNextContent}
          onOpenContent={onOpenContent}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function PdfReader({
  courseId,
  title,
  url,
  back,
  previousContent,
  nextContent,
  onOpenContent,
}: {
  courseId?: string;
  title: string;
  url: string;
  back: () => void;
  previousContent: PlayerContent | null;
  nextContent: PlayerContent | null;
  onOpenContent: (content: PlayerContent) => void;
}) {
  const adjacent = useAdjacentCourseContent(courseId, {
    kind: 'pdf',
    title,
    url,
  });
  const resolvedPreviousContent = previousContent ?? adjacent.previous;
  const resolvedNextContent = nextContent ?? adjacent.next;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.pdfHeader}>
        <Pressable onPress={back} style={styles.headerIcon}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <Text numberOfLines={1} style={styles.pdfTitle}>
          {title}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, styles.questionCard]}>
          <FileText size={26} color={colors.brass} />
          <Text style={styles.heading}>PDF material</Text>
          <Text style={styles.body}>
            Open this document in your phone's PDF viewer or browser.
          </Text>
          <Pressable
            onPress={() =>
              Linking.openURL(url).catch(() =>
                Alert.alert(
                  'PDF unavailable',
                  'This material could not be opened right now.',
                ),
              )
            }
            style={styles.button}
          >
            <Text style={styles.buttonText}>Open PDF</Text>
          </Pressable>
        </View>
        <ContentNavigation
          previousContent={resolvedPreviousContent}
          nextContent={resolvedNextContent}
          onOpenContent={onOpenContent}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreRing({ percent }: { percent: number }) {
  const size = 88;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safe = Math.max(0, Math.min(100, percent));
  const dash = (circumference * safe) / 100;

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={safe >= 60 ? colors.teal : colors.brass}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringText}>{Math.round(safe)}%</Text>
      </View>
    </View>
  );
}

function QuizScreen({
  courseId,
  courseTitle,
  quiz,
  back,
  onNavigate: _onNavigate,
  previousContent,
  nextContent,
  onOpenContent,
}: {
  courseId?: string;
  courseTitle: string;
  quiz: Quiz;
  back: () => void;
  onNavigate: (key: NavKey) => void;
  previousContent: PlayerContent | null;
  nextContent: PlayerContent | null;
  onOpenContent: (content: PlayerContent) => void;
}) {
  const adjacent = useAdjacentCourseContent(courseId, {
    kind: 'quiz',
    title: quiz.title,
    quiz,
  });
  const resolvedPreviousContent = previousContent ?? adjacent.previous;
  const resolvedNextContent = nextContent ?? adjacent.next;
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<
    string,
    string[]
  > | null>(null);
  const [result, setResult] = useState<QuizResult | null>(quiz.latestAttempt);
  const [filter, setFilter] = useState<'all' | 'wrong'>('all');
  const [busy, setBusy] = useState(false);

  const review = result?.review ?? quiz.review;
  const chosen = review?.answers ?? submittedAnswers ?? {};
  const correct = review?.correctOptionIds ?? null;

  const toggle = (questionId: string, optionId: string, multiple: boolean) =>
    setAnswers(current => {
      const selected = current[questionId] ?? [];
      const next = selected.includes(optionId)
        ? selected.filter(id => id !== optionId)
        : multiple
        ? [...selected, optionId]
        : [optionId];
      return { ...current, [questionId]: next };
    });

  const submit = async () => {
    const unanswered = quiz.questions.some(q => !answers[q.id]?.length);
    if (unanswered) {
      return Alert.alert(
        'Answer all questions',
        'Choose an answer for every question before submitting.',
      );
    }

    setBusy(true);
    try {
      const next = await api.submitQuiz(quiz.id, answers);
      setSubmittedAnswers(answers);
      setResult(next);
    } catch (e) {
      Alert.alert(
        'Quiz could not be submitted',
        e instanceof Error ? e.message : 'Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const isQuestionRight = (questionId: string) => {
    if (!review) return null;
    if (review.correctQuestionIds)
      return review.correctQuestionIds.includes(questionId);
    const right = [...(review.correctOptionIds[questionId] ?? [])]
      .sort()
      .join(',');
    const mine = [...(review.answers[questionId] ?? [])].sort().join(',');
    return right === mine;
  };

  const wrongCount = result ? result.totalQuestions - result.score : 0;
  const isGood = result ? result.percentage >= 60 : false;
  const statusLabel = result
    ? result.percentage >= 80
      ? 'Excellent work'
      : result.percentage >= 60
      ? 'Good job'
      : 'Keep practicing'
    : '';
  const hasReview = Object.keys(chosen).length > 0;
  const visibleQuestions = quiz.questions.filter(question =>
    filter === 'wrong' ? isQuestionRight(question.id) === false : true,
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        style={styles.quizBody}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.quizTopRow}>
          <Pressable onPress={back} style={styles.backRow}>
            <ArrowLeft size={16} color={colors.brass} />
            <Text style={styles.outlineText}>Back</Text>
          </Pressable>
          {result ? (
            <View style={styles.submittedPill}>
              <Text style={styles.submittedPillText}>Submitted</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.contentHeader}>
          <Text style={styles.eyebrow}>{courseTitle}</Text>
          <Text style={styles.title}>{quiz.title}</Text>
          <View style={styles.contentMeta}>
            <View style={styles.contentMetaPill}>
              <Text style={styles.contentMetaText}>Quiz</Text>
            </View>
            <Text style={styles.contentSubtitleText}>
              {plural(quiz.questions.length, 'question')}
            </Text>
          </View>
        </View>

        {result ? (
          <>
            <View style={styles.resultHero}>
              <View style={styles.resultTopRow}>
                <ScoreRing percent={result.percentage} />
                <View style={styles.resultInfo}>
                  <View
                    style={[
                      styles.statusBadge,
                      isGood ? styles.statusBadgeGood : styles.statusBadgeWarn,
                    ]}
                  >
                    <TrendingUp
                      size={13}
                      color={isGood ? colors.teal : colors.brass}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: isGood ? colors.teal : colors.brass },
                      ]}
                    >
                      {statusLabel}
                    </Text>
                  </View>
                  <Text style={styles.resultCount}>
                    {result.score} of {result.totalQuestions} correct
                  </Text>
                  <Text style={styles.resultNote}>
                    This quiz can only be submitted once.
                  </Text>
                </View>
              </View>

              <View style={styles.resultStatsRow}>
                <View style={[styles.resultStatCard, styles.resultStatRight]}>
                  <View style={[styles.statIconCircle, styles.statIconRight]}>
                    <Check size={16} color={colors.ink} strokeWidth={3} />
                  </View>
                  <View>
                    <Text style={styles.statNumber}>{result.score}</Text>
                    <Text style={styles.statCaption}>Correct</Text>
                  </View>
                </View>
                <View style={[styles.resultStatCard, styles.resultStatWrong]}>
                  <View style={[styles.statIconCircle, styles.statIconWrong]}>
                    <X size={16} color={colors.ink} strokeWidth={3} />
                  </View>
                  <View>
                    <Text style={styles.statNumber}>{wrongCount}</Text>
                    <Text style={styles.statCaption}>Wrong</Text>
                  </View>
                </View>
              </View>
            </View>

            {hasReview ? (
              <>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewTitle}>Review answers</Text>
                  {correct ? (
                    <View style={styles.filterRow}>
                      <Pressable
                        onPress={() => setFilter('all')}
                        style={[
                          styles.filterPill,
                          filter === 'all' && styles.filterPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterText,
                            filter === 'all' && styles.filterTextActive,
                          ]}
                        >
                          All
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setFilter('wrong')}
                        style={[
                          styles.filterPill,
                          filter === 'wrong' && styles.filterPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterText,
                            filter === 'wrong' && styles.filterTextActive,
                          ]}
                        >
                          Wrong
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>

                {visibleQuestions.length ? (
                  visibleQuestions.map(question => {
                    const index = quiz.questions.findIndex(
                      q => q.id === question.id,
                    );
                    const right = isQuestionRight(question.id);
                    return (
                      <View key={question.id} style={styles.reviewCard}>
                        <View
                          style={[
                            styles.reviewStrip,
                            right === true && styles.reviewStripRight,
                            right === false && styles.reviewStripWrong,
                            right === null && { backgroundColor: colors.brass },
                          ]}
                        />
                        <View style={styles.reviewBody}>
                          <View style={styles.reviewHead}>
                            <View style={styles.qNumRow}>
                              <View
                                style={[
                                  styles.qNum,
                                  right === true && styles.qNumRight,
                                  right === false && styles.qNumWrong,
                                  right === null && {
                                    backgroundColor: colors.brassSoft,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.qNumText,
                                    {
                                      color:
                                        right === true
                                          ? colors.teal
                                          : right === false
                                          ? colors.danger
                                          : colors.brass,
                                    },
                                  ]}
                                >
                                  {index + 1}
                                </Text>
                              </View>
                              <Text style={styles.qLabel}>Question</Text>
                            </View>
                            {right !== null ? (
                              <View
                                style={[
                                  styles.verdictBadge,
                                  right
                                    ? styles.verdictRight
                                    : styles.verdictWrong,
                                ]}
                              >
                                {right ? (
                                  <Check size={12} color={colors.teal} />
                                ) : (
                                  <X size={12} color={colors.danger} />
                                )}
                                <Text style={styles.verdictText}>
                                  {right ? 'Correct' : 'Wrong'}
                                </Text>
                              </View>
                            ) : null}
                          </View>

                          <Text style={styles.reviewQuestion}>
                            {question.questionText}
                          </Text>

                          {question.options.map((option, optionIndex) => {
                            const picked = (chosen[question.id] ?? []).includes(
                              option.id,
                            );
                            const isCorrectOption = correct
                              ? (correct[question.id] ?? []).includes(option.id)
                              : false;
                            const state =
                              picked && correct
                                ? isCorrectOption
                                  ? 'right'
                                  : 'wrong'
                                : !picked && isCorrectOption
                                ? 'missed'
                                : picked
                                ? 'picked'
                                : 'none';
                            const letter = String.fromCharCode(
                              65 + optionIndex,
                            );

                            return (
                              <View
                                key={option.id}
                                style={[
                                  styles.reviewOption,
                                  state === 'right' && styles.reviewOptionRight,
                                  state === 'wrong' && styles.reviewOptionWrong,
                                  state === 'missed' &&
                                    styles.reviewOptionMissed,
                                  state === 'picked' &&
                                    styles.reviewOptionPicked,
                                ]}
                              >
                                <View
                                  style={[
                                    styles.letter,
                                    state === 'right' && styles.letterRight,
                                    state === 'wrong' && styles.letterWrong,
                                    state === 'missed' && styles.letterMissed,
                                    state === 'picked' && styles.letterPicked,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.letterText,
                                      (state === 'right' ||
                                        state === 'wrong' ||
                                        state === 'picked') && {
                                        color: colors.ink,
                                      },
                                      state === 'missed' && {
                                        color: colors.teal,
                                      },
                                    ]}
                                  >
                                    {letter}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.reviewOptionText,
                                    state === 'none' &&
                                      styles.reviewOptionMuted,
                                  ]}
                                >
                                  {option.optionText}
                                </Text>
                                {state === 'right' ? (
                                  <Text
                                    style={[
                                      styles.optionSideText,
                                      { color: colors.teal },
                                    ]}
                                  >
                                    Your answer
                                  </Text>
                                ) : null}
                                {state === 'wrong' ? (
                                  <Text
                                    style={[
                                      styles.optionSideText,
                                      { color: colors.danger },
                                    ]}
                                  >
                                    Your answer
                                  </Text>
                                ) : null}
                                {state === 'missed' ? (
                                  <Text
                                    style={[
                                      styles.optionSideText,
                                      { color: colors.teal },
                                    ]}
                                  >
                                    Correct
                                  </Text>
                                ) : null}
                                {state === 'picked' ? (
                                  <Text
                                    style={[
                                      styles.optionSideText,
                                      { color: colors.brass },
                                    ]}
                                  >
                                    Your answer
                                  </Text>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={[styles.card, styles.emptyState]}>
                    <Text style={styles.heading}>No wrong answers</Text>
                    <Text style={styles.body}>
                      You got every question right.
                    </Text>
                  </View>
                )}
              </>
            ) : null}

            <Pressable onPress={back} style={styles.backToCourse}>
              <Text style={styles.backToCourseText}>Back to course</Text>
            </Pressable>
          </>
        ) : (
          <>
            {quiz.questions.map((question, index) => (
              <View
                key={question.id}
                style={[styles.card, styles.questionCard]}
              >
                <Text style={styles.eyebrow}>Question {index + 1}</Text>
                <Text style={styles.heading}>{question.questionText}</Text>
                {question.options.map(option => {
                  const selected = (answers[question.id] ?? []).includes(
                    option.id,
                  );
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() =>
                        toggle(question.id, option.id, question.allowMultiple)
                      }
                      style={[styles.option, selected && styles.optionSelected]}
                    >
                      <View
                        style={[styles.radio, selected && styles.radioSelected]}
                      />
                      <Text style={[styles.body, styles.optionText]}>
                        {option.optionText}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <Pressable style={styles.button} onPress={submit} disabled={busy}>
              {busy ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text style={styles.buttonText}>Submit quiz</Text>
              )}
            </Pressable>
          </>
        )}

        <ContentNavigation
          previousContent={resolvedPreviousContent}
          nextContent={resolvedNextContent}
          onOpenContent={onOpenContent}
        />
        <View style={styles.quizFooterSpace} />
      </ScrollView>

    </SafeAreaView>
  );
}
