import type { NavigatorScreenParams } from '@react-navigation/native';
import type { LearningVideo, Profile, Quiz } from '../api';

export type LearningAssignment = {
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

export type LearningStackParamList = {
  Course: { courseId: string; title: string };
  Player: { courseId: string; courseTitle: string; video: LearningVideo };
  Pdf: { courseId?: string; courseTitle?: string; title: string; url: string };
  Quiz: { courseId?: string; courseTitle: string; quiz: Quiz };
  Assignment: {
    courseId?: string;
    courseTitle: string;
    assignment: LearningAssignment;
  };
};

export type StudentTabParamList = {
  Home: undefined;
  Courses: undefined;
  Downloads: undefined;
  Profile: undefined;
};

export type StudentRootParamList = {
  Tabs: undefined;
  Learning: NavigatorScreenParams<LearningStackParamList>;
};

export type AuthStackParamList = { Login: undefined };

export type NavigatorScreens = {
  Login: React.ComponentType<any>;
  CourseList: React.ComponentType<any>;
  DownloadsScreen: React.ComponentType<any>;
  CourseOutline: React.ComponentType<any>;
  Player: React.ComponentType<any>;
  PdfReader: React.ComponentType<any>;
  QuizScreen: React.ComponentType<any>;
  AssignmentScreen: React.ComponentType<any>;
  ProfileTab: React.ComponentType<any>;
};

export type NavigatorProfile = Profile;
