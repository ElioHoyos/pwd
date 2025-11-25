import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    Routes,
} from '@angular/router';
import { SurveysComponent } from './surveys.component';
import { SurveysService } from './surveys.service';
import { RegisterSurveysComponent } from './register-surveys.component';
import { SurveysListComponent } from './surveys-list.component';
import { catchError, throwError } from 'rxjs';

/**
 * Survey resolver
 *
 * @param route
 * @param state
 */
const surveyResolver = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
) => {
    const surveysService = inject(SurveysService);
    const router = inject(Router);

    const id = route.paramMap.get('id');
    if (!id) {
        return throwError(() => new Error('Survey id is required'));
    }
    return surveysService.getSurveyById(id).pipe(
        // Error here means the requested survey is not available
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
 * Can deactivate surveys details
 *
 * @param component
 * @param currentRoute
 * @param currentState
 * @param nextState
 */
const canDeactivateSurveysDetails = (
    component: RegisterSurveysComponent,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState: RouterStateSnapshot
) => {
    // Get the next route
    let nextRoute: ActivatedRouteSnapshot = nextState.root;
    while (nextRoute.firstChild) {
        nextRoute = nextRoute.firstChild;
    }

    // If the next state doesn't contain '/surveys'
    // it means we are navigating away from the
    // surveys app
    if (!nextState.url.includes('/surveys')) {
        // Let it navigate
        return true;
    }

    // If we are navigating to another survey...
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
        component: SurveysComponent,
        children: [
            {
                path: '',
                component: SurveysListComponent,
                resolve: {
                    surveys: () => inject(SurveysService).getSurveys(),
                },
                children: [
                    {
                        path: ':id',
                        component: RegisterSurveysComponent,
                        resolve: {
                            survey: surveyResolver,
                        },
                        canDeactivate: [canDeactivateSurveysDetails],
                    },
                ],
            },
        ],
    },
] as Routes;


