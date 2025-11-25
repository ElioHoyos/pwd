import { Component, EventEmitter, Input, Output, ViewEncapsulation, ChangeDetectionStrategy, OnChanges, SimpleChanges, forwardRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ClickOutsideDirective } from './click-outside.directive';

@Component({
    selector: 'news-time-picker',
    templateUrl: './time-picker.component.html',
    styleUrls: ['./time-picker.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Default,
    standalone: true,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => TimePickerComponent),
            multi: true,
        },
    ],
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        ClickOutsideDirective,
    ],
})
export class TimePickerComponent implements OnChanges, ControlValueAccessor {
    @Input() disabled: boolean = false;

    private _value: string = '';
    private onChange = (value: string) => {};
    private onTouched = () => {};

    isOpen: boolean = false;
    selectedHour: number | null = null;
    selectedMinute: number | null = null;

    hours: number[] = Array.from({ length: 24 }, (_, i) => i);
    minutes: number[] = Array.from({ length: 60 }, (_, i) => i);

    constructor(private _changeDetectorRef: ChangeDetectorRef) {}

    get value(): string {
        return this._value;
    }

    set value(val: string) {
        this._value = val;
        this.onChange(val);
        this.onTouched();
        this.parseValue();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['value']) {
            this.parseValue();
        }
    }

    parseValue(): void {
        if (this._value && this._value.includes(':')) {
            const [hour, minute] = this._value.split(':').map(Number);
            this.selectedHour = hour;
            this.selectedMinute = minute;
        } else {
            this.selectedHour = null;
            this.selectedMinute = null;
        }
    }

    // ControlValueAccessor implementation
    writeValue(value: string): void {
        this._value = value || '';
        this.parseValue();
        this._changeDetectorRef.markForCheck();
    }

    registerOnChange(fn: (value: string) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    togglePanel(): void {
        if (!this.disabled) {
            this.isOpen = !this.isOpen;
            this._changeDetectorRef.markForCheck();
        }
    }

    selectHour(hour: number): void {
        this.selectedHour = hour;
        this.updateValue();
    }

    selectMinute(minute: number): void {
        this.selectedMinute = minute;
        this.updateValue();
    }

    updateValue(): void {
        if (this.selectedHour !== null && this.selectedMinute !== null) {
            const hourStr = String(this.selectedHour).padStart(2, '0');
            const minuteStr = String(this.selectedMinute).padStart(2, '0');
            const newValue = `${hourStr}:${minuteStr}`;
            this.value = newValue;
        }
    }

    getDisplayValue(): string {
        if (this.selectedHour !== null && this.selectedMinute !== null) {
            const hourStr = String(this.selectedHour).padStart(2, '0');
            const minuteStr = String(this.selectedMinute).padStart(2, '0');
            return `${hourStr}:${minuteStr}`;
        }
        return '--:--';
    }

    closePanel(): void {
        this.isOpen = false;
        this._changeDetectorRef.markForCheck();
    }

    isHourSelected(hour: number): boolean {
        return this.selectedHour === hour;
    }

    isMinuteSelected(minute: number): boolean {
        return this.selectedMinute === minute;
    }

    formatNumber(num: number): string {
        return String(num).padStart(2, '0');
    }
}

