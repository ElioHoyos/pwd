import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    Routes,
} from '@angular/router';
import { NotificationsComponent } from './notifications.component';
import { NotificationsService } from './notifications.service';
import { RegisterNotificationsComponent } from './register-notifications.component';
import { NotificationsListComponent } from './notifications-list.component';
import { catchError, throwError } from 'rxjs';

/**
 * Notification resolver
 *
 * @param route
 * @param state
 */
const notificationResolver = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const notificationsService = inject(NotificationsService);
    const router = inject(Router);

    const id = route.paramMap.get('id');
    if (!id) {
        return throwError(() => new Error('Notification id is required'));
    }
    return notificationsService.getNotificationById(id).pipe(
        // Error here means the requested notification is not available
        catchError((error) => {
            // Log the error
            console.error(error);

            // Get the parent url
            const parentUrl = state.url.split('/').slice(0, -1).join('/');

            // Navigate to there
            router.navigateByUrl(parentUrl);

            // Throw an error
            return throwError(() => error);
        })
    );
};

/**
 * Can deactivate notifications details
 *
 * @param component
 * @param currentRoute
 * @param currentState
 * @param nextState
 */
const canDeactivateNotificationsDetails = (
    component: RegisterNotificationsComponent,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState: RouterStateSnapshot
) => {
    // Get the next route
    let nextRoute: ActivatedRouteSnapshot = nextState.root;
    while (nextRoute.firstChild) {
        nextRoute = nextRoute.firstChild;
    }

    // If the next state doesn't contain '/notifications'
    // it means we are navigating away from the
    // notifications app
    if (!nextState.url.includes('/notifications')) {
        // Let it navigate
        return true;
    }

    // If we are navigating to another notification...
    if (nextRoute.paramMap.get('id')) {
        // Just navigate
        return true;
    }

    // Otherwise, close the drawer first, and then navigate
    return component.closeDrawer().then(() => true);
};

export default [
    {
        path: '',
        component: NotificationsComponent,
        children: [
            {
                path: '',
                component: NotificationsListComponent,
                resolve: {
                    notifications: () => inject(NotificationsService).getNotifications(),
                },
                children: [
                    {
                        path: ':id',
                        component: RegisterNotificationsComponent,
                        resolve: {
                            notification: notificationResolver,
                        },
                        canDeactivate: [canDeactivateNotificationsDetails],
                    },
                ],
            },
        ],
    },
] as Routes;




