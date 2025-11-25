import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    Routes,
} from '@angular/router';
import { NewsComponent } from './news.component';
import { NewsService } from './news.service';
import { RegisterNewsComponent } from './register-news.component';
import { NewsListComponent } from './news-list.component';
import { catchError, throwError } from 'rxjs';

/**
 * News resolver
 *
 * @param route
 * @param state
 */
const newsResolver = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const newsService = inject(NewsService);
    const router = inject(Router);

    const id = route.paramMap.get('id');
    if (!id) {
        return throwError(() => new Error('News id is required'));
    }
    return newsService.getNewsById(id).pipe(
        // Error here means the requested news is not available
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
 * Can deactivate news details
 *
 * @param component
 * @param currentRoute
 * @param currentState
 * @param nextState
 */
const canDeactivateNewsDetails = (
    component: RegisterNewsComponent,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState: RouterStateSnapshot
) => {
    // Get the next route
    let nextRoute: ActivatedRouteSnapshot = nextState.root;
    while (nextRoute.firstChild) {
        nextRoute = nextRoute.firstChild;
    }

    // If the next state doesn't contain '/news'
    // it means we are navigating away from the
    // news app
    if (!nextState.url.includes('/news')) {
        // Let it navigate
        return true;
    }

    // If we are navigating to another news...
    if (nextRoute.paramMap.get('id')) {
        // Just navigate
        return true;
    }

    // Otherwise, close the drawer first, and then navigate
    // For now, just return true as RegisterNewsComponent doesn't have closeDrawer method
    return true;
};

export default [
    {
        path: '',
        component: NewsComponent,
        children: [
            {
                path: '',
                component: NewsListComponent,
                resolve: {
                    news: () => inject(NewsService).getNews(),
                },
                children: [
                    {
                        path: ':id',
                        component: RegisterNewsComponent,
                        resolve: {
                            news: newsResolver,
                        },
                        canDeactivate: [canDeactivateNewsDetails],
                    },
                ],
            },
        ],
    },
] as Routes;




