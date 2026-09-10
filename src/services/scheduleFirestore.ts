import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { ScheduleItem } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validates connection to the provisioned Firestore database
 */
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore connection: client appears offline or network is restricted.');
      return false;
    }
    // Any other response (like document not found) indicates successful reachability
    return true;
  }
}

/**
 * Real-time subscription to schedules collection with error handling
 */
export function subscribeToScheduleItems(
  onItems: (items: ScheduleItem[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const colRef = collection(db, 'schedules');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ScheduleItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          day: data.day || '',
          responsible: data.responsible || '',
          keyActivities: data.keyActivities || '',
          subtasks: data.subtasks || [],
          evaluation: typeof data.evaluation === 'number' ? data.evaluation : 0,
          category: data.category || 'General',
          safetyNotes: data.safetyNotes || '',
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      });
      onItems(items);
    },
    (error) => {
      console.warn('Firestore schedules onSnapshot notice:', error.message);
      if (onError) onError(error);
    }
  );
}

/**
 * Save or update a schedule item in Firestore
 */
export async function saveScheduleItemToFirestore(item: ScheduleItem): Promise<void> {
  const path = `schedules/${item.id}`;
  try {
    const docRef = doc(db, 'schedules', item.id);
    const payload = {
      id: item.id,
      day: item.day,
      responsible: item.responsible,
      keyActivities: item.keyActivities,
      subtasks: item.subtasks || [],
      evaluation: item.evaluation,
      category: item.category,
      safetyNotes: item.safetyNotes || '',
      updatedAt: item.updatedAt || new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Batch save schedule items into Firestore
 */
export async function batchSaveScheduleItemsToFirestore(items: ScheduleItem[]): Promise<void> {
  for (const item of items) {
    await saveScheduleItemToFirestore(item);
  }
}

/**
 * Delete a schedule item from Firestore
 */
export async function deleteScheduleItemFromFirestore(itemId: string): Promise<void> {
  const path = `schedules/${itemId}`;
  try {
    const docRef = doc(db, 'schedules', itemId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
