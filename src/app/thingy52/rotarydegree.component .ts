import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BluetoothCore,
  BrowserWebBluetooth,
  ConsoleLoggerService,
} from '@manekinekko/angular-web-bluetooth';
import { Subscription } from 'rxjs';
import { SmoothieChart, TimeSeries } from 'smoothie';
import { BleService } from '../ble.service';
import { NgxChartsModule } from '@swimlane/ngx-charts';

export const bleCore = (b: BrowserWebBluetooth, l: ConsoleLoggerService) =>
  new BluetoothCore(b, l);
export const bleService = (b: BluetoothCore) => new BleService(b);

// make sure we get a singleton instance of each service
const PROVIDERS = [
  {
    provide: BluetoothCore,
    useFactory: bleCore,
    deps: [BrowserWebBluetooth, ConsoleLoggerService],
  },
  {
    provide: BleService,
    useFactory: bleService,
    deps: [BluetoothCore],
  },
];

@Component({
  selector: 'ble-rotarydegree',
  template: ` <ngx-charts-pie-grid
    [view]="[300, 200]"
    [scheme]="{ domain: ['#5AA454'] }"
    [results]="data"
    [designatedTotal]="360"
    #chart
  >
  </ngx-charts-pie-grid>`,
  styles: [
    `
      :host {
        display: block;
      }
      canvas {
        margin-left: -16px;
      }
    `,
  ],
  providers: PROVIDERS,
})
export class RotaryComponent implements OnInit, OnDestroy {
  valuesSubscription: Subscription;
  streamSubscription: Subscription;
  data: any[] = [{ name: 'Degree', value: 0 }];

  @ViewChild('chart')
  chartRef: NgxChartsModule;

  get device() {
    return this.service.getDevice();
  }

  constructor(public service: BleService, public snackBar: MatSnackBar) {
    service.config({
      characteristic: '8df0983e-7709-4fa9-87ea-5bdbc0821a7d',
      service: '08398469-6586-4ab0-ad45-737857396d87',
      decoder: (value: DataView) => {
        const integer = value.getInt16(0);
        const decimal = value.getUint16(0);
        return value.getUint16(0, true); // Math.abs(integer) + Math.abs(decimal) / 100;
      },
    });
  }

  /**
   {
      next: (val: number) => this.updateValue(val),
      error: (err) => this.hasError(err),
    }
   */
  ngOnInit() {
    this.streamSubscription = this.service.stream().subscribe({
      next: (val: any) => this.updateValue(val),
      error: (err) => this.hasError(err),
    });
  }

  initChart() {}

  requestValue() {
    this.valuesSubscription = this.service.value().subscribe(
      () => null,
      (error) => this.hasError.bind(this)
    );
  }

  updateValue(value: number) {
    console.log('Reading degree %d', value);
    this.data = [{ name: 'Degree', value: value }];
  }

  disconnect() {
    this.service.disconnectDevice();
    this.valuesSubscription.unsubscribe();
  }

  hasError(error: string) {
    this.snackBar.open(error, 'Close');
  }

  ngOnDestroy() {
    this.valuesSubscription.unsubscribe();
    this.streamSubscription.unsubscribe();
  }
}
