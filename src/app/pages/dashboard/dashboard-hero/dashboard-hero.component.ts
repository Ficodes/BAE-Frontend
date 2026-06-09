import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

type HeroLogo = { name: string; file: string; height: number };

@Component({
  selector: 'app-dashboard-hero',
  standalone: true,
  templateUrl: './dashboard-hero.component.html',
  styleUrl: './dashboard-hero.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule]
})
export class DashboardHeroComponent {
  providersLink = input.required<string>();
  customersLink = input.required<string>();

  heroLogos: HeroLogo[] = [
    { name: 'Team Dev', file: 'Team Dev.svg', height: 52 },
    { name: 'Elliot Cloud', file: 'Elliot Cloud.svg', height: 27 },
    { name: 'Beia', file: 'Beia.svg', height: 48 },
    { name: 'E-group', file: 'E-group.svg', height: 54 },
    { name: 'Madison MK', file: 'Madison MK.svg', height: 40 },
    { name: 'Libelium', file: 'Libelium.svg', height: 32 },
    { name: 'CSI', file: 'CSI.svg', height: 39 },
    { name: 'Ionos', file: 'Ionos.svg', height: 31 },
    { name: 'Eht', file: 'Eht.svg', height: 31 },
    { name: 'Top ix', file: 'Top ix.svg', height: 39 },
    { name: 'BS Outscale', file: 'BS Outscale.svg', height: 31 },
    { name: 'Altia', file: 'Altia.svg', height: 36 },
    { name: 'CloudFerro', file: 'CloudFerro.svg', height: 32 },
    { name: 'Digitanimal', file: 'Digitanimal.svg', height: 36 },
    { name: 'Digitel TS', file: 'Digitel TS.svg', height: 40 },
    { name: 'Eng', file: 'Eng.svg', height: 32 },
    { name: 'European Dynamics', file: 'European Dynamics.svg', height: 36 },
    { name: 'Golem.at', file: 'Golem.at.svg', height: 36 },
    { name: 'Idom', file: 'Idom.svg', height: 32 },
    { name: 'Inno Focus', file: 'Inno Focus.svg', height: 36 },
    { name: 'Orange Business', file: 'Orange Business.svg', height: 32 },
    { name: 'Portel', file: 'Portel.svg', height: 36 }
  ];
}
