import * as Keychain from 'react-native-keychain';
import RNFS from 'react-native-fs';

export const API_URL =
  (globalThis as { __BANGLABOX_API_URL__?: string }).__BANGLABOX_API_URL__ ??
  'https://learning-management-backend-jet.vercel.app';

export type Profile = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: 'admin' | 'instructor' | 'student';
};

export type Session = {
  accessToken: string;
  refreshToken?: string;
  profile: Profile;
};
export type Course = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  category: string | null;
  level: string;
  price: string;
  currency: string;
  thumbnailUrl: string | null;
  instructorName: string | null;
};
export type Dashboard = {
  activeCourses: number;
  completionPercentage: number;
  completedLectures: number;
  totalLectures: number;
  learningStreakDays: number;
  courses: Array<{
    courseId: string;
    courseTitle: string;
    completionPercentage: number;
  }>;
};

export type QuizReview = {
  answers: Record<string, string[]>;
  correctOptionIds: Record<string, string[]>;
  correctQuestionIds?: string[];
};

export type Quiz = {
  id: string;
  title: string;
  questions: Array<{
    id: string;
    questionText: string;
    allowMultiple: boolean;
    options: Array<{ id: string; optionText: string }>;
  }>;
  latestAttempt: {
    score: number;
    totalQuestions: number;
    percentage: number;
  } | null;
  review: QuizReview | null;
};

export type QuizResult = {
  score: number;
  totalQuestions: number;
  percentage: number;
  review?: QuizReview | null;
};

export type LearningAssignmentSubmission = {
  id: string;
  assignmentId: string;
  submissionText: string;
  submittedAt: string;
  gradeScore: number | null;
  gradeFeedback: string | null;
  gradedAt: string | null;
  updatedAt: string;
};

export type LearningVideo = {
  id: string;
  title: string;
  description: string | null;
  durationSeconds: number | null;
  pdfUrl: string | null;
  slidesUrl: string | null;
  progress: { positionSeconds: number; isCompleted: boolean } | null;
  quiz: Quiz | null;
  moduleTitle: string;
};
export type LearningModule = {
  id: string;
  title: string;
  pdfUrl: string | null;
  slidesUrl: string | null;
  videos: LearningVideo[];
  quiz: Quiz | null;
};
export type LearningCourse = {
  course: { id: string; title: string; completionPercentage: number };
  learner: { email: string };
  sections: Array<{
    id: string;
    title: string;
    position: number;
    modules: LearningModule[];
  }>;
};
export type OfflineVideo = {
  lectureId: string;
  title: string;
  path: string;
  courseId: string;
  downloadedAt: string;
  sizeBytes?: number;
};

export type DownloadControls = {
  pause: () => void;
  resume: () => void;
};

const CREDENTIAL = 'banglabox.session';
const OFFLINE_CREDENTIAL = 'banglabox.offline-videos';
const SETTINGS_CREDENTIAL = 'banglabox.settings';
let accessToken: string | null = null;

export async function loadSession(): Promise<Session | null> {
  try {
    const saved = await Keychain.getGenericPassword({ service: CREDENTIAL });
    if (!saved) return null;
    const session = JSON.parse(saved.password) as Session;
    accessToken = session.accessToken;
    return session;
  } catch {
    // Native secure storage is unavailable in Jest/web previews; start logged out.
    return null;
  }
}

async function saveSession(session: Session) {
  accessToken = session.accessToken;
  try {
    await Keychain.setGenericPassword('student', JSON.stringify(session), {
      service: CREDENTIAL,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    // Keep the access token in memory if the native keychain is not installed yet.
  }
  return session;
}

export async function clearSession() {
  accessToken = null;
  try {
    await Keychain.resetGenericPassword({ service: CREDENTIAL });
  } catch {}
}

async function readOffline(): Promise<OfflineVideo[]> {
  try {
    const saved = await Keychain.getGenericPassword({
      service: OFFLINE_CREDENTIAL,
    });
    return saved ? (JSON.parse(saved.password) as OfflineVideo[]) : [];
  } catch {
    return [];
  }
}

async function writeOffline(items: OfflineVideo[]) {
  try {
    await Keychain.setGenericPassword('offline', JSON.stringify(items), {
      service: OFFLINE_CREDENTIAL,
    });
  } catch {}
}

// Same list as readOffline, but fills in sizeBytes from the file on disk for
// videos that were saved before sizes were tracked, and stores it for next time.
async function readOfflineWithSize(): Promise<OfflineVideo[]> {
  const items = await readOffline();
  let changed = false;
  const next = await Promise.all(
    items.map(async item => {
      if (item.sizeBytes !== undefined) return item;
      try {
        const stat = await RNFS.stat(item.path);
        changed = true;
        return { ...item, sizeBytes: Number(stat.size) };
      } catch {
        return item;
      }
    }),
  );
  if (changed) await writeOffline(next);
  return next;
}

async function getAutoDownload() {
  try {
    const saved = await Keychain.getGenericPassword({
      service: SETTINGS_CREDENTIAL,
    });
    return saved ? Boolean(JSON.parse(saved.password).autoDownload) : false;
  } catch {
    return false;
  }
}

async function setAutoDownload(enabled: boolean) {
  try {
    await Keychain.setGenericPassword(
      'settings',
      JSON.stringify({ autoDownload: enabled }),
      { service: SETTINGS_CREDENTIAL },
    );
  } catch {}
}

async function clearOfflineDownloads() {
  const items = await readOffline();
  await Promise.all(
    items.map(item => RNFS.unlink(item.path).catch(() => undefined)),
  );
  await writeOffline([]);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  headers.set('X-Client', 'mobile');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (response.status === 401 && retry) {
    const saved = await Keychain.getGenericPassword({ service: CREDENTIAL });
    const oldSession = saved ? (JSON.parse(saved.password) as Session) : null;
    if (oldSession?.refreshToken) {
      const refresh = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Client': 'mobile' },
        body: JSON.stringify({ refreshToken: oldSession.refreshToken }),
      });
      if (refresh.ok) {
        const next = (await refresh.json()) as Session;
        await saveSession(next);
        return request<T>(path, init, false);
      }
    }
    await clearSession();
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? 'Something went wrong.');
  return body as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<Session>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then(saveSession),
  signup: (email: string, password: string, fullName: string) =>
    request<{ message: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    }),
  me: () => request<Profile>('/auth/me'),
  logout: async () => {
    // Server revocation is best-effort: even if the Keychain read or the
    // network call fails, local cleanup below must still run, so a failed
    // sign-out can never leave a usable session or offline videos behind.
    try {
      const saved = await Keychain.getGenericPassword({ service: CREDENTIAL });
      await request(
        '/auth/logout',
        {
          method: 'POST',
          body: JSON.stringify({
            refreshToken: saved
              ? (JSON.parse(saved.password) as Session).refreshToken
              : undefined,
          }),
        },
        false,
      ).catch(() => undefined);
    } catch {
      // Ignore: fall through to local cleanup.
    }
    await clearSession().catch(() => undefined);
    await clearOfflineDownloads().catch(() => undefined);
  },
  courses: (query = '') =>
    request<{ courses: Course[] }>(
      `/courses?page=1&pageSize=30${
        query ? `&q=${encodeURIComponent(query)}` : ''
      }`,
    ),
  course: (slug: string) =>
    request<any>(`/courses/${encodeURIComponent(slug)}`),
  dashboard: () => request<Dashboard>('/student/analytics'),
  learning: (courseId: string) =>
    request<LearningCourse>(`/learning/courses/${courseId}`),
  videoUrl: (videoId: string) =>
    request<{ url: string; expiresInSeconds: number }>(
      `/lectures/videos/${videoId}/video-url`,
    ),
  progress: (videoId: string, positionSeconds: number, isCompleted = false) =>
    request(`/progress/videos/${videoId}`, {
      method: 'PUT',
      body: JSON.stringify({ positionSeconds, isCompleted }),
    }),
  submitQuiz: (quizId: string, answers: Record<string, string[]>) =>
    request<QuizResult>(`/quizzes/${quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),
  submitAssignment: (assignmentId: string, submissionText: string) =>
    request<LearningAssignmentSubmission>(
      `/assignments/${assignmentId}/submit`,
      {
        method: 'POST',
        body: JSON.stringify({ submissionText }),
      },
    ),
  offlineVideos: readOffline,
  offlineLibrary: readOfflineWithSize,
  getAutoDownload,
  setAutoDownload,
  reconcileOffline: async () => {
    const [dashboard, items] = await Promise.all([
      request<Dashboard>('/student/analytics'),
      readOffline(),
    ]);
    const activeCourseIds = new Set(
      dashboard.courses.map(course => course.courseId),
    );
    const allowed: OfflineVideo[] = [];
    for (const item of items) {
      if (activeCourseIds.has(item.courseId) && (await RNFS.exists(item.path)))
        allowed.push(item);
      else await RNFS.unlink(item.path).catch(() => undefined);
    }
    await writeOffline(allowed);
    return allowed;
  },
  downloadVideo: async (
    courseId: string,
    video: LearningVideo,
    onProgress?: (progress: number) => void,
    onControls?: (controls: DownloadControls) => void,
  ) => {
    const signed = await request<{ url: string }>(
      `/lectures/videos/${video.id}/video-url`,
    );
    const path = `${RNFS.DocumentDirectoryPath}/banglabox-${video.id}.mp4`;
    let activeJobId: number | null = null;
    let paused = false;
    let resumeDownload: (() => void) | null = null;

    onControls?.({
      pause: () => {
        paused = true;
        if (activeJobId !== null) RNFS.stopDownload(activeJobId);
      },
      resume: () => {
        if (!paused) return;
        paused = false;
        resumeDownload?.();
        resumeDownload = null;
      },
    });

    let result: { statusCode: number } | null = null;
    while (true) {
      const job = RNFS.downloadFile({
        fromUrl: signed.url,
        toFile: path,
        // R2 can take longer than Android's short native connection timeout,
        // especially on mobile networks. Keep the signed URL flow intact but
        // allow enough time to establish the connection and receive a video.
        connectionTimeout: 30000,
        readTimeout: 120000,
        progressDivider: 2,
        begin: () => onProgress?.(0),
        progress: event => {
          onProgress?.(
            event.contentLength > 0
              ? event.bytesWritten / event.contentLength
              : 0,
          );
        },
      });
      activeJobId = job.jobId;

      try {
        result = await job.promise;
        activeJobId = null;
        break;
      } catch (error) {
        activeJobId = null;
        if (!paused) throw error;
        await new Promise<void>(resolve => {
          resumeDownload = resolve;
        });
      }
    }

    if (!result) throw new Error('Video download failed.');
    onProgress?.(1);
    if (result.statusCode < 200 || result.statusCode >= 300)
      throw new Error('Video download failed.');
    const stat = await RNFS.stat(path).catch(() => null);
    const items = (await readOffline()).filter(
      item => item.lectureId !== video.id,
    );
    items.push({
      courseId,
      downloadedAt: new Date().toISOString(),
      lectureId: video.id,
      path,
      title: video.title,
      sizeBytes: stat ? Number(stat.size) : undefined,
    });
    await writeOffline(items);
    return items[items.length - 1];
  },
  removeOffline: async (lectureId: string) => {
    const items = await readOffline();
    const item = items.find(video => video.lectureId === lectureId);
    if (item) {
      try {
        await RNFS.unlink(item.path);
      } catch {}
    }
    const remaining = items.filter(video => video.lectureId !== lectureId);
    await writeOffline(remaining);
    return remaining;
  },
};
