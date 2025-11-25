import { Component, ViewChild, ViewEncapsulation, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SurveysService } from './surveys.service';
import { SurveysListComponent } from './surveys-list.component';
import { MatDrawerToggleResult } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DateTime } from 'luxon';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertComponent, FuseAlertType } from '@fuse/components/alert';
import {
    SurveyFormData,
    SurveyInstitutionOption,
    SurveyStatusOption,
} from './surveys.types';

@Component({
    selector: 'surveys-register',
    templateUrl: './register-surveys.component.html',
    styleUrls: ['./register-surveys.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    standalone: true,
    imports: [
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        MatCardModule,
        MatDatepickerModule,
        MatCheckboxModule,
        FuseAlertComponent,
    ],
})
export class RegisterSurveysComponent implements OnInit, OnDestroy {
    @ViewChild('surveyNgForm') surveyNgForm: NgForm;

    surveyId: string | null = null;
    isEditMode: boolean = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // Form model
    title: string = '';
    description: string = '';
    institution: number | null = null;
    surveyUrl: string = '';
    surveyDeadline: DateTime | null = null;
    surveysMandatory: boolean = false;
    statusId: number | null = null;

    showAlert: boolean = false;
    isSubmitting: boolean = false;

    // Límites de caracteres
    readonly TITLE_MAX_CHARS: number = 43;
    readonly TITLE_NEAR_THRESHOLD: number = 5;
    readonly DESCRIPTION_MAX_CHARS: number = 128;
    readonly URL_MAX_CHARS: number = 256;
    
    // Validación de fecha mínima (hoy)
    readonly minDate: Date = new Date();

    alert: { type: FuseAlertType; message: string } = {
        type: 'success',
        message: '',
    };

    // Opciones para institución
    institutionOptions: SurveyInstitutionOption[] = [
        { value: 10, label: 'Wiener' },
        { value: 20, label: 'Carrion' },
    ];

    // Opciones para estado
    statusOptions: SurveyStatusOption[] = [
        { value: 0, label: 'Baja' },
        { value: 1, label: 'Alta' },
    ];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private surveysService: SurveysService,
        private _changeDetectorRef: ChangeDetectorRef,
        private _surveysListComponent: SurveysListComponent
    ) {}

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    ngOnInit(): void {
        // Open the drawer
        this._surveysListComponent.matDrawer.open();

        this.route.params.pipe(takeUntil(this._unsubscribeAll)).subscribe((params) => {
            this.surveyId = params['id'] || null;
            this.isEditMode = this.surveyId !== null && this.surveyId !== 'new';
            
            if (this.isEditMode && this.surveyId) {
                this.loadSurveyData(this.surveyId);
            } else {
                this.resetForm();
            }
        });

        // Get the survey
        this.surveysService.survey$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((survey) => {
                // Open the drawer in case it is closed
                this._surveysListComponent.matDrawer.open();

                if (survey) {
                    this.surveyId = survey.id;
                    this.isEditMode = true;
                    this.loadSurveyData(survey.id);
                }

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }

    private loadSurveyData(id: string): void {
        this.surveysService
            .getById(id)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe({
                next: (survey) => {
                    if (survey) {
                        this.title = survey.title;
                        this.description = survey.description;
                        this.institution = survey.institution;
                        this.surveyUrl = survey.surveyUrl || '';
                        this.surveyDeadline = survey.surveyDeadline 
                            ? DateTime.fromISO(survey.surveyDeadline) 
                            : null;
                        this.surveysMandatory = survey.surveysMandatory || false;
                        this.statusId = survey.statusId;
                    }
                },
                error: (error) => {
                    console.error('Error loading survey:', error);
                    this.alert = {
                        type: 'error',
                        message: 'Error al cargar la encuesta',
                    };
                    this.showAlert = true;
                },
            });
    }

    isFieldInvalid(fieldName: string): boolean {
        const field = this.surveyNgForm?.controls[fieldName];
        return !!(field && field.invalid && (field.dirty || field.touched));
    }

    hasFieldError(fieldName: string, errorType: string): boolean {
        const field = this.surveyNgForm?.controls[fieldName];
        return !!(field && field.hasError(errorType) && (field.dirty || field.touched));
    }

    isFormValid(): boolean {
        // Validaciones básicas
        if (!this.title || !this.description || !this.institution || !this.surveyUrl || !this.statusId) {
            return false;
        }

        // Si es obligatoria, la fecha límite es requerida
        if (this.surveysMandatory && !this.surveyDeadline) {
            return false;
        }

        // Validar formato de URL
        if (this.surveyUrl && !this.isValidUrl(this.surveyUrl)) {
            return false;
        }

        // Validar fecha no pasada
        if (this.surveyDeadline && this.isPastDate(this.surveyDeadline)) {
            return false;
        }

        if (this.surveyNgForm) {
            const requiredFields = ['title', 'description', 'institution', 'surveyUrl', 'statusId'];
            for (const fieldName of requiredFields) {
                const field = this.surveyNgForm.controls[fieldName];
                if (field && field.invalid && (field.dirty || field.touched)) {
                    return false;
                }
            }
        }

        return true;
    }

    isValidUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    isPastDate(date: DateTime): boolean {
        if (!date) return false;
        const today = DateTime.now().startOf('day');
        const selectedDate = date.startOf('day');
        return selectedDate < today;
    }

    submitForm(): void {
        if (this.surveyNgForm) {
            Object.keys(this.surveyNgForm.controls).forEach((key) => {
                this.surveyNgForm.controls[key].markAsTouched();
            });
        }

        if (!this.isFormValid()) {
            let errorMessage = 'Por favor complete todos los campos requeridos.';
            
            if (this.surveysMandatory && !this.surveyDeadline) {
                errorMessage = 'La fecha límite es requerida cuando la encuesta es obligatoria.';
            } else if (this.surveyUrl && !this.isValidUrl(this.surveyUrl)) {
                errorMessage = 'Por favor ingrese una URL válida (debe comenzar con http:// o https://).';
            } else if (this.surveyDeadline && this.isPastDate(this.surveyDeadline)) {
                errorMessage = 'La fecha límite no puede ser anterior a hoy.';
            }
            
            this.alert = {
                type: 'error',
                message: errorMessage,
            };
            this.showAlert = true;
            return;
        }

        this.isSubmitting = true;
        this.showAlert = false;

        const formData: SurveyFormData = {
            title: this.title,
            description: this.description,
            institution: this.institution!,
            surveyUrl: this.surveyUrl,
            surveyDeadline: this.surveyDeadline ? this.surveyDeadline.toISO() : undefined,
            surveysMandatory: this.surveysMandatory,
            statusId: this.statusId!,
        };

        const operation = this.isEditMode && this.surveyId
            ? this.surveysService.update(this.surveyId, formData)
            : this.surveysService.create(formData);

        operation.pipe(takeUntil(this._unsubscribeAll)).subscribe({
            next: (savedSurvey) => {
                this.isSubmitting = false;

                this.alert = {
                    type: 'success',
                    message: this.isEditMode
                        ? 'Encuesta actualizada correctamente.'
                        : 'Encuesta registrada correctamente.',
                };
                this.showAlert = true;

                setTimeout(() => {
                    if (this.isEditMode) {
                        this.router.navigate(['/surveys'], { skipLocationChange: false });
                    } else {
                        this.resetForm();
                        this.router.navigate(['/surveys'], { skipLocationChange: false });
                    }
                    this.showAlert = false;
                }, 2000);
            },
            error: (error) => {
                console.error('Error saving survey:', error);
                this.isSubmitting = false;
                this.alert = {
                    type: 'error',
                    message: this.isEditMode
                        ? 'Error al actualizar la encuesta. Por favor, inténtalo de nuevo.'
                        : 'Error al registrar la encuesta. Por favor, inténtalo de nuevo.',
                };
                this.showAlert = true;
            },
        });
    }

    resetForm(): void {
        this.title = '';
        this.description = '';
        this.institution = null;
        this.surveyUrl = '';
        this.surveyDeadline = null;
        this.surveysMandatory = false;
        this.statusId = null;

        if (this.surveyNgForm) {
            this.surveyNgForm.resetForm();
        }
    }

    get remainingTitleChars(): number {
        return this.TITLE_MAX_CHARS - (this.title ? this.title.length : 0);
    }

    get isTitleNearLimit(): boolean {
        const remaining = this.remainingTitleChars;
        return remaining > 0 && remaining <= this.TITLE_NEAR_THRESHOLD;
    }

    get isTitleAtLimit(): boolean {
        return this.remainingTitleChars === 0;
    }

    get remainingDescriptionChars(): number {
        return this.DESCRIPTION_MAX_CHARS - (this.description ? this.description.length : 0);
    }

    /**
     * Close the drawer
     */
    closeDrawer(): Promise<MatDrawerToggleResult> {
        return this._surveysListComponent.matDrawer.close();
    }
}

