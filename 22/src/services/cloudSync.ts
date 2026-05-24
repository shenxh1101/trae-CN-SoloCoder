import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {CountdownEvent, Category, WidgetConfig, User} from '@types';

const COLLECTIONS = {
  USERS: 'users',
  EVENTS: 'events',
  CATEGORIES: 'categories',
  WIDGETS: 'widgets',
};

export const signInWithEmail = async (
  email: string,
  password: string,
): Promise<{user: User; token: string}> => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    const firebaseUser = userCredential.user;
    const idToken = await firebaseUser.getIdToken();

    const userDoc = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(firebaseUser.uid)
      .get();

    const userData = userDoc.data();

    return {
      user: {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        displayName: userData?.displayName || firebaseUser.displayName || undefined,
        photoURL: userData?.photoURL || firebaseUser.photoURL || undefined,
        createdAt: userData?.createdAt || Date.now(),
      },
      token: idToken,
    };
  } catch (error: any) {
    throw new Error(error.message || '登录失败');
  }
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName?: string,
): Promise<{user: User; token: string}> => {
  try {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const firebaseUser = userCredential.user;
    const idToken = await firebaseUser.getIdToken();

    const user: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || email,
      displayName,
      createdAt: Date.now(),
    };

    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(firebaseUser.uid)
      .set({
        email: user.email,
        displayName,
        createdAt: user.createdAt,
      });

    return {user, token: idToken};
  } catch (error: any) {
    throw new Error(error.message || '注册失败');
  }
};

export const signOut = async (): Promise<void> => {
  try {
    await auth().signOut();
  } catch (error: any) {
    throw new Error(error.message || '退出登录失败');
  }
};

export const syncEvents = async (
  userId: string,
  events: CountdownEvent[],
): Promise<void> => {
  try {
    const batch = firestore().batch();
    const eventsRef = firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection(COLLECTIONS.EVENTS);

    events.forEach(event => {
      const docRef = eventsRef.doc(event.id);
      batch.set(docRef, {...event, syncedAt: Date.now()});
    });

    await batch.commit();
  } catch (error: any) {
    throw new Error(error.message || '同步事件失败');
  }
};

export const syncCategories = async (
  userId: string,
  categories: Category[],
): Promise<void> => {
  try {
    const batch = firestore().batch();
    const categoriesRef = firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection(COLLECTIONS.CATEGORIES);

    categories.forEach(category => {
      const docRef = categoriesRef.doc(category.id);
      batch.set(docRef, {...category, syncedAt: Date.now()});
    });

    await batch.commit();
  } catch (error: any) {
    throw new Error(error.message || '同步分类失败');
  }
};

export const syncWidgets = async (
  userId: string,
  widgets: WidgetConfig[],
): Promise<void> => {
  try {
    const batch = firestore().batch();
    const widgetsRef = firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection(COLLECTIONS.WIDGETS);

    widgets.forEach(widget => {
      const docRef = widgetsRef.doc(widget.id);
      batch.set(docRef, {...widget, syncedAt: Date.now()});
    });

    await batch.commit();
  } catch (error: any) {
    throw new Error(error.message || '同步小组件失败');
  }
};

export const fetchEvents = async (
  userId: string,
  lastSyncTime?: number,
): Promise<CountdownEvent[]> => {
  try {
    let query = firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection(COLLECTIONS.EVENTS);

    if (lastSyncTime) {
      query = query.where('syncedAt', '>', lastSyncTime);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => doc.data() as CountdownEvent);
  } catch (error: any) {
    throw new Error(error.message || '获取事件失败');
  }
};

export const fetchCategories = async (
  userId: string,
): Promise<Category[]> => {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection(COLLECTIONS.CATEGORIES)
      .get();

    return snapshot.docs.map(doc => doc.data() as Category);
  } catch (error: any) {
    throw new Error(error.message || '获取分类失败');
  }
};

export const fetchWidgets = async (
  userId: string,
): Promise<WidgetConfig[]> => {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection(COLLECTIONS.WIDGETS)
      .get();

    return snapshot.docs.map(doc => doc.data() as WidgetConfig);
  } catch (error: any) {
    throw new Error(error.message || '获取小组件失败');
  }
};

export const syncAllData = async (
  userId: string,
  events: CountdownEvent[],
  categories: Category[],
  widgets: WidgetConfig[],
): Promise<void> => {
  try {
    await Promise.all([
      syncEvents(userId, events),
      syncCategories(userId, categories),
      syncWidgets(userId, widgets),
    ]);
  } catch (error: any) {
    throw new Error(error.message || '同步数据失败');
  }
};

export const fetchAllData = async (
  userId: string,
): Promise<{
  events: CountdownEvent[];
  categories: Category[];
  widgets: WidgetConfig[];
}> => {
  try {
    const [events, categories, widgets] = await Promise.all([
      fetchEvents(userId),
      fetchCategories(userId),
      fetchWidgets(userId),
    ]);

    return {events, categories, widgets};
  } catch (error: any) {
    throw new Error(error.message || '获取数据失败');
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await auth().sendPasswordResetEmail(email);
  } catch (error: any) {
    throw new Error(error.message || '发送重置邮件失败');
  }
};

export const getCurrentUser = (): User | null => {
  const firebaseUser = auth().currentUser;
  if (!firebaseUser) return null;

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || undefined,
    photoURL: firebaseUser.photoURL || undefined,
    createdAt: Date.now(),
  };
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return auth().onAuthStateChanged(firebaseUser => {
    if (firebaseUser) {
      callback({
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined,
        createdAt: Date.now(),
      });
    } else {
      callback(null);
    }
  });
};
