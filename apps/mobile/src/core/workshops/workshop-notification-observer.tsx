import type * as Notifications from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { prepareWorkshopLibraryAssets } from '@/core/workshops/workshop-assets';
import { fetchWorkshopLibrary } from '@/core/workshops/workshop-service';
import { AppRoutes, workshopAssessmentRoute, workshopRoute } from '@/shared/routes';
import { useWorkshopStore } from '@/store/use-workshop-store';

let lastHandledNotificationId: string | undefined;

export function WorkshopNotificationObserver() {
  useEffect(() => {
    if (isRunningInExpoGo()) return;
    let active = true;
    let subscription: { remove: () => void } | undefined;
    const follow = async (notification: Notifications.Notification) => {
      const id = notification.request.identifier;
      if (id === lastHandledNotificationId) return;
      lastHandledNotificationId = id;
      const data = notification.request.content.data;
      const classId = typeof data?.classId === 'string' ? data.classId : undefined;
      const assessmentId = typeof data?.assessmentId === 'string' ? data.assessmentId : undefined;
      if (!classId) { router.push(AppRoutes.workshopInbox); return; }
      try {
        // Never trust a notification payload or a stale offline enrollment.
        const library = await fetchWorkshopLibrary();
        const entry = library.find((item) => item.classId === classId);
        if (!entry) { router.push(AppRoutes.workshopInbox); return; }
        const assets = await prepareWorkshopLibraryAssets(library, useWorkshopStore.getState().assetUris);
        useWorkshopStore.getState().replaceLibrary(library, assets);
        if (assessmentId && entry.manifest.assessments.some((item) => item.id === assessmentId)) router.push(workshopAssessmentRoute(classId, assessmentId));
        else router.push(workshopRoute(classId));
      } catch { router.push(AppRoutes.workshopInbox); }
    };
    void import('expo-notifications').then((notificationModule) => {
      if (!active) return;
      const last = notificationModule.getLastNotificationResponse();
      if (last?.notification) void follow(last.notification);
      subscription = notificationModule.addNotificationResponseReceivedListener((response) => { void follow(response.notification); });
    });
    return () => { active = false; subscription?.remove(); };
  }, []);
  return null;
}
