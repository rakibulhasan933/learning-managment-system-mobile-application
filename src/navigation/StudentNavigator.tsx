import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  BookOpen,
  Download,
  Home,
  UserRound,
} from 'lucide-react-native';
import type { Profile } from '../api';
import { colors } from '../theme';
import type {
  NavigatorScreens,
  StudentRootParamList,
  StudentTabParamList,
} from './route-types';

const Root = createNativeStackNavigator<StudentRootParamList>();
const Tabs = createBottomTabNavigator<StudentTabParamList>();
const Learning = createNativeStackNavigator();

function navigateToContent(navigation: any, params: any, content: any) {
  const base = {
    courseId: params.courseId,
    courseTitle: params.courseTitle,
  };

  if (content.kind === 'video') {
    navigation.replace('Player', { ...base, video: content.video });
  } else if (content.kind === 'pdf') {
    navigation.navigate('Pdf', {
      ...base,
      title: content.title,
      url: content.url,
    });
  } else if (content.kind === 'quiz') {
    navigation.navigate('Quiz', { ...base, quiz: content.quiz });
  } else if (content.kind === 'assignment') {
    navigation.navigate('Assignment', {
      ...base,
      assignment: content.assignment,
    });
  }
}

export function StudentNavigator({
  profile,
  onLogout,
  screens,
}: {
  profile: Profile;
  onLogout: () => void;
  screens: Omit<NavigatorScreens, 'Login'>;
}) {
  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        <Root.Screen name="Tabs">
          {() => (
            <Tabs.Navigator
              screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.brass,
                tabBarInactiveTintColor: colors.muted,
                tabBarStyle: {
                  backgroundColor: colors.surface,
                  borderTopColor: colors.border,
                  borderTopWidth: 1,
                  height: 68,
                  paddingTop: 8,
                  paddingBottom: 10,
                },
                tabBarLabelStyle: {
                  fontSize: 11,
                  fontWeight: '600',
                },
                tabBarActiveBackgroundColor: colors.brassSoft,
                tabBarItemStyle: {
                  marginHorizontal: 5,
                  marginVertical: 4,
                  borderRadius: 16,
                },
              }}
            >
              <Tabs.Screen
                name="Home"
                options={{
                  title: 'Home',
                  tabBarIcon: ({ color, size }) => (
                    <Home color={color} size={size} strokeWidth={2} />
                  ),
                }}
              >
                {({ navigation }) => (
                  <screens.CourseList
                    profile={profile}
                    mode="home"
                    openCourse={(courseId: string, title: string) =>
                      navigation.getParent()?.navigate('Learning', {
                        screen: 'Course',
                        params: { courseId, title },
                      })
                    }
                    onLogout={onLogout}
                    onNavigate={(key: string) =>
                      navigation.navigate(
                        key === 'home'
                          ? 'Home'
                          : key === 'classes'
                          ? 'Courses'
                          : 'Downloads',
                      )
                    }
                  />
                )}
              </Tabs.Screen>
              <Tabs.Screen
                name="Courses"
                options={{
                  title: 'Courses',
                  tabBarIcon: ({ color, size }) => (
                    <BookOpen color={color} size={size} strokeWidth={2} />
                  ),
                }}
              >
                {({ navigation }) => (
                  <screens.CourseList
                    profile={profile}
                    mode="classes"
                    openCourse={(courseId: string, title: string) =>
                      navigation.getParent()?.navigate('Learning', {
                        screen: 'Course',
                        params: { courseId, title },
                      })
                    }
                    onLogout={onLogout}
                    onNavigate={(key: string) =>
                      navigation.navigate(
                        key === 'home'
                          ? 'Home'
                          : key === 'classes'
                          ? 'Courses'
                          : 'Downloads',
                      )
                    }
                  />
                )}
              </Tabs.Screen>
              <Tabs.Screen
                name="Downloads"
                options={{
                  title: 'Downloads',
                  tabBarIcon: ({ color, size }) => (
                    <Download color={color} size={size} strokeWidth={2} />
                  ),
                }}
              >
                {({ navigation }) => (
                  <screens.DownloadsScreen
                    onNavigate={(key: string) =>
                      navigation.navigate(
                        key === 'home'
                          ? 'Home'
                          : key === 'classes'
                          ? 'Courses'
                          : 'Downloads',
                      )
                    }
                    onPlay={(item: any) =>
                      navigation.getParent()?.navigate('Learning', {
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
                )}
              </Tabs.Screen>
              <Tabs.Screen
                name="Profile"
                options={{
                  title: 'Profile',
                  tabBarIcon: ({ color, size }) => (
                    <UserRound color={color} size={size} strokeWidth={2} />
                  ),
                }}
              >
                {() => <screens.ProfileTab profile={profile} onLogout={onLogout} />}
              </Tabs.Screen>
            </Tabs.Navigator>
          )}
        </Root.Screen>
        <Root.Screen name="Learning">
          {() => (
            <Learning.Navigator screenOptions={{ headerShown: false }}>
              <Learning.Screen name="Course">
                {({ navigation, route }: any) => (
                  <screens.CourseOutline
                    courseId={route.params.courseId}
                    title={route.params.title}
                    back={() => navigation.goBack()}
                    onNavigate={() => undefined}
                    openVideo={(video: any) =>
                      navigation.navigate('Player', {
                        courseId: route.params.courseId,
                        courseTitle: route.params.title,
                        video,
                      })
                    }
                    openPdf={(title: string, url: string) =>
                      navigation.navigate('Pdf', {
                        courseId: route.params.courseId,
                        courseTitle: route.params.title,
                        title,
                        url,
                      })
                    }
                    openQuiz={(quiz: any) =>
                      navigation.navigate('Quiz', {
                        courseId: route.params.courseId,
                        courseTitle: route.params.title,
                        quiz,
                      })
                    }
                  />
                )}
              </Learning.Screen>
              <Learning.Screen name="Player">
                {({ navigation, route }: any) => (
                  <screens.Player
                    email={profile.email}
                    screen={{ kind: 'player', ...route.params }}
                    back={() => navigation.goBack()}
                    onNavigate={() => undefined}
                    openVideo={(video: any) => navigation.replace('Player', { ...route.params, video })}
                    openPdf={(title: string, url: string) => navigation.navigate('Pdf', { ...route.params, title, url })}
                    openQuiz={(quiz: any) => navigation.navigate('Quiz', { ...route.params, quiz })}
                    openAssignment={(assignment: any) => navigation.navigate('Assignment', { ...route.params, assignment })}
                    previousContent={null}
                    nextContent={null}
                    onOpenContent={(content: any) =>
                      navigateToContent(navigation, route.params, content)
                    }
                  />
                )}
              </Learning.Screen>
              <Learning.Screen name="Pdf">
                {({ navigation, route }: any) => (
                  <screens.PdfReader
                    {...route.params}
                    back={() => navigation.goBack()}
                    previousContent={null}
                    nextContent={null}
                    onOpenContent={(content: any) =>
                      navigateToContent(navigation, route.params, content)
                    }
                  />
                )}
              </Learning.Screen>
              <Learning.Screen name="Quiz">
                {({ navigation, route }: any) => (
                  <screens.QuizScreen
                    {...route.params}
                    back={() => navigation.goBack()}
                    onNavigate={() => undefined}
                    previousContent={null}
                    nextContent={null}
                    onOpenContent={(content: any) =>
                      navigateToContent(navigation, route.params, content)
                    }
                  />
                )}
              </Learning.Screen>
              <Learning.Screen name="Assignment">
                {({ navigation, route }: any) => (
                  <screens.AssignmentScreen
                    {...route.params}
                    back={() => navigation.goBack()}
                    onNavigate={() => undefined}
                    previousContent={null}
                    nextContent={null}
                    onOpenContent={(content: any) =>
                      navigateToContent(navigation, route.params, content)
                    }
                  />
                )}
              </Learning.Screen>
            </Learning.Navigator>
          )}
        </Root.Screen>
      </Root.Navigator>
    </NavigationContainer>
  );
}
